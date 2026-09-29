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

export function textsContainFiller(texts: string[]): string | null {
  for (const text of texts) {
    const found = genericFillerIn(text);
    if (found) return found;
  }
  return null;
}
