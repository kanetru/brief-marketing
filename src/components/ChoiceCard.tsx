interface ChoiceCardProps {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  hint?: string;
  blocked?: boolean;
  dimmed?: boolean;
  variant?: "goal" | "word";
}

export function ChoiceCard({
  label,
  pressed = false,
  onClick,
  hint,
  blocked = false,
  dimmed = false,
  variant = "goal",
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
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </button>
  );
}
