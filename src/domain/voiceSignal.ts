import { VOICE_TRAITS } from "./voice";
import type { VoicePreferences, VoiceTraitScores } from "../types/discovery";

/**
 * A reading of the voice rounds. Computed when needed.
 * Not stored as a fact, and not an agent observation.
 */
export function deriveVoiceSignal(preferences: VoicePreferences): VoiceTraitScores | null {
  const totals = {} as VoiceTraitScores;
  for (const trait of VOICE_TRAITS) totals[trait] = 0;
  let weight = 0;

  for (const round of preferences.comparisons) {
    if (round.choice.state !== "selected") continue;
    const optionId = round.choice.optionId;
    const option = round.options.find((item) => item.id === optionId);
    if (!option) continue;
    for (const trait of VOICE_TRAITS) totals[trait] += option.traits[trait] ?? 0;
    weight += 1;
  }

  if (weight === 0) return null;
  const signal = {} as VoiceTraitScores;
  for (const trait of VOICE_TRAITS) {
    signal[trait] = Math.round((totals[trait] / weight) * 100) / 100;
  }
  return signal;
}
