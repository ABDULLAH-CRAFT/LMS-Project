// Design tokens — kept in sync with the web app's look:
// near-black background, glass (translucent white) cards, purple→cyan as the
// one accent gradient used everywhere (buttons, links, active states).
// See lms-frontend/src/pages/Landing.tsx and DashboardLayout.tsx for source of truth.

export const COLORS = {
  background: "#030308", // matches web's bg-[#030308]
  surface: "rgba(255,255,255,0.04)", // glass card fill, matches bg-white/[0.04]
  surfaceStrong: "rgba(255,255,255,0.07)", // slightly more opaque, for hovered/pressed or nested cards
  border: "rgba(255,255,255,0.1)", // matches border-white/10
  borderStrong: "rgba(255,255,255,0.18)",

  text: "#ffffff",
  muted: "#9ca3af", // gray-400 — body copy on dark bg
  mutedDark: "#6b7280", // gray-500 — deeper muted, matches web's text-gray-500
  placeholder: "#6b7280",

  primary: "#a855f7", // purple-500 — main interactive accent (matches web's border/bg-purple-500)
  primaryStrong: "#9333ea", // purple-600 — gradient start / solid buttons
  secondary: "#22d3ee", // cyan-400 — gradient end / secondary accent

  danger: "#f87171", // red-400
  dangerBg: "rgba(248,113,113,0.12)",
  success: "#34d399", // emerald-400
  successBg: "rgba(52,211,153,0.12)",
  warning: "#fbbf24", // amber-400
  warningBg: "rgba(251,191,36,0.12)",
};

// Purple → cyan family, matching the web app's hero/card gradients
// (from-purple-600 to-cyan-400, from-purple-400 via-blue-400 to-cyan-300, etc).
// Kept as several stops so course cards don't all look identical, but every
// pair stays in the same purple/cyan family the web app uses.
export const GRADIENTS: [string, string][] = [
  ["#9333ea", "#22d3ee"], // purple-600 -> cyan-400 (primary, matches web CTA buttons)
  ["#a855f7", "#38bdf8"], // purple-500 -> sky-400
  ["#c084fc", "#22d3ee"], // purple-400 -> cyan-400
  ["#7e22ce", "#0891b2"], // purple-700 -> cyan-600
  ["#8b5cf6", "#06b6d4"], // violet-500 -> cyan-500
  ["#d946ef", "#22d3ee"], // fuchsia-500 -> cyan-400
];

// The web app doesn't color-code roles — student/teacher/admin dashboards all
// use the same purple accent. Kept as an export (rather than deleting it and
// touching every tab layout) so all three tab bars stay visually consistent.
export const ROLE_ACCENTS = {
  student: COLORS.primary,
  teacher: COLORS.primary,
  admin: COLORS.primary,
};
