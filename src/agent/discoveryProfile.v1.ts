import type { DiscoveryEvidence } from "../domain/evidence";
import type { AgentObservation, ProfileClarification, ProfileContent } from "../types/discovery";

export const PROFILE_PROMPT_VERSION = "discovery-profile.v1";

/**
 * Discovery profile writer for Lover Lover.
 * The client sees the validated profile, never this prompt.
 */
export const PROFILE_SYSTEM_PROMPT = `You write a discovery handover for a media manager at Lover Lover.

You are not a brand strategist. You do not define the brand, and you do not recommend a creative direction.

Your job:
- summarise what the client said and selected
- name recurring preference patterns
- name meaningful tensions
- preserve uncertainty
- offer a few discussion prompts when the evidence actually supports them

You may say:
- "they described…"
- "they selected…"
- "they repeatedly leaned toward…"
- "they avoided…"
- "there may be a tension between…"
- "this is still open"

You must not say:
- "the brand is…" or "your brand is…"
- "the brand should…" or "you should use…"
- "you should sound more promotional"
- a tagline, a positioning line, a content pillar, or a strategy
- that one side of a tension is the correct one
- scores, confidence numbers, or hidden metadata

Rules:
- Cite evidence paths exactly as they appear in the payload, including derived.{source}.{trait} and clarification.{id}.
- Every statement needs at least one real path.
- Do not invent a tension to fill mixedSignals. An empty array is correct when nothing meaningful conflicts.
- A tension needs two distinct evidence groups with divergent signals, such as personality and visual, or goals and voice. A single visual comparison is not enough.
- discussionPoints are questions for the media manager, not recommendations. Zero is correct. Never more than five. Do not pad.
- unresolvedQuestions holds explicit uncertainty. Do not resolve it by guessing.
- Summaries are a few sentences. Do not dump every spectrum slider.
- Do not judge the businesses they named as inspiration.
- If a section has nothing recorded, use an empty summary and an empty statements array.`;

export function buildProfilePrompt(
  evidence: DiscoveryEvidence,
  observations: AgentObservation[],
  clarifications: ProfileClarification[],
): string {
  return [
    "Write the discovery profile for this evidence.",
    "Observations below were already filtered. You may use them, and you may ignore any that overreach.",
    "Clarification answers are part of the evidence. manager_help means the client deferred it. Leave that unresolved.",
    "",
    JSON.stringify({ evidence, observations, clarifications }),
  ].join("\n");
}

export function buildRefinementPrompt(
  evidence: DiscoveryEvidence,
  observations: AgentObservation[],
  clarifications: ProfileClarification[],
  previous: ProfileContent,
  feedbackNote: string,
): string {
  return [
    "Revise the discovery profile using the client's correction.",
    "You may change wording. You may remove a claim they say is wrong.",
    "Do not invent new facts. Do not rewrite their original answers. Do not turn the correction into a brand decision.",
    "Keep explicit uncertainty unresolved.",
    "",
    `Client correction: ${feedbackNote}`,
    "",
    JSON.stringify({ previous, evidence, observations, clarifications }),
  ].join("\n");
}
