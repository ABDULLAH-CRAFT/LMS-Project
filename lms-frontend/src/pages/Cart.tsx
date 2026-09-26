import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingCart,
  ChevronDown,
  ShieldCheck,
  Lock,
  Smartphone,
  Check,
} from 'lucide-react';
import { useCart } from '../context/CartComtext';
import { usePayCart } from '../hooks/usePayCard';

type Step = 'cart' | 'payment' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'cart', label: 'Cart' },
  { key: 'payment', label: 'Payment' },
  { key: 'done', label: 'Done' },
];

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function detectBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return null;
}

export default function Checkout() {
  const { items, removeFromCart, clearCart, total } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const payMutation = usePayCart();

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('09/28');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const brand = detectBrand(cardNumber);

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

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-2 max-w-lg mx-auto">
        <Link
          to="/student"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-soft text-text"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-base font-semibold text-text">Checkout</h1>
        <div className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface shadow-soft text-text">
          <ShoppingCart className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400 text-[10px] font-bold text-white flex items-center justify-center">
            {items.length}
          </span>
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-32 pt-2 space-y-4">
        {/* Trust badges */}
        <div className="flex items-center gap-2 bg-surface rounded-2xl shadow-soft px-4 py-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            256-Bit Bank-Grade Encryption
          </div>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
            SSL Secured
          </span>
        </div>

        {/* Steps */}
        <div className="bg-surface rounded-2xl shadow-soft px-6 py-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const isDone = step.key === 'cart';
              const isActive = step.key === 'payment';
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={[
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-gradient-to-r from-primary-600 to-secondary-400 text-white'
                          : 'bg-surface-strong text-muted border border-border',
                      ].join(' ')}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span
                      className={[
                        'text-[11px] font-medium',
                        isActive ? 'text-text' : 'text-muted',
                      ].join(' ')}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={[
                        'flex-1 h-0.5 mx-2 mb-4 rounded-full',
                        isDone ? 'bg-emerald-500' : 'bg-border',
                      ].join(' ')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order summary */}
        <button
          onClick={() => setSummaryOpen((o) => !o)}
          className="w-full bg-surface rounded-2xl shadow-soft px-5 py-4 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-700/10 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">Order Summary</p>
            <p className="text-xs text-muted">
              {items.length} {items.length === 1 ? 'Course' : 'Courses'} in bundle
            </p>
          </div>
          <span className="text-sm font-bold text-text">${total}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {summaryOpen && (
          <div className="bg-surface rounded-2xl shadow-soft px-5 py-4 -mt-2 space-y-3">
            {items.map((course) => (
              <div key={course.id} className="flex items-center justify-between text-sm gap-3">
                <span className="text-text truncate flex-1">{course.title}</span>
                <span className="text-muted shrink-0">
                  {Number(course.price) <= 0 ? 'Free' : `$${course.price}`}
                </span>
                <button
                  onClick={() => removeFromCart(course.id)}
                  className="text-xs text-danger-600 hover:text-danger-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Instant pay */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm font-semibold text-text">Instant 1-Click Pay</span>
            <span className="text-[11px] font-medium text-emerald-600">Fastest</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-black text-white rounded-2xl py-3.5 text-sm font-semibold hover:opacity-90 transition">
              <Smartphone className="w-4 h-4" />
              Apple Pay
            </button>
            <button className="flex items-center justify-center gap-2 bg-surface border border-border text-text rounded-2xl py-3.5 text-sm font-semibold hover:bg-surface-strong transition">
              <span className="font-bold">G</span> Pay
            </button>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm font-semibold text-text">Payment Method</span>
            <span className="text-[11px] text-muted">Select below</span>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary-600 to-secondary-400 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-text">Credit / Debit Card</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                <span className="px-1.5 py-0.5 rounded bg-surface-strong">VISA</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-strong">MC</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-strong">AMEX</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">
                CARD NUMBER
              </label>
              <div className="relative">
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-surface-strong border border-border rounded-xl px-4 py-3 pr-16 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/40"
                />
                {brand && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary-600">
                    {brand}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  EXPIRES
                </label>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  inputMode="numeric"
                  placeholder="MM/YY"
                  className="w-full bg-surface-strong border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  CVC / CVV
                </label>
                <div className="relative">
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    type="password"
                    placeholder="•••"
                    className="w-full bg-surface-strong border border-border rounded-xl px-4 py-3 pr-9 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/40"
                  />
                  <Lock className="w-3.5 h-3.5 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">
                CARDHOLDER NAME
              </label>
              <input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name on card"
                className="w-full bg-surface-strong border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-600/40"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="pt-3">
                <p className="text-sm text-text font-medium">Save for future purchases</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Encrypted tokenization via Lumina Vault
                </p>
              </div>
              <button
                onClick={() => setSaveCard((s) => !s)}
                className={[
                  'mt-3 w-11 h-6 rounded-full transition-colors relative shrink-0',
                  saveCard ? 'bg-primary-600' : 'bg-border',
                ].join(' ')}
                aria-pressed={saveCard}
                aria-label="Save card for future purchases"
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    saveCard ? 'translate-x-[22px]' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-danger-600 text-center">{errorMessage}</p>
        )}
      </div>

      {/* Sticky total + pay bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted">TOTAL</p>
            <p className="text-lg font-bold text-text">${total}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={payMutation.isPending}
            className="flex-1 max-w-[220px] flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white py-3.5 rounded-full text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            {payMutation.isPending ? 'Processing…' : 'Pay & Start Learning'}
          </button>
        </div>
      </div>
    </div>
  );
}