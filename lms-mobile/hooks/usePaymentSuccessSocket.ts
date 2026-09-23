import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { getPaymentSocket, disconnectPaymentSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

export interface PaymentSuccessEvent {
  orderId: string;
  paymentId: string;
  enrolledCourseIds: string[];
}

/**
 * Mobile counterpart of the web app's usePaymentSuccessSocket. Listens
 * for the 'payment_success' event the backend pushes the instant ANY
 * confirmation path — the app's own /enrollments/verify call inside
 * payment.tsx, or the Razorpay webhook — marks a payment PAID.
 *
 * Note the real limit here: a WebSocket only stays open while the app
 * is actually running in the foreground. If the app is killed right
 * after paying (the scenario the webhook exists for), this hook can't
 * reach it — nothing can, short of a push notification (APNs/FCM),
 * which is a separate feature. What this DOES cover: the app stays
 * open (e.g. the user backs out of the payment screen, or their
 * connection drops so /verify never resolves) and the webhook confirms
 * moments later while they're still browsing — they get the alert
 * instead of silence.
 *
 * Mount this once, high in the tree (see app/_layout.tsx), so it's
 * listening regardless of which screen the user is on.
 */
export function usePaymentSuccessSocket() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectPaymentSocket();
      socketRef.current = null;
      return;
    }

    let cancelled = false;

    const handleSuccess = (payload: PaymentSuccessEvent) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });

      const count = payload.enrolledCourseIds.length;
      Alert.alert(
        "Payment successful!",
        `You're now enrolled in ${count} ${count === 1 ? "course" : "courses"}.`
      );
    };

    (async () => {
      const socket = await getPaymentSocket();
      if (cancelled || !socket) return;
      socketRef.current = socket;
      socket.on("payment_success", handleSuccess);
    })();

    return () => {
      cancelled = true;
      socketRef.current?.off("payment_success", handleSuccess);
      // Don't disconnect here — logout (AuthContext) is what tears the
      // socket down; this cleanup only runs on remount/dependency change.
    };
  }, [isAuthenticated, queryClient]);
}
