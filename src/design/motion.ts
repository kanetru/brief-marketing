/** Durations and distances. Components should use these, not one-off numbers. */
export const motion = {
  durationFast: 180,
  duration: 420,
  durationSlow: 700,
  stagger: 90,
  distance: 18,
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
