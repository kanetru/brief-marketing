import type { ReactNode } from "react";

interface ChoiceCardProps {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  hint?: string;
  blocked?: boolean;
  dimmed?: boolean;
  variant?: "goal" | "word";
  board?: ReactNode;
}

export function ChoiceCard({
  label,
  pressed = false,
  onClick,
  hint,
  blocked = false,
  dimmed = false,
  variant = "goal",
  board,
}: ChoiceCardProps) {
  const classes = [
    "choice-card",
    variant === "word" ? "is-word" : "",
    blocked ? "is-blocked" : "",
    dimmed && !pressed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={pressed}
      aria-disabled={blocked || undefined}
      onClick={onClick}
    >
      {board}
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </button>
  );
}
