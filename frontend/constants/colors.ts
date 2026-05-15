export const lightColors = {
  primary:        "#4f46e5",
  primaryLight:   "#ede9fe",
  background:     "#f3f4f8",
  card:           "#ffffff",
  text:           "#111827",
  subtext:        "#6b7280",
  placeholder:    "#9ca3af",
  border:         "#e5e7eb",
  error:          "#ef4444",
  errorLight:     "#fef2f2",
  white:          "#ffffff",
  streak:         "#f97316",
  streakLight:    "#fff7ed",
  completed:      "#16a34a",
  completedLight: "#dcfce7",
  missed:         "#dc2626",
  pending:        "#f59e0b",
  partial:        "#f97316",
};

export const darkColors = {
  primary:        "#818cf8",
  primaryLight:   "#1e1b4b",
  background:     "#0f172a",
  card:           "#1e293b",
  text:           "#f1f5f9",
  subtext:        "#94a3b8",
  placeholder:    "#64748b",
  border:         "#334155",
  error:          "#f87171",
  errorLight:     "#450a0a",
  white:          "#ffffff",
  streak:         "#fb923c",
  streakLight:    "#431407",
  completed:      "#4ade80",
  completedLight: "#052e16",
  missed:         "#f87171",
  pending:        "#fbbf24",
  partial:        "#fb923c",
};

// Static alias — existing imports of Colors still compile without changes.
export const Colors = lightColors;

export type AppColors = typeof lightColors;
