import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { loadRazorpayScript } from '../lib/razorpay';
import type { Course } from '../types/course';

interface CheckoutCartResponse {
  free: boolean;
  freeCoursesEnrolled?: string[];
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
}

interface PayCartArgs {
  courses: Course[];
}

// Pays for the entire cart in ONE Razorpay popup, regardless of how many
// courses are in it. Used by both the cart page and the single-course
// "Enroll now" button (which just passes an array of one).
export function usePayCart() {
  return useMutation({
    mutationFn: async ({ courses }: PayCartArgs) => {
      const { data } = await api.post<CheckoutCartResponse>('/enrollments/checkout', {
        courseIds: courses.map((c) => c.id),
      });

      if (data.free) return; // everything was free — already enrolled server-side

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error('Failed to load Razorpay checkout script');

      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'Your LMS',
          description: courses.length === 1 ? courses[0].title : `${courses.length} courses`,
          order_id: data.razorpayOrderId,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await api.post('/enrollments/verify', {
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
  });
}