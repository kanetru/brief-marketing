import { LIMITS, cleanCustomTrait, normaliseWord, traitLabel } from "./options";
import type { PersonalityPole, PersonalityTrait } from "../types/discovery";

export type SelectionBlock = "duplicate" | "contradiction" | "limit";

export function poleCount(pole: PersonalityPole): number {
  return pole.selected.length + pole.custom.length;
}

export function poleWords(pole: PersonalityPole): string[] {
  return [...pole.selected.map((trait) => traitLabel(trait)), ...pole.custom].map(normaliseWord);
}

export function wordOnPole(pole: PersonalityPole, word: string): boolean {
  return poleWords(pole).includes(normaliseWord(word));
}

/**
 * Whether a preset can be added. Already-selected traits are the caller's
 * toggle-off path and are not blocked here.
 */
export function presetBlock(
  pole: PersonalityPole,
  other: PersonalityPole,
  trait: PersonalityTrait,
): SelectionBlock | null {
  const label = traitLabel(trait);
  if (pole.custom.some((custom) => normaliseWord(custom) === normaliseWord(label))) {
    return "duplicate";
  }
  if (wordOnPole(other, label)) return "contradiction";
  if (poleCount(pole) >= LIMITS.traits) return "limit";
  return null;
}

export function customTraitBlock(
  pole: PersonalityPole,
  other: PersonalityPole,
  raw: string,
): SelectionBlock | "empty" | null {
  const cleaned = cleanCustomTrait(raw);
  if (!cleaned || cleaned.length > 40) return "empty";
  if (wordOnPole(pole, cleaned)) return "duplicate";
  if (wordOnPole(other, cleaned)) return "contradiction";
  if (poleCount(pole) >= LIMITS.traits) return "limit";
  return null;
}
