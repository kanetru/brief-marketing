import type { TypographyDirectionDefinition } from "../domain/typography";

interface TypeSpecimenProps {
  direction: TypographyDirectionDefinition;
  name: string;
  pressed: boolean;
  blocked?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}

export function TypeSpecimen({
  direction,
  name,
  pressed,
  blocked = false,
  dimmed = false,
  onClick,
}: TypeSpecimenProps) {
  const scale = name.length > 28 ? "is-compact" : name.length > 16 ? "is-medium" : "";
  const classes = ["type-card", pressed ? "is-pressed" : "", blocked ? "is-blocked" : "", dimmed && !pressed ? "is-dimmed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={pressed}
      aria-disabled={blocked || undefined}
      aria-label={direction.label}
      onClick={onClick}
    >
      <span
        className={`type-specimen ${scale}`}
        style={{
          fontFamily: direction.fontFamily,
          fontWeight: direction.fontWeight,
          fontStyle: direction.fontStyle,
          letterSpacing: direction.letterSpacing,
          textTransform: direction.textTransform,
        }}
      >
        {name}
      </span>
      <span className="visually-hidden">{direction.label}</span>
      {blocked ? <small>Already on the other side</small> : null}
    </button>
  );
}
