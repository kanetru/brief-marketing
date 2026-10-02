/** Lines the strategy engine is not allowed to emit. They name no one, no goal, and no evidence. */
export const REFUSED_GENERIC_STRATEGY = [
  "Post consistently.",
  "Engage with your audience.",
  "Use Instagram to build awareness.",
  "Create valuable content.",
  "Focus on authenticity.",
  "Use hashtags relevant to your niche.",
] as const;

const GENERIC = [
  /post consistently/i,
  /engage with your audience/i,
  /use instagram to build awareness/i,
  /create valuable content/i,
  /focus on authenticity/i,
  /hashtags relevant to your niche/i,
  /valuable content/i,
];

export function isGenericStrategy(text: string): boolean {
  return GENERIC.some((pattern) => pattern.test(text));
}

/** Platform-demographic claims from stale knowledge. A live provider may add a sourced note later. */
export function claimsStaleDemographics(text: string): boolean {
  return /\d+\s*%/.test(text) || /25\s*[–-]\s*34/.test(text) || /year-olds/i.test(text);
}

export function keepSpecific(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || isGenericStrategy(trimmed) || claimsStaleDemographics(trimmed)) return "";
  return trimmed;
}
