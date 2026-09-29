import type { MarketingOutcome, PersonalityTrait } from "../types/discovery";

export const LIMITS = {
  goals: 3,
  traits: 5,
  palettes: 3,
  typePreferred: 2,
  imageryPreferred: 2,
  inspirationPositive: 5,
  inspirationNegative: 3,
} as const;

export const MARKETING_OUTCOMES: ReadonlyArray<{ id: MarketingOutcome; label: string }> = [
  { id: "generate_enquiries", label: "Generate enquiries" },
  { id: "increase_sales", label: "Increase sales" },
  { id: "build_awareness", label: "Build awareness" },
  { id: "build_trust", label: "Build trust" },
  { id: "educate_people", label: "Educate people" },
  { id: "build_a_community", label: "Build a community" },
  { id: "launch_something", label: "Launch something" },
  { id: "reach_a_new_audience", label: "Reach a new audience" },
  { id: "show_our_work", label: "Show our work" },
  { id: "stay_visible", label: "Stay visible" },
  { id: "something_else", label: "Something else" },
];

export const PERSONALITY_TRAITS: ReadonlyArray<{ id: PersonalityTrait; label: string }> = [
  { id: "warm", label: "Warm" },
  { id: "knowledgeable", label: "Knowledgeable" },
  { id: "bold", label: "Bold" },
  { id: "playful", label: "Playful" },
  { id: "natural", label: "Natural" },
  { id: "refined", label: "Refined" },
  { id: "rebellious", label: "Rebellious" },
  { id: "technical", label: "Technical" },
  { id: "traditional", label: "Traditional" },
  { id: "progressive", label: "Progressive" },
  { id: "dependable", label: "Dependable" },
  { id: "energetic", label: "Energetic" },
  { id: "calm", label: "Calm" },
  { id: "premium", label: "Premium" },
  { id: "accessible", label: "Accessible" },
  { id: "creative", label: "Creative" },
  { id: "practical", label: "Practical" },
  { id: "human", label: "Human" },
];

export function traitLabel(trait: PersonalityTrait): string {
  const found = PERSONALITY_TRAITS.find((item) => item.id === trait);
  if (!found) {
    throw new Error(`Unknown trait: ${trait}`);
  }
  return found.label;
}

export function normaliseWord(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function cleanCustomTrait(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** If the client types a word we already offer, keep it as a preset id. */
export function matchTrait(value: string): PersonalityTrait | null {
  const word = normaliseWord(value);
  if (!word) return null;
  return PERSONALITY_TRAITS.find((item) => normaliseWord(item.label) === word)?.id ?? null;
}
