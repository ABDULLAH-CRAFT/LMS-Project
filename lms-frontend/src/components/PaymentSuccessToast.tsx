import { useEffect } from 'react';
import { usePaymentSuccessSocket } from '../hooks/usePaymentSuccessSocket';

// Mounted once near the root of the app (see App.tsx). Renders nothing
// until the backend pushes a 'payment_success' event over the WebSocket,
// then shows a dismissing banner — this is what covers the case where
// the RAZORPAY WEBHOOK is what confirmed the payment (app was closed,
// network dropped, etc.) rather than the frontend's own /verify call.
export default function PaymentSuccessToast() {
  const { lastEvent, clearEvent } = usePaymentSuccessSocket();

  useEffect(() => {
    if (!lastEvent) return;
    const timer = setTimeout(clearEvent, 6000);
    return () => clearTimeout(timer);
  }, [lastEvent, clearEvent]);

  if (!lastEvent) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm rounded-lg bg-white shadow-lg border border-green-200 p-4 flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        ✓
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Payment successful</p>
        <p className="text-sm text-gray-500">
          You're enrolled in {lastEvent.enrolledCourseIds.length}{' '}
          {lastEvent.enrolledCourseIds.length === 1 ? 'course' : 'courses'}.
        </p>
      </div>
      <button
        onClick={clearEvent}
        className="text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
