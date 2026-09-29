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
  const knownPaths = evidencePaths(evidence);
  const supported = new Map(
    observations
      .filter((observation) => observation.evidenceReferences.some((path) => knownPaths.has(path)))
      .map((observation) => [observation.id, observation]),
  );

  const seen = new Set<string>();
  const ranked: Array<{ question: CandidateQuestion; score: number }> = [];

  for (const candidate of candidates) {
    const key = normalise(candidate.question);
    if (seen.has(key)) continue;
    const related = candidate.relatedObservationIds
      .map((id) => supported.get(id))
      .filter((item): item is AgentObservation => !!item);
    if (related.length === 0) continue;
    if (isAlreadyClear(related)) continue;
    if (isTrivia(candidate.question, related)) continue;
    seen.add(key);
    const best = Math.max(...related.map(scoreObservation));
    const priorityBoost = (6 - candidate.priority) * 3;
    ranked.push({ question: withUncertaintyOption(candidate), score: best + priorityBoost });
  }

  ranked.sort((a, b) => b.score - a.score || a.question.priority - b.question.priority);
  const limit = questionLimit(ranked);
  return ranked.slice(0, limit).map((item) => item.question);
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
