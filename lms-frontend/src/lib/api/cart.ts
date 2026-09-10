import { api } from '../axios';
import type { Course } from '../../types/course';

export async function getCart(): Promise<Course[]> {
  const { data } = await api.get<Course[]>('/cart');
  return data;
}

export async function addCartItem(courseId: string): Promise<void> {
  await api.post('/cart/items', { courseId });
}

export async function removeCartItem(courseId: string): Promise<void> {
  await api.delete(`/cart/items/${courseId}`);
}