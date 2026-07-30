export type EasingName = "linear" | "ease-out" | "ease-in-out" | "ease-in";

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function applyEasing(value: number, easing: EasingName = "ease-out"): number {
  const t = clamp01(value);
  switch (easing) {
    case "ease-in":
      return t * t;
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "linear":
      return t;
    case "ease-out":
    default:
      return 1 - Math.pow(1 - t, 3);
  }
}

export const easingParam = {
  type: "select" as const,
  label: "Easing",
  default: "ease-out",
  options: ["linear", "ease-in", "ease-out", "ease-in-out"],
};

export function staggeredProgress(index: number, count: number, progress: number, stagger = 0.55) {
  if (count <= 1) return clamp01(progress);
  const delay = (index / Math.max(1, count - 1)) * stagger;
  const duration = 1 - stagger;
  return clamp01((progress - delay) / duration);
}
