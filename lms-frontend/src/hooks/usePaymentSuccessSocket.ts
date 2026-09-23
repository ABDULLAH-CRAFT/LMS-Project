import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPaymentSocket, disconnectPaymentSocket } from '../lib/socket';

export interface PaymentSuccessEvent {
  orderId: string;
  paymentId: string;
  enrolledCourseIds: string[];
}

/**
 * Opens the /payments WebSocket connection and listens for the
 * 'payment_success' event the backend emits the moment ANY confirmation
 * path (the client's own /enrollments/verify call, the mobile redirect
 * route, or the Razorpay webhook) marks a payment PAID.
 *
 * This matters most for the webhook path: it's the one case where the
 * frontend never itself made a request that could carry the "success"
 * result back — without this socket it would have no way to find out
 * until the user manually refreshes.
 *
 * Mount this once, high in the tree (e.g. in App.tsx), so it's listening
 * regardless of which page the user is on when confirmation lands.
 */
export function usePaymentSuccessSocket() {
  const [lastEvent, setLastEvent] = useState<PaymentSuccessEvent | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket = getPaymentSocket();

    const handleSuccess = (payload: PaymentSuccessEvent) => {
      setLastEvent(payload);

      // The REST data this event overlaps with — refetch it so the UI
      // (cart badge, "My Courses" list, enrollment checks) reflects the
      // new enrollment without needing a manual page reload.
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      // matches every ['enrollment-check', courseId] query, regardless of course
      queryClient.invalidateQueries({ queryKey: ['enrollment-check'] });
    };

    socket?.on('payment_success', handleSuccess);

    // This app checks localStorage directly rather than using an auth
    // context (see the same pattern in CartContext), so login.tsx,
    // Register.tsx and StudentSettings.tsx all dispatch this event —
    // it's how we know to open the socket the moment a token appears,
    // without waiting for this component to remount.
    const handleAuthChange = () => {
      socket?.off('payment_success', handleSuccess);
      socket = getPaymentSocket();
      socket?.on('payment_success', handleSuccess);
    };
    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      socket?.off('payment_success', handleSuccess);
      window.removeEventListener('auth-changed', handleAuthChange);
      // Don't disconnect here — other components using this hook (or a
      // remount from route changes) would otherwise tear down a socket
      // someone else still needs. disconnectPaymentSocket() is for
      // logout, not for unmounting this hook.
    };
  }, [queryClient]);

  return { lastEvent, clearEvent: () => setLastEvent(null) };
}

export { disconnectPaymentSocket };
