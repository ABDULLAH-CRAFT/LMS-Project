import { apiClient } from "./client";

// Response shape from POST /enrollments/checkout.
// - free: true  -> every course was free, already enrolled server-side, nothing else to do.
// - free: false -> at least one paid course; open Razorpay with keyId/amount/currency/razorpayOrderId.
export interface CheckoutCartResponse {
  free: boolean;
  enrolledCourseIds?: string[]; // present when free is true
  freeCoursesEnrolled?: string[]; // present when free is false but some items in the cart were free
  razorpayOrderId?: string;
  amount?: number; // in paise, ready to pass straight to Razorpay
  currency?: string;
  keyId?: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function checkoutCart(courseIds: string[]): Promise<CheckoutCartResponse> {
  const { data } = await apiClient.post<CheckoutCartResponse>("/enrollments/checkout", { courseIds });
  return data;
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<void> {
  await apiClient.post("/enrollments/verify", input);
}