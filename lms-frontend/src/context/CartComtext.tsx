import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Course } from '../types/course';

interface CartContextValue {
  items: Course[];
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'lms_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Course[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Course[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(course: Course) {
    setItems((prev) => (prev.some((c) => c.id === course.id) ? prev : [...prev, course]));
  }

  function removeFromCart(courseId: string) {
    setItems((prev) => prev.filter((c) => c.id !== courseId));
  }

  function clearCart() {
    setItems([]);
  }

  function isInCart(courseId: string) {
    return items.some((c) => c.id === courseId);
  }

  const total = items.reduce((sum, c) => sum + Number(c.price), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, isInCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}