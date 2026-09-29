import type { TypographyDirectionId } from "../types/discovery";

export interface TypographyDirectionDefinition {
  id: TypographyDirectionId;
  /** Semantic character. This is the evidence vocabulary. */
  label: string;
  /** Rendering detail. Safe to swap without changing stored direction ids. */
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: string;
  textTransform: "none" | "uppercase";
}

export const TYPE_DIRECTIONS: readonly TypographyDirectionDefinition[] = [
  {
    id: "editorial_serif",
    label: "Editorial serif",
    fontFamily: '"Fraunces Variable", Georgia, serif',
    fontWeight: 520,
    fontStyle: "italic",
    letterSpacing: "-0.03em",
    textTransform: "none",
  },
  {
    id: "clean_sans",
    label: "Clean sans",
    fontFamily: '"Outfit Variable", "Avenir Next", sans-serif',
    fontWeight: 430,
    fontStyle: "normal",
    letterSpacing: "-0.02em",
    textTransform: "none",
  },
  {
    id: "humanist_sans",
    label: "Humanist sans",
    fontFamily: '"Nunito Sans", "Avenir Next", sans-serif',
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "-0.01em",
    textTransform: "none",
  },
  {
    id: "bold_grotesk",
    label: "Bold grotesk",
    fontFamily: '"Archivo Black", "Arial Black", sans-serif',
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "-0.04em",
    textTransform: "uppercase",
  },
  {
    id: "classic_serif",
    label: "Classic serif",
    fontFamily: '"Libre Baskerville", Palatino, serif',
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0",
    textTransform: "none",
  },
  {
    id: "expressive_display",
    label: "Expressive display",
    fontFamily: "Syne, Futura, sans-serif",
    fontWeight: 700,
    fontStyle: "normal",
    letterSpacing: "-0.045em",
    textTransform: "none",
  },
];

export function typeDirectionById(id: TypographyDirectionId): TypographyDirectionDefinition {
  const found = TYPE_DIRECTIONS.find((direction) => direction.id === id);
  if (!found) throw new Error(`Unknown type direction: ${id}`);
  return found;
}
