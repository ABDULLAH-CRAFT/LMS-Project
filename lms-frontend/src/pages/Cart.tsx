import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingCart,
  ChevronDown,
  ShieldCheck,
  Lock,
  Check,
  BookOpen,
  Zap,
  GraduationCap,
  CreditCard,
} from 'lucide-react';

import { useCart } from '../context/CartComtext';
import { usePayCart } from '../hooks/usePayCard';

type Step = 'cart' | 'payment' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'cart', label: 'Cart' },
  { key: 'payment', label: 'Checkout' },
  { key: 'done', label: 'Done' },
];

export default function Checkout() {
  const { items, removeFromCart, clearCart, total } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const payMutation = usePayCart();

  const [summaryOpen, setSummaryOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handlePlaceOrder() {
    setErrorMessage(null);

    payMutation.mutate(
      { courses: items },
      {
        onSuccess: () => {
          clearCart();
          queryClient.invalidateQueries({
            queryKey: ['my-enrollments'],
          });
          navigate('/student/my-courses');
        },
        onError: () => {
          setErrorMessage(
            'Payment failed or was cancelled. Nothing was charged.',
          );
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary-700/10 blur-[140px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-secondary-600/10 blur-[140px]" />
      </div>

      {/* =========================
          HEADER
      ========================== */}
      <header className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="h-[76px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/student"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface shadow-soft text-text hover:-translate-x-0.5 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div>
                <p className="text-xs text-muted">
                  Student Dashboard
                </p>

                <h1 className="text-lg font-semibold text-text">
                  Checkout
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted">
                  Your cart
                </p>

                <p className="text-sm font-semibold text-text">
                  {items.length}{' '}
                  {items.length === 1 ? 'Course' : 'Courses'}
                </p>
              </div>

              <div className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-surface shadow-soft text-text">
                <ShoppingCart className="w-4 h-4" />

                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400 text-[10px] font-bold text-white flex items-center justify-center">
                  {items.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================== */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-10 pb-32">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-medium text-primary-600">
            Complete your enrollment
          </p>

          <h2 className="mt-1 text-2xl lg:text-3xl font-bold text-text">
            Review & Checkout
          </h2>

          <p className="mt-2 text-sm text-muted max-w-2xl">
            Review your selected courses and complete checkout to
            unlock your learning access.
          </p>
        </div>

        {/* =========================
            STEPS
        ========================== */}
        <div className="bg-surface rounded-2xl shadow-soft px-6 lg:px-8 py-5 mb-8">
          <div className="flex items-center max-w-3xl mx-auto">
            {STEPS.map((step, i) => {
              const isDone = step.key === 'cart';
              const isActive = step.key === 'payment';

              return (
                <div
                  key={step.key}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-gradient-to-r from-primary-600 to-secondary-400 text-white shadow-md shadow-primary-600/20'
                            : 'bg-surface-strong text-muted border border-border',
                      ].join(' ')}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>

                    <div className="hidden sm:block">
                      <p
                        className={[
                          'text-sm font-semibold',
                          isActive ? 'text-text' : 'text-muted',
                        ].join(' ')}
                      >
                        {step.label}
                      </p>

                      <p className="text-[10px] text-muted">
                        {step.key === 'cart'
                          ? 'Selected courses'
                          : step.key === 'payment'
                            ? 'Review & pay'
                            : 'Enrollment complete'}
                      </p>
                    </div>
                  </div>

                  {i < STEPS.length - 1 && (
                    <div
                      className={[
                        'flex-1 h-0.5 mx-4 rounded-full',
                        isDone
                          ? 'bg-emerald-500'
                          : 'bg-border',
                      ].join(' ')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================
            DESKTOP GRID
        ========================== */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-6 lg:gap-8 items-start">
          {/* =========================
              LEFT COLUMN
          ========================== */}
          <div className="space-y-6">
            {/* Secure checkout */}
            <div className="bg-surface rounded-2xl shadow-soft p-5 lg:p-6">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    Secure checkout
                  </p>

                  <p className="text-xs text-muted mt-1">
                    Your payment information is handled securely by
                    our payment provider.
                  </p>
                </div>

                <span className="ml-auto shrink-0 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">
                  Protected
                </span>
              </div>
            </div>

            {/* Learning access */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <p className="text-base font-semibold text-text">
                    Your learning access
                  </p>

                  <p className="text-xs text-muted mt-0.5">
                    Everything you receive after enrollment
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-full bg-primary-600/10 text-primary-600 text-[10px] font-semibold">
                  Ready to unlock
                </span>
              </div>

              <div className="bg-surface rounded-2xl shadow-soft p-6 lg:p-7">
                {/* Main message */}
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600/15 to-secondary-400/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-7 h-7 text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-text">
                      Learn at your own pace
                    </h3>

                    <p className="text-sm text-muted leading-relaxed mt-2 max-w-2xl">
                      Complete checkout to unlock your selected
                      courses and continue learning directly from
                      your student dashboard.
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-surface-strong rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary-600" />
                      </div>

                      <span className="text-sm font-semibold text-text">
                        Course access
                      </span>
                    </div>

                    <p className="text-xs text-muted mt-3 leading-relaxed">
                      Your enrolled courses will appear in My
                      Courses once your enrollment is confirmed.
                    </p>
                  </div>

                  <div className="bg-surface-strong rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-secondary-500" />
                      </div>

                      <span className="text-sm font-semibold text-text">
                        Instant access
                      </span>
                    </div>

                    <p className="text-xs text-muted mt-3 leading-relaxed">
                      Start learning as soon as your payment and
                      enrollment are successfully confirmed.
                    </p>
                  </div>
                </div>

                {/* Secure note */}
                <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-text">
                      Secure payment processing
                    </p>

                    <p className="text-[11px] text-muted mt-0.5">
                      Payment details are handled by our payment
                      provider.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* What happens next */}
            <section className="bg-surface rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-text">
                    What happens next?
                  </p>

                  <p className="text-xs text-muted mt-0.5">
                    Your enrollment process in three simple steps
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600/10 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </div>

                    <p className="text-xs font-semibold text-text">
                      Complete payment
                    </p>
                  </div>

                  <p className="text-[11px] text-muted mt-2 pl-11 leading-relaxed">
                    Finish the secure checkout process.
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600/10 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </div>

                    <p className="text-xs font-semibold text-text">
                      Enrollment confirmed
                    </p>
                  </div>

                  <p className="text-[11px] text-muted mt-2 pl-11 leading-relaxed">
                    Your selected courses are added to your account.
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>

                    <p className="text-xs font-semibold text-text">
                      Start learning
                    </p>
                  </div>

                  <p className="text-[11px] text-muted mt-2 pl-11 leading-relaxed">
                    Open My Courses and begin learning.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* =========================
              RIGHT COLUMN
          ========================== */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            {/* Order summary */}
            <div className="bg-surface rounded-2xl shadow-soft overflow-hidden">
              <button
                onClick={() => setSummaryOpen((open) => !open)}
                className="w-full px-5 py-5 flex items-center gap-3 text-left hover:bg-surface-strong/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-700/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-primary-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">
                    Order Summary
                  </p>

                  <p className="text-xs text-muted mt-0.5">
                    {items.length}{' '}
                    {items.length === 1
                      ? 'course'
                      : 'courses'}{' '}
                    selected
                  </p>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-muted transition-transform ${
                    summaryOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {summaryOpen && (
                <div className="border-t border-border px-5 py-4">
                  {items.length === 0 ? (
                    <div className="py-6 text-center">
                      <ShoppingCart className="w-8 h-8 text-muted mx-auto mb-2" />

                      <p className="text-sm font-medium text-text">
                        Your cart is empty
                      </p>

                      <p className="text-xs text-muted mt-1">
                        Add a course to continue.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-start gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-primary-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text leading-relaxed">
                              {course.title}
                            </p>

                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              <span className="text-xs text-muted">
                                {Number(course.price) <= 0
                                  ? 'Free'
                                  : `₹${course.price}`}
                              </span>

                              <button
                                onClick={() =>
                                  removeFromCart(course.id)
                                }
                                className="text-[10px] font-medium text-danger-600 hover:text-danger-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-border px-5 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">
                    Subtotal
                  </span>

                  <span className="text-sm font-medium text-text">
                    ₹{total}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted">
                    Payment processing
                  </span>

                  <span className="text-xs font-medium text-emerald-600">
                    Secure
                  </span>
                </div>

                <div className="border-t border-border mt-4 pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted">
                      Total amount
                    </p>

                    <p className="text-2xl font-bold text-text mt-0.5">
                      ₹{total}
                    </p>
                  </div>

                  <CreditCard className="w-5 h-5 text-muted mb-1" />
                </div>
              </div>
            </div>

            {/* Payment action */}
            <div className="bg-surface rounded-2xl shadow-soft p-5">
              <button
                onClick={handlePlaceOrder}
                disabled={
                  payMutation.isPending || items.length === 0
                }
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white py-3.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/20 hover:scale-[1.01] hover:shadow-primary-600/30 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Lock className="w-4 h-4" />

                {payMutation.isPending
                  ? 'Processing…'
                  : 'Pay & Start Learning'}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />

                <p className="text-[10px] text-muted">
                  Secure checkout · Your payment is protected
                </p>
              </div>
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3">
                <p className="text-xs text-danger-600 text-center">
                  {errorMessage}
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
