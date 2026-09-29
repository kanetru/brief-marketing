import type { AgentObservation, CandidateQuestion, EpistemicStatus } from "../types/discovery";
import type { DiscoveryEvidence } from "./evidence";
import { evidencePaths } from "./evidence";
import { validateDiscoveryLanguageParts, type LanguageValidation } from "./languageContract";

export const MIN_QUESTION_SCORE = 64;
/** A fourth question has to clear a higher bar. Five is higher again. */
export const FOURTH_QUESTION_SCORE = 96;
export const FIFTH_QUESTION_SCORE = 108;

const IMPORTANCE_SCORE = { high: 26, medium: 8, low: 0 };

const TOPIC_SCORE: Record<string, number> = {
  audience_gap: 82,
  business_gap: 76,
  verbal_visual_tension: 74,
  goal_voice_tension: 72,
  strategic_uncertainty: 52,
  aesthetic_difference: 34,
  colour_precision: 22,
  later_detail: 16,
  preference_explanation: 0,
};

const AESTHETIC = new Set(["visual", "colour", "typography", "imagery"]);

const MEANINGFUL_PAIRS: Array<[string, string]> = [
  ["personality", "visual"],
  ["personality", "voice"],
  ["personality", "imagery"],
  ["spectrum", "visual"],
  ["spectrum", "voice"],
  ["voice", "visual"],
  ["goals", "voice"],
  ["goals", "personality"],
  ["business", "visual"],
  ["business", "voice"],
];

export interface ObservationValidation {
  id: string;
  outcome: "kept" | "rejected";
  code: string;
  reason: string;
  epistemicStatus: EpistemicStatus | null;
  observation: AgentObservation;
}

export function validateObservations(observations: AgentObservation[], evidence: DiscoveryEvidence): ObservationValidation[] {
  const known = evidencePaths(evidence);
  return observations.map((observation) => validateObservation(observation, known));
}

export function supportedObservations(observations: AgentObservation[], evidence: DiscoveryEvidence): AgentObservation[] {
  return validateObservations(observations, evidence)
    .filter((item) => item.outcome === "kept")
    .map((item) => item.observation);
}

function validateObservation(observation: AgentObservation, known: Set<string>): ObservationValidation {
  const epistemicStatus = epistemicStatusFor(observation);
  const stamped = { ...observation, epistemicStatus };
  if (!observation.evidenceReferences.some((path) => known.has(path))) {
    return {
      id: observation.id,
      outcome: "rejected",
      code: "ungrounded",
      reason: `no evidence path in the payload (${observation.evidenceReferences.join(", ") || "none"})`,
      epistemicStatus,
      observation: stamped,
    };
  }
  const language = validateDiscoveryLanguageParts([observation.statement]);
  if (language.outcome === "rejected") {
    return {
      id: observation.id,
      outcome: "rejected",
      code: language.code ?? "language",
      reason: language.reason,
      epistemicStatus,
      observation: stamped,
    };
  }
  if (observation.observationType === "tension") {
    const tension = tensionQuality(observation);
    if (tension) {
      return {
        id: observation.id,
        outcome: "rejected",
        code: "weak_tension",
        reason: tension,
        epistemicStatus,
        observation: stamped,
      };
    }
  }
  return {
    id: observation.id,
    outcome: "kept",
    code: "kept",
    reason: `kept as ${epistemicStatus}`,
    epistemicStatus,
    observation: stamped,
  };
}

export function epistemicStatusFor(observation: AgentObservation): EpistemicStatus {
  if (observation.observationType === "explicit_uncertainty") return "explicit_uncertainty";
  if (observation.observationType === "missing_information" || observation.observationType === "possible_follow_up") return "missing";
  if (observation.observationType === "tension") return "possible_tension";
  if (/\byou (said|selected|marked|chose|have said)\b/i.test(observation.statement) || /\bexplicitly marked\b/i.test(observation.statement)) {
    return "direct";
  }
  return "derived_pattern";
}

export function questionUsefulness(
  question: CandidateQuestion,
  observation: AgentObservation,
): { topic: string; score: number } {
  const topic = questionTopic(question, observation);
  const priorityBoost = (6 - question.priority) * 2;
  const score = (TOPIC_SCORE[topic] ?? TOPIC_SCORE.later_detail) + IMPORTANCE_SCORE[observation.importance] + priorityBoost;
  return { topic, score };
}

export function questionTopic(question: CandidateQuestion, observation: AgentObservation): string {
  if (isPreferenceExplanation(question.question) && !highValueTension(observation)) return "preference_explanation";
  const groups = evidenceGroups(observation.evidenceReferences);
  if (observation.observationType === "tension" && hasPair(groups, "goals", "voice")) return "goal_voice_tension";
  if (
    observation.observationType === "tension" &&
    (hasPair(groups, "personality", "visual") || hasPair(groups, "voice", "visual") || hasPair(groups, "spectrum", "visual"))
  ) {
    return "verbal_visual_tension";
  }
  if (mentions(question, observation, "audience") && audienceNeedsClarity(observation)) return "audience_gap";
  if (mentions(question, observation, "business") || observation.evidenceReferences.some((path) => path.startsWith("business.differentiation"))) {
    return "business_gap";
  }
  if (observation.observationType === "explicit_uncertainty") return "strategic_uncertainty";
  if (groups.size === 1 && [...groups].every((group) => group === "colour")) return "colour_precision";
  if ([...groups].every((group) => AESTHETIC.has(group))) return "aesthetic_difference";
  return "later_detail";
}

export function isPreferenceExplanation(text: string): boolean {
  return (
    /\bwhy did you (pick|choose|like|select|prefer|go with)\b/i.test(text) ||
    /\bwhat (did|do) you like about\b/i.test(text) ||
    /\bwhat made you (choose|pick|like|prefer)\b/i.test(text) ||
    /\bwhy (the|that|this) (palette|board|type|colour|color|font|imagery)\b/i.test(text)
  );
}

export function confirmsDeferral(question: CandidateQuestion, observation: AgentObservation, evidence: DiscoveryEvidence): boolean {
  if (observation.observationType !== "explicit_uncertainty") return false;
  const asks =
    /\bmedia manager\b/i.test(question.question) ||
    /\bleave (it|this|that) with\b/i.test(question.question) ||
    /\b(stay open|leave (it|this) open)\b/i.test(question.question);
  if (!asks) return false;
  return observation.evidenceReferences.some((path) => {
    if (evidence.clientMarkedUnknown.includes(path)) return true;
    const said = evidence.clientSaid[path];
    return typeof said === "string" && /\bi'?m not sure\b/i.test(said);
  });
}

export function narrativeAlreadyAnswered(
  question: CandidateQuestion,
  observation: AgentObservation,
  evidence: DiscoveryEvidence,
): boolean {
  if (observation.observationType === "tension") return false;
  const paths = gapPaths(question.targetEvidenceGap, observation).filter(
    (path) => path.startsWith("audience.") || path.startsWith("business.") || path.startsWith("goals."),
  );
  if (paths.length === 0) return false;
  return paths.every((path) => pathIsSufficient(path, evidence));
}

export function questionLanguage(question: CandidateQuestion): LanguageValidation {
  return validateDiscoveryLanguageParts([question.question, question.reason, ...question.options.map((option) => option.label)]);
}

export function asksOneThing(text: string): boolean {
  return (text.match(/\?/g) ?? []).length <= 1;
}

function tensionQuality(observation: AgentObservation): string | null {
  const groups = evidenceGroups(observation.evidenceReferences);
  const paths = observation.evidenceReferences;
  const audienceSplit = paths.some((path) => path === "audience.bestCustomers") && paths.some((path) => path.startsWith("audience.desired"));
  const existingVersusPreference =
    paths.some((path) => path.startsWith("colour.existing")) && paths.some((path) => path.startsWith("colour.preferred"));
  if (audienceSplit || existingVersusPreference) return null;
  if ([...MEANINGFUL_PAIRS].some(([left, right]) => groups.has(left) && groups.has(right))) return null;
  if (groups.size === 0) return "tension does not cite a recognised evidence group";
  const listed = [...groups].join(", ");
  if (groups.size === 1) return `only one evidence group (${listed}); a tension needs two divergent sides`;
  return `groups ${listed} are not a meaningful cross-group tension`;
}

function evidenceGroups(paths: string[]): Set<string> {
  return new Set(paths.map(evidenceGroup).filter((group) => group !== "other"));
}

function evidenceGroup(path: string): string {
  if (path.startsWith("derived.visual") || path.startsWith("visual.")) return "visual";
  if (path.startsWith("derived.voice") || path.startsWith("voice.")) return "voice";
  if (path.startsWith("personality.")) return "personality";
  if (path.startsWith("derived.personality_spectrum") || path.startsWith("spectrum.")) return "spectrum";
  if (path.startsWith("goals.")) return "goals";
  if (path.startsWith("audience.")) return "audience";
  if (path.startsWith("colour.")) return "colour";
  if (path.startsWith("typography.")) return "typography";
  if (path.startsWith("imagery.")) return "imagery";
  if (path.startsWith("business.")) return "business";
  if (path.startsWith("inspiration.")) return "inspiration";
  return "other";
}

function hasPair(groups: Set<string>, left: string, right: string): boolean {
  return groups.has(left) && groups.has(right);
}

function mentions(question: CandidateQuestion, observation: AgentObservation, prefix: string): boolean {
  return gapPaths(question.targetEvidenceGap, observation).some((path) => path.startsWith(`${prefix}.`) || path === prefix);
}

function audienceNeedsClarity(observation: AgentObservation): boolean {
  return observation.evidenceReferences.some((path) => path.startsWith("audience."));
}

function highValueTension(observation: AgentObservation): boolean {
  if (observation.observationType !== "tension" || observation.importance !== "high") return false;
  return tensionQuality(observation) === null;
}

function gapPaths(gap: string, observation: AgentObservation): string[] {
  if (gap === observation.id) return observation.evidenceReferences;
  const direct = observation.evidenceReferences.filter((path) => path === gap || path.startsWith(`${gap}.`) || path.startsWith(gap));
  return direct.length > 0 ? direct : observation.evidenceReferences;
}

function pathIsSufficient(path: string, evidence: DiscoveryEvidence): boolean {
  if (evidence.clientMarkedUnknown.includes(path)) return false;
  if (path === "audience.desiredCustomers" && evidence.clientSelected[path] === "same_as_current") {
    return audienceTextIsSpecific(evidence.clientSaid["audience.bestCustomers"] ?? "");
  }
  if (path.startsWith("audience.")) {
    const said = evidence.clientSaid[path];
    return typeof said === "string" && audienceTextIsSpecific(said);
  }
  if (path.startsWith("business.")) {
    const said = evidence.clientSaid[path];
    return typeof said === "string" && said.trim().length > 20;
  }
  if (path.startsWith("goals.")) return path in evidence.clientSelected || path in evidence.clientSaid;
  return false;
}

function audienceTextIsSpecific(text: string): boolean {
  const value = text.trim();
  if (value.length < 12) return false;
  return !isVagueAudience(value);
}

function isVagueAudience(text: string): boolean {
  const value = text.trim().toLowerCase();
  return /^(everyone|anyone|everybody)\b/.test(value) || /\beveryone, really\b/.test(value);
}
