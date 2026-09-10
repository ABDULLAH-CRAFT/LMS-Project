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