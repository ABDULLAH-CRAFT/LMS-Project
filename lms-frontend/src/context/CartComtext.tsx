import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Course } from '../types/course';
import { getCart, addCartItem, removeCartItem } from '../lib/api/cart';

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
const CART_QUERY_KEY = ['cart'];

function hasToken() {
  return !!localStorage.getItem('accessToken');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Tracks login/logout so the query below can turn on/off reactively.
  // (This app checks localStorage directly rather than using an auth
  // context, so we listen for a custom event dispatched on login/logout —
  // see the 'auth-changed' dispatches added to login.tsx, Register.tsx,
  // Navbar.tsx and StudentSettings.tsx.)
  const [authed, setAuthed] = useState(hasToken());
  useEffect(() => {
    const handler = () => setAuthed(hasToken());
    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, []);

  // Clear the local view immediately on logout, instead of showing the
  // previous user's cart for a moment.
  useEffect(() => {
    if (!authed) queryClient.setQueryData(CART_QUERY_KEY, []);
  }, [authed, queryClient]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: authed, // guest/logged-out pages never hit the (protected) cart endpoint
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
        previous.filter((c) => c.id !== courseId),
      );
      return { previous };
    },
    onError: (_err, _courseId, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });

  function addToCart(course: Course) {
    if (!authed) return; // safety net — add-to-cart buttons only live on protected student pages
    addMutation.mutate(course);
  }

  function removeFromCart(courseId: string) {
    removeMutation.mutate(courseId);
  }

  function clearCart() {
    // No server call needed here — checkout already removes the matching
    // rows server-side once payment is confirmed. This just clears the
    // local view instantly instead of waiting on the next refetch.
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
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}