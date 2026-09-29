import { VISUAL_TRAITS } from "./visualDirections";
import type { VisualPreferences, VisualTraitScores } from "../types/discovery";

/**
 * A reading of the raw comparison choices. Computed when inspected.
 * It is not stored on the session and it is not an agent observation.
 */
export function deriveVisualSignal(preferences: VisualPreferences): VisualTraitScores | null {
  const totals = {} as VisualTraitScores;
  for (const trait of VISUAL_TRAITS) totals[trait] = 0;
  let weight = 0;

  for (const comparison of preferences.comparisons) {
    if (comparison.choice.state !== "selected" || comparison.choice.value === "neither") continue;
    const choice = comparison.choice.value;
    const share = choice === "both" ? 0.5 : 1;
    if (choice === "a" || choice === "both") addTraits(totals, comparison.a.traits, share);
    if (choice === "b" || choice === "both") addTraits(totals, comparison.b.traits, share);
    weight += 1;
  }

  if (weight === 0) return null;
  const signal = {} as VisualTraitScores;
  for (const trait of VISUAL_TRAITS) {
    signal[trait] = Math.round((totals[trait] / weight) * 100) / 100;
  }
  return signal;
}

function addTraits(target: VisualTraitScores, source: VisualTraitScores, weight: number) {
  for (const trait of VISUAL_TRAITS) {
    target[trait] += (source[trait] ?? 0) * weight;
  }
}
