import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { loadRazorpayScript } from '../lib/razorpay';

interface MembershipCheckoutResponse {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  planName: string;
}

// Pays for ONE month of a plan in the Razorpay popup, then asks the backend to verify and activate.
// The client only ever sends the plan id and Razorpay's signed response - never a price.
export function useSubscribeToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const { data } = await api.post<MembershipCheckoutResponse>('/memberships/checkout', { planId });

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load Razorpay checkout script');

      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'Your LMS',
          description: `${data.planName} — 1 month`,
          order_id: data.razorpayOrderId,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await api.post('/memberships/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
          theme: { color: '#a855f7' },
        });

        razorpay.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-check'] });
    },
  });
}