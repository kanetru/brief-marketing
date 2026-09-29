export type LanguageRejectionCode =
  | "brand_truth_assertion"
  | "creative_prescription"
  | "unsupported_certainty"
  | "directive_language"
  | "internal_scoring_language";

export interface LanguageValidation {
  outcome: "accepted" | "rejected";
  code: LanguageRejectionCode | null;
  reason: string;
}

const ACCEPTED: LanguageValidation = { outcome: "accepted", code: null, reason: "wording stays with the evidence" };

/**
 * Narrow product contract for interviewer copy.
 * "You've said" and "you may want your media manager to explore" are allowed.
 * Prescription and identity claims are not.
 */
export function validateDiscoveryLanguage(text: string): LanguageValidation {
  const value = text.trim();
  if (!value) return ACCEPTED;

  if (/\b(confidence score|hidden metadata|derived signal|trait scores?)\b/i.test(value) || /\b(strength|score)\s+of\s+\d/i.test(value)) {
    return reject("internal_scoring_language", "mentions an internal score or hidden metadata");
  }
  if (/\b(this means your brand|therefore your brand|so your brand is|clearly your brand)\b/i.test(value)) {
    return reject("unsupported_certainty", "turns an inference into a brand conclusion");
  }
  if (/\byour brand is\b/i.test(value) || /\byour brand should\b/i.test(value) || /\byour identity is\b/i.test(value)) {
    return reject("brand_truth_assertion", "presents an inference as a fact about the brand");
  }
  if (
    /\byou should (use|sound|feel|look|switch|make|choose|go)\b/i.test(value) ||
    /\bthe correct direction is\b/i.test(value) ||
    /\bwe should use\b/i.test(value)
  ) {
    return reject("creative_prescription", "prescribes a creative or verbal treatment");
  }
  if (/\byou should\b/i.test(value) || /\byou need to\b/i.test(value) || /\byou must\b/i.test(value)) {
    return reject("directive_language", "tells the client what to do");
  }
  return ACCEPTED;
}

export function validateDiscoveryLanguageParts(parts: string[]): LanguageValidation {
  for (const part of parts) {
    const result = validateDiscoveryLanguage(part);
    if (result.outcome === "rejected") return result;
  }
  return ACCEPTED;
}

function reject(code: LanguageRejectionCode, reason: string): LanguageValidation {
  return { outcome: "rejected", code, reason };
}
