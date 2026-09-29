import type { AgentObservation, CandidateQuestion, ObservationType } from "../types/discovery";
import { evidencePaths, type DiscoveryEvidence } from "./evidence";

export const MAX_CLARIFICATION_QUESTIONS = 5;
export const PREFERRED_CLARIFICATION_QUESTIONS = 4;

export const MANAGER_HELP_ID = "manager_help";
export const MANAGER_HELP_LABEL = "I'm not sure — that's something I'd like my media manager to help with.";

const TYPE_SCORE: Record<ObservationType, number> = {
  explicit_uncertainty: 50,
  missing_information: 42,
  tension: 38,
  possible_follow_up: 16,
  consistent_signal: 6,
};

const IMPORTANCE_SCORE = { high: 20, medium: 10, low: 0 };

export interface QuestionDecision {
  id: string;
  question: string;
  outcome: "selected" | "rejected";
  /** Deterministic rule that fired. Not model reasoning. */
  reason: string;
}

export interface QuestionSelectionTrace {
  selected: CandidateQuestion[];
  decisions: QuestionDecision[];
}

/**
 * Same selection as `selectClarificationQuestions`, plus the rule behind each keep or drop.
 */
export function traceQuestionSelection(
  candidates: CandidateQuestion[],
  observations: AgentObservation[],
  evidence: DiscoveryEvidence,
): QuestionSelectionTrace {
  const knownPaths = evidencePaths(evidence);
  const supported = new Map(
    observations
      .filter((observation) => observation.evidenceReferences.some((path) => knownPaths.has(path)))
      .map((observation) => [observation.id, observation]),
  );

  const seen = new Set<string>();
  const rejected: QuestionDecision[] = [];
  const ranked: Array<{ question: CandidateQuestion; score: number; observation: AgentObservation; observationScore: number }> = [];

  for (const candidate of candidates) {
    const key = normalise(candidate.question);
    if (seen.has(key)) {
      rejected.push({ id: candidate.id, question: candidate.question, outcome: "rejected", reason: "duplicate of an earlier question with the same wording" });
      continue;
    }
    const related = candidate.relatedObservationIds
      .map((id) => supported.get(id))
      .filter((item): item is AgentObservation => !!item);
    if (related.length === 0) {
      rejected.push({
        id: candidate.id,
        question: candidate.question,
        outcome: "rejected",
        reason: "no related observation cites an evidence path that was sent",
      });
      continue;
    }
    if (isAlreadyClear(related)) {
      rejected.push({
        id: candidate.id,
        question: candidate.question,
        outcome: "rejected",
        reason: "related observations are high-confidence consistent signals, so this asks about something already clear",
      });
      continue;
    }
    if (isTrivia(candidate.question, related)) {
      rejected.push({
        id: candidate.id,
        question: candidate.question,
        outcome: "rejected",
        reason: "asks why a preference was chosen, and the related observations are only consistent signals",
      });
      continue;
    }
    seen.add(key);
    const scored = related.map((observation) => ({ observation, score: scoreObservation(observation) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) continue;
    const priorityBoost = (6 - candidate.priority) * 3;
    ranked.push({
      question: withUncertaintyOption(candidate),
      score: best.score + priorityBoost,
      observation: best.observation,
      observationScore: best.score,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.question.priority - b.question.priority);
  const limit = questionLimit(ranked);
  const selected: QuestionDecision[] = [];
  const capped: QuestionDecision[] = [];
  ranked.forEach((item, index) => {
    if (index < limit) {
      const boost = item.score - item.observationScore;
      selected.push({
        id: item.question.id,
        question: item.question.question,
        outcome: "selected",
        reason: `rank ${index + 1} of ${ranked.length}; tied to ${item.observation.id} (${item.observation.observationType}, ${item.observation.importance} importance, observation score ${item.observationScore}); priority ${item.question.priority} adds ${boost}; total ${item.score}; cap ${limit}`,
      });
      return;
    }
    const capReason =
      limit === MAX_CLARIFICATION_QUESTIONS
        ? "ranked past the maximum of 5"
        : "ranked below the preferred cap of 4; the fifth question scored under 58";
    capped.push({ id: item.question.id, question: item.question.question, outcome: "rejected", reason: capReason });
  });

  return {
    selected: ranked.slice(0, limit).map((item) => item.question),
    decisions: [...selected, ...rejected, ...capped],
  };
}

/**
 * Deterministic cap after the model responds.
 * Keeps at most five questions, and prefers four unless a fifth is clearly material.
 * Questions that are not grounded in a supported observation are dropped.
 */
export function selectClarificationQuestions(
  candidates: CandidateQuestion[],
  observations: AgentObservation[],
  evidence: DiscoveryEvidence,
): CandidateQuestion[] {
  return traceQuestionSelection(candidates, observations, evidence).selected;
}

/** Drop observations that cite nothing we actually sent. */
export function supportedObservations(observations: AgentObservation[], evidence: DiscoveryEvidence): AgentObservation[] {
  const knownPaths = evidencePaths(evidence);
  return observations.filter((observation) => observation.evidenceReferences.some((path) => knownPaths.has(path)));
}

function questionLimit(ranked: Array<{ score: number }>): number {
  if (ranked.length <= PREFERRED_CLARIFICATION_QUESTIONS) return ranked.length;
  const fifth = ranked[4];
  if (fifth && fifth.score >= 58) return MAX_CLARIFICATION_QUESTIONS;
  return PREFERRED_CLARIFICATION_QUESTIONS;
}

function scoreObservation(observation: AgentObservation): number {
  return TYPE_SCORE[observation.observationType] + IMPORTANCE_SCORE[observation.importance];
}

function isAlreadyClear(related: AgentObservation[]): boolean {
  return related.every(
    (observation) =>
      observation.observationType === "consistent_signal" &&
      observation.confidence === "high" &&
      observation.importance !== "high",
  );
}

function isTrivia(question: string, related: AgentObservation[]): boolean {
  const whyPreference = /\bwhy did you (pick|choose|like|select)\b/i.test(question);
  return whyPreference && related.every((observation) => observation.observationType === "consistent_signal");
}

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
