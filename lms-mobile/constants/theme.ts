export const COLORS = {
  primary: "#7c3aed",
  text: "#111827",
  muted: "#6b7280",
  background: "#ffffff",
  border: "#e5e7eb",
};

// Same gradient palette used for course cards on the web app
export const GRADIENTS: [string, string][] = [
  ["#8b5cf6", "#d946ef"], // violet -> fuchsia
  ["#3b82f6", "#22d3ee"], // blue -> cyan
  ["#10b981", "#2dd4bf"], // emerald -> teal
  ["#f59e0b", "#f97316"], // amber -> orange
  ["#f43f5e", "#ec4899"], // rose -> pink
  ["#6366f1", "#3b82f6"], // indigo -> blue
];

// Accent color per role, used for tab bars
export const ROLE_ACCENTS = {
  student: "#6366f1",
  teacher: "#10b981",
  admin: "#7c3aed",
};