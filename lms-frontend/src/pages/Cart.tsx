import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartComtext';
import { usePayCart } from '../hooks/usePayCard';
import { GRADIENTS } from '../config/gradients';

export default function Cart() {
  const { items, removeFromCart, clearCart, total } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const payMutation = usePayCart();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handlePlaceOrder() {
    setErrorMessage(null);
    payMutation.mutate(
      { courses: items },
      {
        onSuccess: () => {
          clearCart();
          queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
          navigate('/student/my-courses');
        },
        onError: () => {
          setErrorMessage('Payment failed or was cancelled. Nothing was charged.');
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 -top-40 h-125 w-125 rounded-full bg-primary-700/10 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-125 w-125 rounded-full bg-secondary-600/10 blur-[140px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        <Link to="/student" className="text-sm text-muted hover:text-text transition mb-6 inline-block">
          ← Continue browsing
        </Link>

        <h1 className="text-2xl font-bold text-text mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="bg-surface-strong border border-border rounded-2xl p-12 text-center">
            <p className="text-muted mb-4">Your cart is empty.</p>
            <Link
              to="/student"
              className="inline-block bg-gradient-to-r from-primary-600 to-secondary-400 text-white px-6 py-3 rounded-full text-sm font-semibold hover:scale-[1.02] transition"
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Items — left column */}
            <div className="lg:col-span-2 bg-surface rounded-2xl overflow-hidden shadow-soft ">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-text">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </h2>
              </div>

              <div className="divide-y divide-border">
                {items.map((course, index) => (
                  <div key={course.id} className="flex items-center gap-4 px-6 py-5">
                    <div
                      className={`w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center`}
                    >
                      <span className="text-xl font-bold text-white">
                        {course.title.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-text font-medium truncate">{course.title}</p>
                      <p className="text-xs text-muted mt-0.5">Digital course · Lifetime access</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-text font-semibold">
                        {Number(course.price) <= 0 ? 'Free' : `$${course.price}`}
                      </p>
                      <button
                        onClick={() => removeFromCart(course.id)}
                        className="text-xs text-danger-600 hover:text-danger-700 mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary — right column */}
            <div className="bg-surface rounded-2xl overflow-hidden shadow-soft p-6 sticky top-24">
              <h2 className="text-sm font-semibold text-text mb-4">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  <span>${total}</span>
                </div>
              </div>

              <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
                <span className="text-text font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-text">${total}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={payMutation.isPending}
                className="w-full mt-5 bg-gradient-to-r from-primary-600 to-secondary-400 text-white py-3 rounded-full text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50"
              >
                {payMutation.isPending ? 'Processing payment...' : 'Place Order'}
              </button>

              {errorMessage && <p className="text-xs text-danger-600 mt-3 text-center">{errorMessage}</p>}

              <p className="text-[11px] text-muted mt-4 text-center">Secure checkout via Razorpay</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}