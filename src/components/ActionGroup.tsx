import type { ReactNode } from "react";

/** A row of controls that wraps, keeps a shared gap, and can stack in a footer. */
export function ActionGroup({
  children,
  footer = false,
  className = "",
}: {
  children: ReactNode;
  footer?: boolean;
  className?: string;
}) {
  const classes = ["action-group", footer ? "action-footer" : "", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

/** Pills and badges that wrap instead of colliding with a title. */
export function BadgeRow({ children }: { children: ReactNode }) {
  return <div className="badge-row">{children}</div>;
}
