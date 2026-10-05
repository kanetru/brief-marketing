/** Generic branding filler. Rejected unless the client actually said it. */
export const GENERIC_FILLER = [
  "authentic and innovative",
  "modern yet timeless",
  "bold yet approachable",
  "elevate your brand",
  "stand out from the crowd",
  "unique identity",
  "meaningful connections",
  "captivate your audience",
] as const;

export function genericFillerIn(text: string): string | null {
  const value = text.toLowerCase();
  return GENERIC_FILLER.find((phrase) => value.includes(phrase)) ?? null;
}

const INTERNAL_LANGUAGE = [
  /provide mark/i,
  /visible in the work itself/i,
  /\btreat\b[\s\S]{0,180}\bthe way\b/i,
  /evidence object/i,
  /epistemic status/i,
  /decision status/i,
  /brandbrain/i,
  /strategist instruction/i,
  /candidate rule/i,
  /schema label/i,
];

/** Client-facing copy. Internal instructions stay in the model; they never reach a screen. */
export function clientFacingCopy(text: string): string {
  if (INTERNAL_LANGUAGE.some((pattern) => pattern.test(text))) {
    return "What they wrote is kept as they wrote it.";
  }
  return text;
}

export function textsContainFiller(texts: string[]): string | null {
  for (const text of texts) {
    const found = genericFillerIn(text);
    if (found) return found;
  }
  return null;
}
