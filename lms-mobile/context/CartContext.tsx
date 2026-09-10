import { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Course } from "../types/course";
import { getCart, addCartItem, removeCartItem } from "../lib/api/cart";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  items: Course[];
  isLoading: boolean;
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_QUERY_KEY = ["cart"];

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Cart lives in the DB now, keyed by the logged-in student — this just
  // reads/writes it through the API instead of AsyncStorage.
  const { data: items = [], isLoading } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: isAuthenticated, // guarded student-only endpoint — don't call it while logged out
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (course: Course) => addCartItem(course.id),
    onMutate: async (course) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<Course[]>(CART_QUERY_KEY) ?? [];
      if (!previous.some((c) => c.id === course.id)) {
        queryClient.setQueryData<Course[]>(CART_QUERY_KEY, [...previous, course]);
      }
      return { previous };
    },
    onError: (_err, _course, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: (courseId: string) => removeCartItem(courseId),
    onMutate: async (courseId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<Course[]>(CART_QUERY_KEY) ?? [];
      queryClient.setQueryData<Course[]>(
        CART_QUERY_KEY,
        previous.filter((c) => c.id !== courseId)
      );
      return { previous };
    },
    onError: (_err, _courseId, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  function addToCart(course: Course) {
    if (!isAuthenticated) return; // safety net — add-to-cart only lives on protected student screens
    addMutation.mutate(course);
  }

  function removeFromCart(courseId: string) {
    removeMutation.mutate(courseId);
  }

  function clearCart() {
    // No server call here on purpose — checkout (free courses) and verify
    // (paid courses) already delete the matching cart rows server-side once
    // enrollment succeeds. This just clears the local view instantly instead
    // of waiting on the next refetch.
    queryClient.setQueryData<Course[]>(CART_QUERY_KEY, []);
  }

  function isInCart(courseId: string) {
    return items.some((c) => c.id === courseId);
  }

  const total = items.reduce((sum, c) => sum + Number(c.price), 0);

  return (
    <CartContext.Provider
      value={{ items, isLoading, addToCart, removeFromCart, clearCart, isInCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}