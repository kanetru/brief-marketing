import type { TypographyDirectionId } from "../types/discovery";

export interface TypeWorld {
  id: string;
  directionId: TypographyDirectionId;
  label: string;
  note: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: string;
  textTransform: "none" | "uppercase";
}

/** Ten typographic worlds. Several can share a signal id; the world id is what the client actually picked. */
export const TYPE_WORLDS: readonly TypeWorld[] = [
  { id: "editorial-serif", directionId: "editorial_serif", label: "Editorial serif", note: "A journal, not a logo", fontFamily: '"Fraunces Variable", Georgia, serif', fontWeight: 520, fontStyle: "italic", letterSpacing: "-0.03em", textTransform: "none" },
  { id: "warm-oldstyle", directionId: "classic_serif", label: "Warm old-style", note: "Bookish, slightly irregular", fontFamily: '"Libre Baskerville", Palatino, serif', fontWeight: 400, fontStyle: "normal", letterSpacing: "0", textTransform: "none" },
  { id: "high-contrast", directionId: "editorial_serif", label: "High contrast", note: "Thin strokes, display confidence", fontFamily: '"Fraunces Variable", Georgia, serif', fontWeight: 560, fontStyle: "normal", letterSpacing: "-0.04em", textTransform: "none" },
  { id: "plain-grotesk", directionId: "clean_sans", label: "Plain grotesk", note: "Information first", fontFamily: '"Outfit Variable", "Avenir Next", sans-serif', fontWeight: 460, fontStyle: "normal", letterSpacing: "-0.03em", textTransform: "none" },
  { id: "humanist", directionId: "humanist_sans", label: "Humanist sans", note: "A person could have drawn it", fontFamily: '"Nunito Sans", "Avenir Next", sans-serif', fontWeight: 560, fontStyle: "normal", letterSpacing: "-0.02em", textTransform: "none" },
  { id: "technical", directionId: "clean_sans", label: "Technical grotesk", note: "Drawing-board clarity", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 560, fontStyle: "normal", letterSpacing: "-0.03em", textTransform: "none" },
  { id: "heavy", directionId: "bold_grotesk", label: "Heavy grotesk", note: "The word as an object", fontFamily: '"Archivo Black", "Arial Black", sans-serif', fontWeight: 400, fontStyle: "normal", letterSpacing: "-0.04em", textTransform: "uppercase" },
  { id: "expressive", directionId: "expressive_display", label: "Expressive display", note: "One loud line", fontFamily: "Syne, Futura, sans-serif", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.05em", textTransform: "none" },
  { id: "quiet-classic", directionId: "classic_serif", label: "Quiet classic", note: "Serious, without costume", fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontStyle: "normal", letterSpacing: "-0.02em", textTransform: "none" },
  { id: "workshop", directionId: "humanist_sans", label: "Workshop sans", note: "Practical, a little wide", fontFamily: "Cabin, sans-serif", fontWeight: 500, fontStyle: "normal", letterSpacing: "-0.02em", textTransform: "none" },
];

export interface TypeRefinement {
  id: string;
  label: string;
  note: string;
  fontFamily: string;
  directions: readonly TypographyDirectionId[];
}

export const TYPE_REFINEMENTS: readonly TypeRefinement[] = [
  { id: "fraunces", label: "Warm irregular", note: "Editorial serif with a soft optical size", fontFamily: '"Fraunces Variable", Georgia, serif', directions: ["editorial_serif"] },
  { id: "newsreader", label: "Text editorial", note: "Built for reading, not for a logo", fontFamily: "Newsreader, Georgia, serif", directions: ["editorial_serif", "classic_serif"] },
  { id: "libre-baskerville", label: "Chunky classic", note: "Sturdy, a little old", fontFamily: '"Libre Baskerville", Palatino, serif', directions: ["classic_serif"] },
  { id: "lora", label: "Soft serif", note: "Calligraphic, still practical", fontFamily: "Lora, Georgia, serif", directions: ["editorial_serif", "classic_serif"] },
  { id: "ibm-plex-sans", label: "Technical sans", note: "Facts, labels, no romance", fontFamily: '"IBM Plex Sans", sans-serif', directions: ["clean_sans", "humanist_sans"] },
  { id: "space-grotesk", label: "Geometric technical", note: "A slight quirk, still clear", fontFamily: '"Space Grotesk", sans-serif', directions: ["clean_sans", "bold_grotesk"] },
  { id: "nunito-sans", label: "Human sans", note: "Warm without being cute", fontFamily: '"Nunito Sans", sans-serif', directions: ["humanist_sans"] },
  { id: "cabin", label: "Wide workshop", note: "A working text face", fontFamily: "Cabin, sans-serif", directions: ["humanist_sans", "clean_sans"] },
  { id: "archivo-black", label: "Heavy block", note: "One weight, used as an object", fontFamily: '"Archivo Black", sans-serif', directions: ["bold_grotesk"] },
  { id: "syne", label: "Display", note: "Large, and then stop", fontFamily: "Syne, Futura, sans-serif", directions: ["expressive_display", "bold_grotesk"] },
];

export function worldsForDirections(directionIds: readonly string[]): TypeRefinement[] {
  const picked = TYPE_REFINEMENTS.filter((item) => item.directions.some((direction) => directionIds.includes(direction)));
  return (picked.length >= 4 ? picked : TYPE_REFINEMENTS).slice(0, 8);
}
