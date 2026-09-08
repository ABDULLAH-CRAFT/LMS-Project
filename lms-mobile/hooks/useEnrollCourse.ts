import { useMutation, useQueryClient } from "@tanstack/react-query";
import RazorpayCheckout from "react-native-razorpay";
import { checkoutCart,verifyPayment } from "@/lib/api/payment";
import { COLORS } from "../constants/theme";

interface EnrollArgs {
  courseIds: string[];
}

// Mirrors the web app's usePayCart: works for a single "Enroll" button
// (pass an array of one) or a future multi-course cart, without the
// caller needing to know whether any of the courses are free.
export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseIds }: EnrollArgs) => {
      const order = await checkoutCart(courseIds);

      if (order.free) {
        return { enrolledCourseIds: order.enrolledCourseIds ?? courseIds };
      }

      // At least one paid course — open Razorpay's native checkout UI.
      const razorpayResponse = await RazorpayCheckout.open({
        key: order.keyId!,
        amount: order.amount!,
        currency: order.currency!,
        name: "Your LMS",
        description: courseIds.length === 1 ? "Course purchase" : `${courseIds.length} courses`,
        order_id: order.razorpayOrderId!,
        theme: { color: COLORS.primary },
      });

      await verifyPayment({
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
      });

      return { enrolledCourseIds: courseIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-check"] });
    },
  });
}

// react-native-razorpay rejects with { code, description } when the user
// cancels or the payment fails — use this to show a readable message.
export function getRazorpayErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "description" in error) {
    return String((error as { description?: string }).description) || "Payment failed.";
  }
  return (error as any)?.response?.data?.message ?? "Something went wrong.";
}