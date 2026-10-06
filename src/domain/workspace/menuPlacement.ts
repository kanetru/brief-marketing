export type MenuKeyAction = { type: "close" } | { type: "move"; index: number } | { type: "none" };

/**
 * Offset from the trigger's left edge.
 * Zero keeps the menu left-aligned. A negative offset pulls it back into the viewport.
 */
export function menuLeft(anchorLeft: number, menuWidth: number, viewportWidth: number, gutter = 12): number {
  if (menuWidth <= 0 || viewportWidth <= 0) return 0;
  if (anchorLeft + menuWidth <= viewportWidth - gutter) return 0;
  const shifted = viewportWidth - gutter - menuWidth - anchorLeft;
  const minShift = gutter - anchorLeft;
  return Math.max(shifted, minShift);
}

export function menuKeyAction(key: string, index: number, count: number): MenuKeyAction {
  if (key === "Escape") return { type: "close" };
  if (count <= 0) return { type: "none" };
  if (key === "ArrowDown") return { type: "move", index: index < 0 ? 0 : (index + 1) % count };
  if (key === "ArrowUp") return { type: "move", index: index <= 0 ? count - 1 : index - 1 };
  if (key === "Home") return { type: "move", index: 0 };
  if (key === "End") return { type: "move", index: count - 1 };
  return { type: "none" };
}
