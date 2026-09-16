// Design tokens — "Lumina Learn" soft-UI (neumorphic) theme.
// Light, airy background with soft dual-tone shadows for a tactile, extruded
// look. Ported from the web reference (indigo primary, teal secondary,
// amber/orange tertiary) — see the Lumina Learn dashboard mockup for source of truth.

export const COLORS = {
  background: "#eef3fa", // page background (canvas-bg)
  surface: "#ffffff", // raised card fill (surface-container-lowest)
  surfaceStrong: "#e8eef6", // recessed / secondary fill, inputs, chips (surface-container)
  surfaceHigh: "#e3e9f1", // surface-container-high, for nested/hover cards
  border: "#e2e8f2", // hairline, barely-there — cards lean on shadow, not borders
  borderStrong: "#c7c4d8", // outline-variant, for dividers that need to read a bit more

  text: "#1e293b", // text-primary / on-surface
  muted: "#64748b", // text-muted
  mutedDark: "#475569", // text-secondary
  placeholder: "#94a3b8",

  primary: "#3525cd", // primary — main interactive accent (indigo)
  primaryStrong: "#4f46e5", // primary-container — gradient / solid CTA fill
  primaryLight: "#e2dfff", // primary-fixed — tinted backgrounds behind primary content
  primarySoft: "#c3c0ff", // primary-fixed-dim — subtle accents on primary surfaces

  secondary: "#006c4a", // secondary (teal green) — success / positive accent
  secondaryLight: "#82f5c1", // secondary-fixed — success chip backgrounds

  tertiary: "#934e00", // tertiary-container text (amber/orange) — warning accent
  tertiaryLight: "#ffdcc3", // tertiary-fixed — warning chip backgrounds
  tertiaryStrong: "#ffb77d", // tertiary-fixed-dim

  danger: "#ba1a1a", // error
  dangerBg: "#ffdad6", // error-container
  success: "#006c4a", // alias of secondary, kept for existing call sites
  successBg: "#c3f7de", // soft mint chip background
  warning: "#934e00", // alias of tertiary, kept for existing call sites
  warningBg: "#ffdcc3",

  white: "#ffffff",
};

// Soft-UI shadow presets. React Native only casts a single directional shadow
// (no true dual-tone inset/outset like CSS), so these approximate the
// "extruded" neu-flat card look with one soft, diffused dark shadow.
// Spread one of these into a card style alongside a light/white background.
export const CARD_SHADOW = {
  shadowColor: "#a3b1c6",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 4,
};

export const SOFT_SHADOW = {
  shadowColor: "#a3b1c6",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.18,
  shadowRadius: 6,
  elevation: 2,
};

export const PRIMARY_SHADOW = {
  shadowColor: "#3525cd",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 14,
  elevation: 6,
};

// Indigo/violet family for the hero card, plus teal + amber stops (matching
// the secondary/tertiary accents) so course cards aren't all identical.
export const GRADIENTS: [string, string][] = [
  ["#4437e6", "#3020bf"], // primary hero gradient
  ["#4f46e5", "#3525cd"],
  ["#00916a", "#006c4a"], // secondary / teal
  ["#ff8a3d", "#934e00"], // tertiary / amber
  ["#6366f1", "#4438ca"],
  ["#00b884", "#00714e"],
];

// The design doesn't color-code roles — student/teacher/admin dashboards all
// use the same indigo accent. Kept as an export so all three tab bars stay
// visually consistent.
export const ROLE_ACCENTS = {
  student: COLORS.primary,
  teacher: COLORS.primary,
  admin: COLORS.primary,
};
