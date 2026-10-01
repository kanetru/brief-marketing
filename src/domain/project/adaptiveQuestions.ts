import { sectionIndex } from "../sections";
import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";
import type { Contradiction, FollowUp, OpenQuestion } from "../../types/project";

export function discoveryProgress(session: DiscoverySession): number {
  const index = Math.max(0, sectionIndex(session.progress.furthest));
  const span = Math.max(1, sectionIndex("complete"));
  return Math.min(100, Math.round((index / span) * 100));
}

export function findContradictions(session: DiscoverySession): Contradiction[] {
  const found: Contradiction[] = [];
  const attract = new Set(session.personality.attract.selected);
  const avoid = new Set(session.personality.avoid.selected);
  for (const trait of attract) {
    if (avoid.has(trait)) {
      found.push({
        id: `contradict-${trait}`,
        statement: `They chose ${trait} as something to feel, and also as something to avoid.`,
        evidenceIds: ["personality.attract", "personality.avoid"],
      });
    }
  }
  const description = `${textValue(session.business.description)} ${textValue(session.business.peopleComeFor)}`.toLowerCase();
  if (avoid.has("premium") && /premium|luxury|exclusive/.test(description)) {
    found.push({
      id: "contradict-premium-words",
      statement: "The words mention premium or luxury, and premium is also on the avoid list.",
      evidenceIds: ["business.description", "personality.avoid"],
    });
  }
  const desired = session.audience.desiredCustomers;
  const current = textValue(session.audience.bestCustomers);
  if (desired.state === "evidence" && current && desired.evidence.raw.trim() && desired.evidence.raw.trim() !== current.trim()) {
    found.push({
      id: "contradict-audiences",
      statement: "The people who come now and the people they want are described as different groups.",
      evidenceIds: ["audience.current", "audience.desired"],
    });
  }
  return found;
}

/**
 * Core discovery, then a bounded reasoner.
 * At most five follow-ups. Nothing is added just to fill the quota.
 */
export function adaptiveFollowUps(session: DiscoverySession, existing: FollowUp[]): FollowUp[] {
  const prompts: Array<Omit<FollowUp, "answer">> = [];
  for (const contradiction of findContradictions(session)) {
    if (contradiction.id === "contradict-audiences") {
      prompts.push({ id: "ask-payer", prompt: "You're describing two groups. Which one actually pays you?", reason: contradiction.statement });
    } else if (contradiction.id.startsWith("contradict-")) {
      prompts.push({ id: `ask-${contradiction.id}`, prompt: contradiction.statement.replace(/\.$/, "") + " Which part should we trust?", reason: contradiction.statement });
    }
  }
  const description = textValue(session.business.description);
  if (description && description.trim().length < 40) {
    prompts.push({ id: "ask-specific", prompt: "That description could fit a lot of businesses. What do you actually make or do in a week?", reason: "The description is still too short to build on." });
  }
  const blob = `${description} ${textValue(session.goals.twelveMonthSuccess)}`.toLowerCase();
  if ((blob.match(/trust/g) ?? []).length >= 2) {
    prompts.push({ id: "ask-trust", prompt: "You've come back to trust. What makes customers distrust this category now?", reason: "Trust is doing a lot of work and has not been made specific." });
  }
  if (!textValue(session.audience.bestCustomers)) {
    prompts.push({ id: "ask-audience", prompt: "Who do you most want this to matter to — the person who already pays, or someone you have not reached?", reason: "Audience is still empty." });
  }
  const specific = `${description} ${textValue(session.business.peopleComeFor)}`.toLowerCase();
  if (/not manufactured|feel made|made, not/.test(specific)) {
    prompts.push({
      id: "ask-strong",
      prompt: "You said the pieces should feel made, not manufactured. What would someone notice first if that were true?",
      reason: "That line is unusually specific. It should not be flattened.",
    });
  }
  const making = (specific.match(/made|making|workshop|process|joint|built/g) ?? []).length;
  if (making >= 2) {
    prompts.push({
      id: "ask-making",
      prompt: "You keep coming back to how the work is made. Is that the thing you'd be disappointed to leave out?",
      reason: "Making is a repeated theme, stronger than a one-off phrase.",
    });
  }
  const chosen = prompts.slice(0, 5);
  return chosen.map((item) => ({
    ...item,
    answer: existing.find((follow) => follow.id === item.id)?.answer ?? "",
  }));
}

export function openQuestionsFrom(session: DiscoverySession, followUps: FollowUp[], strategistQuestions: string[]): OpenQuestion[] {
  const questions: OpenQuestion[] = findContradictions(session).map((item) => ({
    id: item.id,
    prompt: item.statement,
    reason: "The evidence disagrees with itself.",
    evidenceIds: item.evidenceIds,
  }));
  for (const follow of followUps) {
    if (!follow.answer.trim()) {
      questions.push({ id: follow.id, prompt: follow.prompt, reason: follow.reason, evidenceIds: [] });
    }
  }
  strategistQuestions.slice(0, 2).forEach((prompt, index) => {
    questions.push({ id: `strategist-q-${index}`, prompt, reason: "Still worth resolving before the work hardens.", evidenceIds: ["inference.territory"] });
  });
  return questions.slice(0, 6);
}
