// Save as: lms-backend/src/payment/payments.gateway.ts
//
// Pushes a "payment succeeded" event to the browser the instant a
// payment is marked PAID — regardless of WHICH path confirmed it
// (the client's own /enrollments/verify call, the mobile redirect
// route, or the Razorpay webhook). This is what lets the webhook path
// (which the client never directly called) still tell the frontend
// "you're enrolled now" without the frontend having to poll.
//
// One user can have several sockets open at once (multiple tabs,
// desktop + mobile web), so we keep a Set per userId rather than a
// single socket.

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface PaymentSuccessPayload {
  orderId: string;
  paymentId: string;
  enrolledCourseIds: string[];
}

@Injectable()
@WebSocketGateway({
  namespace: '/payments',
  cors: {
    origin: (origin, callback) => callback(null, true), // tighten to CORS_ORIGIN in production, same as main.ts
    credentials: true,
  },
})
export class PaymentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PaymentsGateway.name);

  @WebSocketServer()
  server!: Server;

  // userId -> every open socket belonging to that user
  private userSockets = new Map<string, Set<Socket>>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // Client connects with: io('http://localhost:3000/payments', { auth: { token: accessToken } })
  // Reuses the SAME access token the client already has from login — no
  // separate socket-auth endpoint needed. Reject the connection outright
  // if the token is missing/invalid/expired, same as the JwtAuthGuard
  // would for a normal HTTP route.
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);

      if (!token) throw new Error('Missing auth token');

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;

      const sockets = this.userSockets.get(payload.sub) ?? new Set<Socket>();
      sockets.add(client);
      this.userSockets.set(payload.sub, sockets);
    } catch (err) {
      this.logger.warn(`Rejected socket connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.delete(client);
    if (sockets.size === 0) this.userSockets.delete(userId);
  }

  /**
   * Called right after a Payment row is saved as PAID — from
   * EnrollmentsService.createEnrollmentsFromPayment (covers both the
   * client's own /verify call and the webhook) and from
   * PaymentsService.confirmOrderAndEnroll (the mobile redirect path).
   *
   * If the user has no open socket (tab closed, app backgrounded),
   * this is a silent no-op — they'll just see the enrollment when they
   * next open the app, same as before this feature existed.
   */
  notifyPaymentSuccess(userId: string, payload: PaymentSuccessPayload) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    for (const socket of sockets) {
      socket.emit('payment_success', payload);
    }
  }
}
