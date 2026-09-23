import { usePaymentSuccessSocket } from "../hooks/usePaymentSuccessSocket";

// Renders nothing — just keeps the payment WebSocket listener alive for
// as long as the app is mounted and the user is logged in. See
// hooks/usePaymentSuccessSocket.ts for what it actually does.
export default function PaymentSuccessListener() {
  usePaymentSuccessSocket();
  return null;
}
