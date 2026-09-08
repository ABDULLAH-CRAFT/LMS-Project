import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Course } from "../types/course";

interface CartContextValue {
  items: Course[];
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "lms_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Course[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load any cart saved from a previous session.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setItems(JSON.parse(stored) as Course[]);
      })
      .catch(() => {})
      .finally(() => setIsHydrated(true));
  }, []);

  // Persist on every change, once the initial load has finished (otherwise
  // we'd briefly overwrite the saved cart with an empty array on startup).
  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, isHydrated]);

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
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}