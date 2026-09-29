import type { AgentObservation, CandidateQuestion } from "../types/discovery";
import type { DiscoveryEvidence } from "./evidence";
import {
  FIFTH_QUESTION_SCORE,
  FOURTH_QUESTION_SCORE,
  MIN_QUESTION_SCORE,
  asksOneThing,
  confirmsDeferral,
  isPreferenceExplanation,
  narrativeAlreadyAnswered,
  questionLanguage,
  questionUsefulness,
  validateObservations,
} from "./qualityGate";

export const MAX_CLARIFICATION_QUESTIONS = 5;
export { MIN_QUESTION_SCORE };

export const MANAGER_HELP_ID = "manager_help";
export const MANAGER_HELP_LABEL = "I'm not sure — that's something I'd like my media manager to help with.";

export interface QuestionDecision {
  id: string;
  question: string;
  outcome: "selected" | "rejected";
  /** Deterministic rule that fired. Not model reasoning. */
  reason: string;
  topic: string;
  score: number | null;
  primaryObservationId: string | null;
  language: string;
}

export interface QuestionSelectionTrace {
  selected: CandidateQuestion[];
  decisions: QuestionDecision[];
}

interface RankedQuestion {
  question: CandidateQuestion;
  observation: AgentObservation;
  topic: string;
  score: number;
}

/**
 * Same selection as `selectClarificationQuestions`, plus the rule behind each keep or drop.
 * Zero questions is a valid result. Five is a hard cap, not a target.
 */
export function traceQuestionSelection(
  candidates: CandidateQuestion[],
  observations: AgentObservation[],
  evidence: DiscoveryEvidence,
): QuestionSelectionTrace {
  const validations = validateObservations(observations, evidence);
  const supported = new Map(
    validations.filter((item) => item.outcome === "kept").map((item) => [item.observation.id, item.observation]),
  );
  const rejectedObservations = new Map(
    validations.filter((item) => item.outcome === "rejected").map((item) => [item.id, item.reason]),
  );

  const seen = new Set<string>();
  const rejected: QuestionDecision[] = [];
  const ranked: RankedQuestion[] = [];

  for (const candidate of candidates) {
    const language = questionLanguage(candidate);
    const primaryId = candidate.relatedObservationIds.find((id) => supported.has(id)) ?? candidate.relatedObservationIds[0] ?? null;
    const base = {
      id: candidate.id,
      question: candidate.question,
      topic: "unscored",
      score: null as number | null,
      primaryObservationId: primaryId,
      language: language.outcome === "accepted" ? "accepted" : (language.code ?? "rejected"),
    };

    if (language.outcome === "rejected") {
      rejected.push({ ...base, outcome: "rejected", reason: language.reason });
      continue;
    }
    if (!asksOneThing(candidate.question)) {
      rejected.push({ ...base, outcome: "rejected", reason: "asks more than one thing" });
      continue;
    }
    const key = normalise(candidate.question);
    if (seen.has(key)) {
      rejected.push({ ...base, outcome: "rejected", reason: "duplicate of an earlier question with the same wording" });
      continue;
    }

    const related = candidate.relatedObservationIds
      .map((id) => supported.get(id))
      .filter((item): item is AgentObservation => !!item);
    if (related.length === 0) {
      const dropped = candidate.relatedObservationIds
        .map((id) => (rejectedObservations.has(id) ? `${id}: ${rejectedObservations.get(id)}` : null))
        .filter((item): item is string => !!item);
      rejected.push({
        ...base,
        outcome: "rejected",
        reason: dropped.length > 0 ? `related observation was rejected (${dropped[0]})` : "no related observation cites an evidence path that was sent",
      });
      continue;
    }

    const usefulness = related
      .map((observation) => ({ observation, ...questionUsefulness(candidate, observation) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!usefulness) continue;
    const observation = usefulness.observation;
    const scored = { ...base, topic: usefulness.topic, score: usefulness.score, primaryObservationId: observation.id };

    if (confirmsDeferral(candidate, observation, evidence)) {
      rejected.push({
        ...scored,
        outcome: "rejected",
        reason: "explicit uncertainty is already recorded; this only asks to confirm deferral to the media manager",
      });
      continue;
    }
    if (isPreferenceExplanation(candidate.question) && usefulness.topic === "preference_explanation") {
      rejected.push({
        ...scored,
        outcome: "rejected",
        reason: "asks why an aesthetic preference was chosen",
      });
      continue;
    }
    if (narrativeAlreadyAnswered(candidate, observation, evidence)) {
      rejected.push({
        ...scored,
        outcome: "rejected",
        reason: "the target field is already specific, so the question would not add a new distinction",
      });
      continue;
    }
    if (usefulness.score < MIN_QUESTION_SCORE) {
      rejected.push({
        ...scored,
        outcome: "rejected",
        reason: `usefulness ${usefulness.score} is below ${MIN_QUESTION_SCORE}; topic ${usefulness.topic}; observation ${observation.id}`,
      });
      continue;
    }

    seen.add(key);
    ranked.push({ question: withUncertaintyOption(candidate), observation, topic: usefulness.topic, score: usefulness.score });
  }

  ranked.sort((a, b) => b.score - a.score || a.question.priority - b.question.priority);

  const selected: QuestionDecision[] = [];
  const capped: QuestionDecision[] = [];
  const usedObservations = new Set<string>();
  let taken = 0;

  for (const item of ranked) {
    const decisionBase = {
      id: item.question.id,
      question: item.question.question,
      topic: item.topic,
      score: item.score,
      primaryObservationId: item.observation.id,
      language: "accepted",
    };
    if (taken >= MAX_CLARIFICATION_QUESTIONS) {
      capped.push({ ...decisionBase, outcome: "rejected", reason: "ranked past the maximum of 5" });
      continue;
    }
    if (usedObservations.has(item.observation.id)) {
      capped.push({
        ...decisionBase,
        outcome: "rejected",
        reason: `one question for ${item.observation.id} is already selected`,
      });
      continue;
    }
    const bar = taken >= 4 ? FIFTH_QUESTION_SCORE : taken >= 3 ? FOURTH_QUESTION_SCORE : MIN_QUESTION_SCORE;
    if (item.score < bar) {
      capped.push({
        ...decisionBase,
        outcome: "rejected",
        reason: `usefulness ${item.score} is below ${bar} for question ${taken + 1}; topic ${item.topic}`,
      });
      continue;
    }
    usedObservations.add(item.observation.id);
    taken += 1;
    selected.push({
      ...decisionBase,
      outcome: "selected",
      reason: `rank ${taken}; topic ${item.topic}; observation ${item.observation.id} (${item.observation.epistemicStatus ?? item.observation.observationType}, ${item.observation.importance}); usefulness ${item.score}`,
    });
  }

  return {
    selected: ranked
      .filter((item) => selected.some((decision) => decision.id === item.question.id))
      .map((item) => item.question),
    decisions: [...selected, ...rejected, ...capped],
  };
}

export function selectClarificationQuestions(
  candidates: CandidateQuestion[],
  observations: AgentObservation[],
  evidence: DiscoveryEvidence,
): CandidateQuestion[] {
  return traceQuestionSelection(candidates, observations, evidence).selected;
}

export { supportedObservations } from "./qualityGate";

function withUncertaintyOption(question: CandidateQuestion): CandidateQuestion {
  if (question.answerMode !== "single_choice") return question;
  if (question.options.some((option) => option.id === MANAGER_HELP_ID)) return question;
  return {
    ...question,
    options: [...question.options, { id: MANAGER_HELP_ID, label: MANAGER_HELP_LABEL }],
  };
}

function normalise(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
