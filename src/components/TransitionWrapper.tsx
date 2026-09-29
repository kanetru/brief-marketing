import type { ReactNode } from "react";

export function TransitionWrapper({
  transitionKey,
  children,
}: {
  transitionKey: string;
  children: ReactNode;
}) {
  return (
    <div key={transitionKey} className="transition">
      {children}
    </div>
  );
}
