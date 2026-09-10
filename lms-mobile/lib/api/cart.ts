import { apiClient } from "./client";
import { Course } from "../../types/course";

export async function getCart(): Promise<Course[]> {
  const { data } = await apiClient.get<Course[]>("/cart");
  return data;
}

export async function addCartItem(courseId: string): Promise<void> {
  await apiClient.post("/cart/items", { courseId });
}

export async function removeCartItem(courseId: string): Promise<void> {
  await apiClient.delete(`/cart/items/${courseId}`);
}

// Matches DELETE /cart on the backend. Not needed for the normal checkout
// flow (checkout/verify already deletes the relevant rows server-side once
// enrollment succeeds), but kept here in case you want an explicit
// "empty cart" action in the UI later.
export async function clearCartItems(): Promise<void> {
  await apiClient.delete("/cart");
}