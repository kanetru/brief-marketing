import { creativeFork } from "./archetypes";
import { buildBrandSignalModel } from "./brandSignals";
import { MAX_CLARIFICATION_QUESTIONS } from "./questionSelection";
import type { CandidateQuestion, DiscoverySession } from "../types/discovery";

export const CREATIVE_FORK_ID = "creative-fork";

/**
 * At most one creative-territory question.
 * Asked only when two territories are both supported and actually different.
 * If the evidence already leans, this returns the list unchanged.
 */
export function withCreativeFork(selected: readonly CandidateQuestion[], session: DiscoverySession): CandidateQuestion[] {
  if (selected.some((question) => question.id === CREATIVE_FORK_ID)) return [...selected];
  const fork = creativeFork(buildBrandSignalModel(session, { includeReaction: false }));
  if (!fork) return [...selected];
  const question: CandidateQuestion = {
    id: CREATIVE_FORK_ID,
    question: "We're seeing two directions here. Which feels more like somewhere you'd want to go?",
    reason: "Two creative territories are both supported, and the evidence does not yet say which to explore first.",
    targetEvidenceGap: "creative.fork",
    relatedObservationIds: [],
    answerMode: "single_choice",
    priority: 1,
    options: [
      { id: `fork:${fork.a.id}`, label: fork.a.name, visualDirectionId: fork.a.previewDirectionId },
      { id: `fork:${fork.b.id}`, label: fork.b.name, visualDirectionId: fork.b.previewDirectionId },
      { id: "fork:between", label: "Somewhere between" },
      { id: "fork:neither", label: "Neither" },
      { id: "manager_help", label: "Leave this open for my media manager" },
    ],
  };
  return [...selected, question].slice(0, MAX_CLARIFICATION_QUESTIONS + 1);
}
