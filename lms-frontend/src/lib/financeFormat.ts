const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Display only. The backend sends exact strings such as "1000.00" or "-300.00".
export function formatMoney(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? inr.format(numeric) : value;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}