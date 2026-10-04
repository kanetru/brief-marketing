import { assessSignals, shouldCallStrategist } from "./signals";
import type {
  BrandBrain,
  BrandIntelligenceReading,
  DailyBrief,
  IntelligenceItem,
  IntelligenceMemory,
  ManagerReaction,
  Signal,
  WeeklyIntelligenceRead,
} from "../../types/intelligence";

const HOUR = 60 * 60 * 1000;

export function itemFingerprint(item: Pick<IntelligenceItem, "headline">): string {
  return item.headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function remembered(memory: readonly IntelligenceMemory[], item: IntelligenceItem, now: string): IntelligenceItem | null {
  const key = itemFingerprint(item);
  const prior = memory.find((entry) => entry.fingerprint === key);
  if (!prior) return item;
  const age = Date.parse(now) - Date.parse(prior.lastSurfacedAt);
  if (age < 20 * HOUR) return null;
  if (prior.development === "faded" || item.temporal === "faded") {
    return { ...item, headline: `This appears to have faded. ${item.headline}` };
  }
  if (item.temporal === "persistence" || item.temporal === "convergence" || prior.development === "pattern") {
    return { ...item, headline: `This is becoming a pattern. ${item.headline}` };
  }
  return item;
}

function remember(memory: IntelligenceMemory[], item: IntelligenceItem, now: string): void {
  const key = itemFingerprint(item);
  const prior = memory.find((entry) => entry.fingerprint === key);
  const development = item.temporal === "faded"
    ? "faded"
    : item.temporal === "persistence" || item.temporal === "convergence"
      ? "pattern"
      : prior
        ? "unchanged"
        : "new";
  const next: IntelligenceMemory = {
    fingerprint: key,
    headline: item.headline,
    firstSurfacedAt: prior?.firstSurfacedAt ?? now,
    lastSurfacedAt: now,
    reaction: prior?.reaction ?? "",
    development,
  };
  const index = memory.findIndex((entry) => entry.fingerprint === key);
  if (index >= 0) memory[index] = next;
  else memory.push(next);
}

function applies(item: IntelligenceItem, reactions: readonly ManagerReaction[], signalIds: Set<string>): boolean {
  const dropped = reactions.some((reaction) =>
    (reaction.action === "dismiss" || reaction.action === "not_relevant")
    && (reaction.targetId === item.id || item.signalIds.includes(reaction.targetId)),
  );
  if (dropped) return false;
  if (item.signalIds.length > 0 && item.signalIds.every((id) => !signalIds.has(id))) return false;
  if (item.kind === "opportunity" && item.signalIds.length < 2) return false;
  if (item.kind === "hypothesis" || item.kind === "challenge") {
    item.epistemicStatus = "hypothesis";
  }
  if (item.kind !== "opportunity" && item.kind !== "hypothesis" && item.kind !== "challenge") {
    if (item.epistemicStatus === "recommendation") item.epistemicStatus = "observation";
  }
  return true;
}

export interface InterpretInput {
  brain: BrandBrain;
  signals: readonly Signal[];
  reactions: readonly ManagerReaction[];
  memory: readonly IntelligenceMemory[];
  /** Authored demo items. A live reading must come from the strategist, not from this list. */
  catalogue: readonly IntelligenceItem[];
  now: string;
  source: BrandIntelligenceReading["source"];
  period: string;
}

/**
 * A signal is not an insight. An insight is not a recommendation.
 * The cheap filter decides whether a strategist should be called.
 * This function does not call a model.
 */
export function interpret(input: InterpretInput): { reading: BrandIntelligenceReading; memory: IntelligenceMemory[]; callStrategist: boolean } {
  const assessments = assessSignals(input.signals, input.brain, input.reactions);
  const callStrategist = input.source !== "demo" && shouldCallStrategist(assessments);
  const visible = new Set(
    assessments.filter((item) => !item.suppressed).map((item) => item.signalId),
  );
  const memory = input.memory.map((entry) => ({ ...entry }));
  const kept: IntelligenceItem[] = [];
  for (const raw of input.catalogue) {
    const item = { ...raw };
    if (!applies(item, input.reactions, visible)) continue;
    const surfaced = remembered(memory, item, input.now);
    if (!surfaced) continue;
    remember(memory, surfaced, input.now);
    kept.push(surfaced);
  }
  for (const signal of input.signals) {
    const assessment = assessments.find((item) => item.signalId === signal.id);
    if (!assessment || assessment.suppressed) continue;
    if (assessment.brandRelevance !== "low" && assessment.significance !== "low") continue;
    if (kept.some((item) => item.signalIds.includes(signal.id))) continue;
    const noise: IntelligenceItem = {
      id: `noise-${signal.id}`,
      kind: "non_actionable",
      eyebrow: signal.sourceType,
      headline: signal.title,
      evidence: signal.description,
      whyItMatters: assessment.rationale,
      briefRead: "This probably doesn't matter.",
      possibleMove: "",
      signalIds: [signal.id],
      evidenceIds: signal.evidence,
      temporal: assessment.temporal,
      strategyRelation: "not_affect",
      hypothesisId: "",
      epistemicStatus: "observation",
      origin: signal.origin,
      rank: 80,
      bucket: "watching",
    };
    const surfaced = remembered(memory, noise, input.now);
    if (!surfaced) continue;
    remember(memory, surfaced, input.now);
    kept.push(surfaced);
  }

  const take = (kind: IntelligenceItem["kind"]) => kept.filter((item) => item.kind === kind).sort((a, b) => a.rank - b.rank);
  const reading: BrandIntelligenceReading = {
    id: `reading-${input.brain.projectId}-${input.now.slice(0, 10)}`,
    period: input.period,
    summary: kept.some((item) => item.kind === "change" || item.kind === "opportunity")
      ? "A few things moved in a way that touches this brand."
      : "Nothing moved enough to warrant attention.",
    importantChanges: take("change"),
    opportunities: take("opportunity"),
    watchItems: take("watch"),
    thingsNotWorthReactingTo: take("non_actionable"),
    changedHypotheses: take("hypothesis"),
    challengedDecisions: take("challenge"),
    questions: take("question"),
    evidenceIds: [...new Set(kept.flatMap((item) => item.evidenceIds))],
    generatedAt: input.now,
    brandBrainVersion: input.brain.version,
    source: input.source,
    model: input.source === "live_model" ? "gpt-5.6-sol" : "",
  };
  if (input.source === "withheld" && callStrategist) {
    reading.summary = "Something may matter. A strategist has not read it yet. These notes are not that reading.";
    reading.opportunities = [];
    reading.importantChanges = reading.importantChanges.map((item) => ({ ...item, possibleMove: "", briefRead: "Waiting for a strategist. This is not a recommendation." }));
  }
  return { reading, memory, callStrategist };
}

export function dailyBriefFromReading(reading: BrandIntelligenceReading, name: string, now: string): DailyBrief {
  const items = [...reading.importantChanges, ...reading.opportunities, ...reading.challengedDecisions].slice(0, 3);
  const quiet = items.length === 0;
  return {
    id: `daily-${reading.id}`,
    date: now.slice(0, 10),
    greeting: quiet ? `Good morning. Nothing important changed for ${name}.` : `Good morning. ${items.length === 1 ? "One thing" : items.length === 2 ? "Two things" : "Three things"} worth knowing about ${name} today.`,
    items,
    quietLine: quiet ? "Nothing moved enough to matter." : "Nothing else moved enough to matter.",
    generatedAt: now,
    source: reading.source,
  };
}

export function weeklyFromItems(reading: BrandIntelligenceReading, now: string, authored: Partial<WeeklyIntelligenceRead> = {}): WeeklyIntelligenceRead {
  return {
    id: `weekly-${reading.id}`,
    period: reading.period,
    persisted: authored.persisted ?? reading.watchItems.map((item) => item.headline),
    disappeared: authored.disappeared ?? [],
    convergence: authored.convergence ?? reading.importantChanges.filter((item) => item.temporal === "convergence").map((item) => item.headline),
    customerLanguage: authored.customerLanguage ?? [],
    searchMovement: authored.searchMovement ?? reading.importantChanges.filter((item) => item.eyebrow.toLowerCase().includes("search")).map((item) => item.headline),
    opportunities: authored.opportunities ?? reading.opportunities.map((item) => item.headline),
    hypothesesStrengthened: authored.hypothesesStrengthened ?? reading.changedHypotheses.filter((item) => item.strategyRelation === "support").map((item) => item.headline),
    hypothesesWeakened: authored.hypothesesWeakened ?? reading.changedHypotheses.filter((item) => item.strategyRelation === "challenge").map((item) => item.headline),
    decisionsToReconsider: authored.decisionsToReconsider ?? reading.challengedDecisions.map((item) => item.headline),
    generatedAt: now,
    source: reading.source,
  };
}
