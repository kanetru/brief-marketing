import type { VisualDirectionSnapshot, VisualTrait, VisualTraitScores } from "../types/discovery";

export const VISUAL_TRAITS = [
  "editorial",
  "organic",
  "minimal",
  "expressive",
  "playful",
  "technical",
  "warm",
  "cool",
  "polished",
  "raw",
  "bold",
  "restrained",
  "classic",
  "contemporary",
] as const satisfies readonly VisualTrait[];

export interface VisualDirectionDefinition {
  id: string;
  /** Screen-reader name. Hidden from the board so it doesn't steer the eye. */
  accessibleName: string;
  traits: VisualTraitScores;
}

function traits(partial: Partial<VisualTraitScores>): VisualTraitScores {
  const scores = {} as VisualTraitScores;
  for (const trait of VISUAL_TRAITS) {
    scores[trait] = partial[trait] ?? 0;
  }
  return scores;
}

/** Controlled catalogue. Not client evidence. */
export const VISUAL_DIRECTIONS: readonly VisualDirectionDefinition[] = [
  {
    id: "editorial-organic",
    accessibleName: "Loose editorial board, warm and organic",
    traits: traits({ editorial: 0.9, organic: 0.8, warm: 0.7, expressive: 0.4, polished: 0.3, contemporary: 0.5 }),
  },
  {
    id: "strict-minimal",
    accessibleName: "Strict minimal grid",
    traits: traits({ minimal: 0.95, restrained: 0.8, polished: 0.7, cool: 0.4, contemporary: 0.6, technical: 0.3 }),
  },
  {
    id: "technical-cool",
    accessibleName: "Cool technical diagram",
    traits: traits({ technical: 0.9, cool: 0.8, minimal: 0.5, contemporary: 0.6, restrained: 0.4, polished: 0.5 }),
  },
  {
    id: "raw-expressive",
    accessibleName: "Raw expressive stamp",
    traits: traits({ raw: 0.9, expressive: 0.85, bold: 0.8, warm: 0.3, playful: 0.2, contemporary: 0.5 }),
  },
  {
    id: "classic-polished",
    accessibleName: "Classic polished frame",
    traits: traits({ classic: 0.9, polished: 0.85, restrained: 0.6, editorial: 0.4, warm: 0.3, minimal: 0.3 }),
  },
  {
    id: "playful-warm",
    accessibleName: "Playful warm shapes",
    traits: traits({ playful: 0.9, warm: 0.85, organic: 0.6, expressive: 0.5, contemporary: 0.4, bold: 0.3 }),
  },
  {
    id: "contemporary-bold",
    accessibleName: "Contemporary bold crop",
    traits: traits({ contemporary: 0.9, bold: 0.9, expressive: 0.6, minimal: 0.4, cool: 0.3, polished: 0.4 }),
  },
  {
    id: "restrained-warm",
    accessibleName: "Restrained warm quiet board",
    traits: traits({ restrained: 0.9, warm: 0.7, minimal: 0.6, classic: 0.3, polished: 0.4, organic: 0.3 }),
  },
  {
    id: "expressive-editorial",
    accessibleName: "Expressive overlapping editorial type",
    traits: traits({ editorial: 0.8, expressive: 0.85, bold: 0.6, contemporary: 0.7, classic: 0.2, polished: 0.4 }),
  },
  {
    id: "organic-raw",
    accessibleName: "Organic raw hand-drawn board",
    traits: traits({ organic: 0.9, raw: 0.8, warm: 0.6, restrained: 0.2, playful: 0.3, classic: 0.1 }),
  },
];

export const VISUAL_COMPARISON_PAIRS = [
  { id: "pair-01", a: "editorial-organic", b: "strict-minimal" },
  { id: "pair-02", a: "technical-cool", b: "playful-warm" },
  { id: "pair-03", a: "raw-expressive", b: "classic-polished" },
  { id: "pair-04", a: "contemporary-bold", b: "restrained-warm" },
  { id: "pair-05", a: "expressive-editorial", b: "organic-raw" },
] as const;

export function directionById(id: string): VisualDirectionDefinition {
  const found = VISUAL_DIRECTIONS.find((direction) => direction.id === id);
  if (!found) throw new Error(`Unknown visual direction: ${id}`);
  return found;
}

export function snapshotDirection(id: string): VisualDirectionSnapshot {
  const direction = directionById(id);
  return { id: direction.id, traits: { ...direction.traits } };
}
