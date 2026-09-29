import type { ReactNode } from "react";

interface ChoiceGridProps {
  children: ReactNode;
  columns?: 2 | 3;
  labelledBy?: string;
}

export function ChoiceGrid({ children, columns = 2, labelledBy }: ChoiceGridProps) {
  return (
    <div className={`choice-grid cols-${columns}`} role="group" aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}
