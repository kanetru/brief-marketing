interface QuietChoiceProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
}

export function QuietChoice({ label, pressed, onClick }: QuietChoiceProps) {
  return (
    <button
      type="button"
      className={pressed ? "quiet quiet-choice is-pressed" : "quiet quiet-choice"}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
