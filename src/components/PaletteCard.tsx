import type { PaletteDefinition } from "../domain/palettes";

interface PaletteCardProps {
  palette: PaletteDefinition;
  pressed: boolean;
  blocked?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}

export function PaletteCard({ palette, pressed, blocked = false, dimmed = false, onClick }: PaletteCardProps) {
  const [field, block, stripe, ink, accent] = palette.swatches;
  const classes = ["palette-card", pressed ? "is-pressed" : "", blocked ? "is-blocked" : "", dimmed && !pressed ? "is-dimmed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={pressed}
      aria-disabled={blocked || undefined}
      aria-label={palette.name}
      onClick={onClick}
    >
      <span className="visually-hidden">{palette.name}</span>
      <span className="palette-world" style={{ background: field }} aria-hidden="true">
        <span className="palette-block" style={{ background: block }} />
        <span className="palette-stripe" style={{ background: stripe }} />
        <span className="palette-mark" style={{ color: ink }}>
          Aa
        </span>
        <span className="palette-accent" style={{ background: accent }} />
      </span>
      {blocked ? <small>Already drawn to this</small> : null}
    </button>
  );
}
