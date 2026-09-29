import type { VisualComparisonEvidence, VisualDirectionSnapshot, VisualTrait, VisualTraitScores } from "../types/discovery";

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
  {
    id: "documentary-human",
    accessibleName: "Documentary human photograph",
    traits: traits({ organic: 0.75, raw: 0.7, warm: 0.7, editorial: 0.35, restrained: 0.4 }),
  },
  {
    id: "art-directed",
    accessibleName: "Art-directed polished photograph",
    traits: traits({ polished: 0.9, editorial: 0.6, cool: 0.45, contemporary: 0.6, minimal: 0.3 }),
  },
  {
    id: "tactile-craft",
    accessibleName: "Tactile material close-up",
    traits: traits({ organic: 0.85, raw: 0.55, warm: 0.8, expressive: 0.25, classic: 0.15 }),
  },
  {
    id: "geometric-clean",
    accessibleName: "Geometric clean system",
    traits: traits({ minimal: 0.8, technical: 0.85, polished: 0.75, cool: 0.65, contemporary: 0.7, restrained: 0.45 }),
  },
  {
    id: "warm-editorial",
    accessibleName: "Warm editorial layout",
    traits: traits({ editorial: 0.85, warm: 0.8, restrained: 0.55, organic: 0.4, classic: 0.3, polished: 0.35 }),
  },
  {
    id: "cool-quiet",
    accessibleName: "Cool quiet grid",
    traits: traits({ cool: 0.85, restrained: 0.8, minimal: 0.7, polished: 0.45, technical: 0.4, contemporary: 0.5 }),
  },
  {
    id: "quiet-craft",
    accessibleName: "Quiet crafted organic board",
    traits: traits({ organic: 0.8, restrained: 0.85, warm: 0.65, editorial: 0.4, classic: 0.2 }),
  },
  {
    id: "lively-craft",
    accessibleName: "Lively crafted organic board",
    traits: traits({ organic: 0.8, expressive: 0.85, warm: 0.7, raw: 0.45, playful: 0.35 }),
  },
  {
    id: "quiet-grid",
    accessibleName: "Quiet geometric grid",
    traits: traits({ minimal: 0.85, technical: 0.7, restrained: 0.8, cool: 0.6, polished: 0.55, contemporary: 0.4 }),
  },
  {
    id: "loud-grid",
    accessibleName: "Loud geometric grid",
    traits: traits({ technical: 0.6, expressive: 0.85, bold: 0.8, contemporary: 0.75, cool: 0.35, polished: 0.4 }),
  },
];

/**
 * Selection strategy. Deterministic. No model call.
 *
 * Pairs 01–08 are broad contrasts everyone sees: raw/polished, minimal/expressive,
 * organic/geometric, editorial/commercial, warm/cool, and documentary/art-directed.
 * The client sees compositions. The ids above are the dimensions being tested.
 *
 * Pairs 09–10 are adaptive. With no lean yet, they probe an organic split and a
 * geometric split. Once the broad answers lean one way by a clear margin, an
 * unanswered adaptive slot is retargeted into that cluster (restrained vs expressive)
 * instead of spending another question re-proving the lean. Answered slots stay as
 * the client saw them.
 */
export const VISUAL_COMPARISON_PAIRS = [
  { id: "pair-01", a: "editorial-organic", b: "strict-minimal" },
  { id: "pair-02", a: "technical-cool", b: "playful-warm" },
  { id: "pair-03", a: "raw-expressive", b: "classic-polished" },
  { id: "pair-04", a: "contemporary-bold", b: "restrained-warm" },
  { id: "pair-05", a: "expressive-editorial", b: "organic-raw" },
  { id: "pair-06", a: "documentary-human", b: "art-directed" },
  { id: "pair-07", a: "tactile-craft", b: "geometric-clean" },
  { id: "pair-08", a: "warm-editorial", b: "cool-quiet" },
  { id: "pair-09", a: "quiet-craft", b: "lively-craft" },
  { id: "pair-10", a: "quiet-grid", b: "loud-grid" },
] as const;

const ADAPTIVE_IDS = ["pair-09", "pair-10"] as const;

export function directionById(id: string): VisualDirectionDefinition {
  const found = VISUAL_DIRECTIONS.find((direction) => direction.id === id);
  if (!found) throw new Error(`Unknown visual direction: ${id}`);
  return found;
}

export function snapshotDirection(id: string): VisualDirectionSnapshot {
  const direction = directionById(id);
  return { id: direction.id, traits: { ...direction.traits } };
}

interface Lean {
  organic: number;
  geometric: number;
  warm: number;
  cool: number;
}

function emptyLean(): Lean {
  return { organic: 0, geometric: 0, warm: 0, cool: 0 };
}

function addTraits(lean: Lean, traitsToAdd: VisualTraitScores, sign: number) {
  lean.organic += sign * (traitsToAdd.organic + traitsToAdd.raw * 0.4);
  lean.geometric += sign * (traitsToAdd.technical * 0.8 + traitsToAdd.minimal * 0.45 + traitsToAdd.polished * 0.15);
  lean.warm += sign * traitsToAdd.warm;
  lean.cool += sign * traitsToAdd.cool;
}

/** Broad answers only, so an adaptive slot cannot chase its own choice. */
function leanFromBroad(comparisons: readonly VisualComparisonEvidence[]): Lean {
  const lean = emptyLean();
  for (const comparison of comparisons) {
    if ((ADAPTIVE_IDS as readonly string[]).includes(comparison.comparisonId)) continue;
    if (comparison.choice.state !== "selected" || comparison.choice.value === "neither") continue;
    const chosen =
      comparison.choice.value === "both"
        ? [comparison.a, comparison.b]
        : comparison.choice.value === "a"
          ? [comparison.a]
          : [comparison.b];
    const rejected =
      comparison.choice.value === "a" ? [comparison.b] : comparison.choice.value === "b" ? [comparison.a] : [];
    for (const side of chosen) addTraits(lean, side.traits, 1);
    for (const side of rejected) addTraits(lean, side.traits, -0.25);
  }
  return lean;
}

function adaptivePlan(lean: Lean): Array<{ id: string; a: string; b: string }> {
  const organicSide = lean.organic + lean.warm;
  const geometricSide = lean.geometric + lean.cool;
  if (organicSide > geometricSide + 0.8) {
    return [
      { id: "pair-09", a: "quiet-craft", b: "lively-craft" },
      { id: "pair-10", a: "warm-editorial", b: "lively-craft" },
    ];
  }
  if (geometricSide > organicSide + 0.8) {
    return [
      { id: "pair-09", a: "quiet-grid", b: "loud-grid" },
      { id: "pair-10", a: "art-directed", b: "loud-grid" },
    ];
  }
  return [
    { id: "pair-09", a: "quiet-craft", b: "lively-craft" },
    { id: "pair-10", a: "quiet-grid", b: "loud-grid" },
  ];
}

/** Retarget unanswered adaptive comparisons. Answered boards stay as they were shown. */
export function syncAdaptiveComparisons(comparisons: readonly VisualComparisonEvidence[]): VisualComparisonEvidence[] {
  const plan = adaptivePlan(leanFromBroad(comparisons));
  return comparisons.map((comparison) => {
    const next = plan.find((item) => item.id === comparison.comparisonId);
    if (!next || comparison.choice.state === "selected") return comparison;
    if (comparison.a.id === next.a && comparison.b.id === next.b) return comparison;
    return { ...comparison, a: snapshotDirection(next.a), b: snapshotDirection(next.b) };
  });
}
