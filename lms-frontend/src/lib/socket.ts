// Lazily creates (and reuses) ONE socket.io connection to the backend's
// /payments namespace, the same way lib/axios.ts creates one shared
// axios instance. Auth works the same way too: it reuses the access
// token already sitting in localStorage from login, sent once at
// connect-time (see PaymentsGateway.handleConnection on the backend).
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000'; // same host as lib/axios.ts's baseURL

let socket: Socket | null = null;

export function getPaymentSocket(): Socket | null {
  if (!localStorage.getItem('accessToken')) return null; // not logged in — nothing to connect for

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(`${SOCKET_URL}/payments`, {
      // A function, so every connect/reconnect sends the CURRENT token (it changes after a silent refresh).
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
      autoConnect: false,
      reconnectionAttempts: 5,
    });
  }

  socket.connect();
  return socket;
}

export function disconnectPaymentSocket() {
  socket?.disconnect();
  socket = null;
}
