// Shared Tailwind class strings for the teacher portal, so every form control looks identical.
// They only use the theme tokens from index.css (surface, border, primary, secondary...).

export const inputClass =
  'w-full bg-surface-strong border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-placeholder outline-none focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 transition disabled:opacity-60';

export const labelClass = 'block text-xs font-semibold text-muted-dark mb-1.5';

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-400 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 bg-surface border border-border text-muted-dark rounded-full px-5 py-2.5 text-sm font-semibold hover:border-primary-500/40 hover:text-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed';

export const cardClass = 'bg-surface rounded-2xl shadow-soft';

// small status pills
export const chipClass = {
  draft: 'bg-tertiary-100 text-tertiary-600',
  published: 'bg-secondary-100 text-secondary-600',
  neutral: 'bg-surface-strong text-muted-dark',
  primary: 'bg-primary-100 text-primary-700',
};
