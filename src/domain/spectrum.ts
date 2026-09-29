import type { SpectrumDimensionEvidence, SpectrumDimensionId } from "../types/discovery";

export const SPECTRUM_DIMENSIONS = [
  { id: "playful_serious", leftLabel: "Playful", rightLabel: "Serious" },
  { id: "traditional_progressive", leftLabel: "Traditional", rightLabel: "Progressive" },
  { id: "understated_bold", leftLabel: "Understated", rightLabel: "Bold" },
  { id: "raw_polished", leftLabel: "Raw", rightLabel: "Polished" },
  { id: "familiar_exclusive", leftLabel: "Familiar", rightLabel: "Exclusive" },
  { id: "human_corporate", leftLabel: "Human", rightLabel: "Corporate" },
] as const satisfies ReadonlyArray<{
  id: SpectrumDimensionId;
  leftLabel: string;
  rightLabel: string;
}>;

export function blankSpectrumDimensions(): SpectrumDimensionEvidence[] {
  return SPECTRUM_DIMENSIONS.map((dimension) => ({
    id: dimension.id,
    leftLabel: dimension.leftLabel,
    rightLabel: dimension.rightLabel,
    answer: { state: "unanswered" },
  }));
}

export function clampSpectrumValue(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}
