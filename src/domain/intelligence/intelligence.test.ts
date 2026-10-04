import { describe, expect, it } from "vitest";
import { seedDemoWorkspace } from "../project/demoWorkspace";
import { buildProjectIntelligence } from "../project/assemble";
import { createProject, withOverride, withReaction } from "../../state/projectStore";
import { assembleBrandBrain, appendRevision, revisionFromDecision, staleEvidence } from "./brain";
import { jobIsDue, nextRunAt } from "./cadence";
import { interpret } from "./engine";
import { notificationIntents } from "./attention";
import { makeJob, runDueJobs } from "./jobs";
import { assessSignal, collapseSignals, markFreshness, normalizeSignal, shouldCallStrategist, signalFingerprint } from "./signals";
import { emptyWatch } from "./watch";
import type { EvidenceRecord } from "../../types/project";
import type { IntelligenceItem, Signal } from "../../types/intelligence";

const NOW = "2026-10-02T09:00:00.000Z";

function signal(patch: Partial<Signal> & Pick<Signal, "id" | "type" | "title">): Signal {
  const base: Signal = {
    id: patch.id,
    brandId: "brand",
    type: patch.type,
    sourceType: patch.sourceType ?? "social",
    sourceProvider: "demo-social",
    title: patch.title,
    description: patch.description ?? patch.title,
    observedAt: NOW,
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEnd: NOW,
    entity: patch.entity ?? "Someone",
    entityId: patch.entityId ?? patch.id,
    metric: patch.metric ?? "metric",
    previousValue: "",
    currentValue: "",
    change: "",
    evidence: [],
    confidence: "moderate",
    status: "new",
    firstObservedAt: patch.firstObservedAt ?? "2026-07-01T00:00:00.000Z",
    lastObservedAt: patch.lastObservedAt ?? NOW,
    origin: patch.origin ?? "demo",
    fingerprint: "",
    metadata: patch.metadata ?? {},
  };
  return normalizeSignal({ ...base, ...patch, fingerprint: "" });
}

describe("brand brain", () => {
  it("keeps evidence, decisions, and earlier revisions", () => {
    const project = seedDemoWorkspace(NOW).find((item) => item.businessName === "North Workshop");
    if (!project) throw new Error("missing north");
    const intelligence = buildProjectIntelligence(project, NOW);
    const brain = assembleBrandBrain(project, intelligence);
    expect(brain.evidenceIds.length).toBeGreaterThan(0);
    expect(brain.evidenceIds.every((id) => intelligence.evidence.some((item) => item.id === id))).toBe(true);
    const decided = withOverride(project, {
      fieldId: "strategy.positioning",
      text: "The joint is the brief.",
      status: "approved",
      decisionStatus: "approved",
      epistemicStatus: "hypothesis",
      updatedAt: NOW,
    }, NOW);
    const nextBrain = assembleBrandBrain(decided, buildProjectIntelligence(decided, NOW));
    expect(nextBrain.strategicDecisions).toContain("The joint is the brief.");
    expect(nextBrain.hypotheses.some((line) => line.includes("The joint is the brief."))).toBe(true);
    const first = project.watch.revisions[0];
    const kept = appendRevision(project.watch.revisions, revisionFromDecision(decided.overrides[0], decided.version));
    expect(kept[0]).toEqual(first);
    expect(kept.at(-1)?.managerDecisionIds).toContain("strategy.positioning");
    const old: EvidenceRecord = {
      ...intelligence.evidence[0],
      retrievedAt: "2025-01-01T00:00:00.000Z",
    };
    expect(staleEvidence([old], NOW).map((item) => item.id)).toContain(old.id);
    expect(staleEvidence([{ ...old, retrievedAt: NOW }], NOW)).toHaveLength(0);
  });
});

describe("signals", () => {
  it("normalises, collapses duplicates, and keeps the first sighting", () => {
    const first = signal({ id: "a", type: "search_interest_change", title: "Benches", sourceType: "search", metric: "interest", entityId: "bench", firstObservedAt: "2026-08-01T00:00:00.000Z", lastObservedAt: "2026-08-01T00:00:00.000Z", currentValue: "1" });
    const again = signal({ id: "b", type: "search_interest_change", title: "Benches again", sourceType: "search", metric: "interest", entityId: "bench", periodStart: first.periodStart, firstObservedAt: "2026-09-01T00:00:00.000Z", lastObservedAt: "2026-09-01T00:00:00.000Z", currentValue: "2" });
    expect(signalFingerprint(first)).toBe(signalFingerprint(again));
    const [collapsed] = collapseSignals([first, again]);
    expect(collapsed?.id).toBe("a");
    expect(collapsed?.firstObservedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(collapsed?.lastObservedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(collapsed?.currentValue).toBe("2");
  });

  it("does not repeat an intelligence item that has not changed", () => {
    const project = createProject({ businessName: "North", now: NOW });
    const brain = assembleBrandBrain(project, buildProjectIntelligence(project, NOW));
    const item: IntelligenceItem = {
      id: "item",
      kind: "change",
      eyebrow: "Search",
      headline: "Benches are being asked for.",
      evidence: "Twice.",
      whyItMatters: "It matches the offer.",
      briefRead: "Still a hypothesis.",
      possibleMove: "",
      signalIds: ["s1"],
      evidenceIds: [],
      temporal: "persistence",
      strategyRelation: "support",
      hypothesisId: "h1",
      epistemicStatus: "hypothesis",
      origin: "demo",
      rank: 1,
      bucket: "today",
    };
    const signals = [signal({ id: "s1", type: "search_interest_change", title: "Benches", sourceType: "search", metadata: { themes: "bench", temporal: "persistence" } })];
    const first = interpret({ brain, signals, reactions: [], memory: [], catalogue: [item], now: NOW, source: "demo", period: "week" });
    const second = interpret({ brain, signals, reactions: [], memory: first.memory, catalogue: [item], now: "2026-10-02T12:00:00.000Z", source: "demo", period: "week" });
    expect(first.reading.importantChanges).toHaveLength(1);
    expect(second.reading.importantChanges).toHaveLength(0);
  });
});

describe("intelligence", () => {
  it("does not turn one signal into a recommendation, and can suppress noise", () => {
    const project = seedDemoWorkspace(NOW).find((item) => item.businessName === "North Workshop");
    if (!project) throw new Error("missing");
    const brain = assembleBrandBrain(project, buildProjectIntelligence(project, NOW));
    const follower = signal({ id: "followers", type: "competitor_follower_change", title: "Followers moved", metadata: { once: "yes" } });
    const assessment = assessSignal(follower, brain, []);
    expect(assessment.escalate).toBe(false);
    expect(shouldCallStrategist([assessment])).toBe(false);
    const lone: IntelligenceItem = {
      id: "lone",
      kind: "opportunity",
      eyebrow: "Social",
      headline: "Post more because a number moved.",
      evidence: "One count.",
      whyItMatters: "",
      briefRead: "No.",
      possibleMove: "Post more video.",
      signalIds: ["followers"],
      evidenceIds: [],
      temporal: "once",
      strategyRelation: "",
      hypothesisId: "",
      epistemicStatus: "recommendation",
      origin: "demo",
      rank: 1,
      bucket: "today",
    };
    const reading = interpret({ brain, signals: [follower], reactions: [], memory: [], catalogue: [lone], now: NOW, source: "demo", period: "day" });
    expect(reading.reading.opportunities).toHaveLength(0);
    expect(reading.callStrategist).toBe(false);
    const news = signal({
      id: "news",
      type: "category_news",
      title: "Unrelated kitchens",
      sourceType: "news",
      sourceProvider: "demo-news",
      metadata: { clientLink: "no" },
    });
    expect(assessSignal(news, brain, []).suppressed).toBe(true);
  });

  it("connects signals, respects a dismissal, and keeps a hypothesis a hypothesis", () => {
    const projects = seedDemoWorkspace(NOW);
    const north = projects.find((item) => item.businessName === "North Workshop");
    const late = projects.find((item) => item.businessName === "Late Service");
    const field = projects.find((item) => item.businessName === "Field Office");
    if (!north || !late || !field) throw new Error("fixtures");
    const reading = north.watch.readings[0];
    expect(reading?.source).toBe("demo");
    expect(reading?.opportunities.some((item) => /dining/i.test(item.headline))).toBe(true);
    expect(reading?.opportunities.every((item) => item.signalIds.length >= 2)).toBe(true);
    expect(reading?.changedHypotheses.every((item) => item.epistemicStatus === "hypothesis")).toBe(true);
    expect(reading?.challengedDecisions.some((item) => item.strategyRelation === "challenge")).toBe(true);
    expect(JSON.stringify(reading)).not.toMatch(/post more/i);
    const dismissed = withReaction(north, {
      id: "r1",
      targetType: "intelligence",
      targetId: "north-change-repair",
      action: "dismiss",
      note: "",
      at: NOW,
    }, NOW);
    const again = interpret({
      brain: assembleBrandBrain(dismissed, buildProjectIntelligence(dismissed, NOW)),
      signals: dismissed.watch.signals,
      reactions: dismissed.watch.reactions,
      memory: [],
      catalogue: [{
        id: "north-change-repair",
        kind: "change",
        eyebrow: "Competitors",
        headline: "Three competitors are suddenly talking about repair.",
        evidence: "Three workshops.",
        whyItMatters: "Longevity.",
        briefRead: "Do not copy it.",
        possibleMove: "Find three old pieces.",
        signalIds: ["north-repair", "north-process"],
        evidenceIds: [],
        temporal: "convergence",
        strategyRelation: "support",
        hypothesisId: "longevity",
        epistemicStatus: "hypothesis",
        origin: "demo",
        rank: 1,
        bucket: "today",
      }],
      now: NOW,
      source: "demo",
      period: "90 days",
    });
    expect(again.reading.importantChanges).toHaveLength(0);
    expect(dismissed.watch.reactions[0]?.action).toBe("dismiss");
    expect(late.watch.readings[0]?.summary).toMatch(/brand/i);
    expect(JSON.stringify(late.watch.readings[0])).not.toMatch(/post more reels/i);
    expect(field.watch.readings[0]?.challengedDecisions[0]?.epistemicStatus).toBe("hypothesis");
    expect(field.watch.dailyBriefs[0]?.source).toBe("demo");
    expect(field.watch.weeklyReads[0]?.decisionsToReconsider.length).toBeGreaterThan(0);
    expect(notificationIntents(north).every((item) => item.deliver === false)).toBe(true);
    expect(notificationIntents(north).some((item) => item.kind === "high_relevance_intelligence")).toBe(true);
  });
});

describe("monitoring", () => {
  it("respects cadence, keeps data when a provider fails, and does not disguise demo as live", () => {
    const hourly = makeJob("b", "demo-social", "social", "hourly", NOW, true);
    expect(jobIsDue(hourly, NOW)).toBe(false);
    expect(jobIsDue(hourly, nextRunAt("hourly", NOW))).toBe(true);
    expect(jobIsDue(makeJob("b", "website-html", "website", "manual", NOW, false), "2027-01-01T00:00:00.000Z")).toBe(false);
    const existing = signal({ id: "keep", type: "search_interest_change", title: "Keep me", origin: "demo" });
    const state = { ...emptyWatch(NOW), signals: [existing], jobs: [makeJob("b", "demo-search", "search", "daily", "2026-10-01T00:00:00.000Z", true)] };
    state.jobs[0] = { ...state.jobs[0], nextRunAt: NOW };
    const failed = runDueJobs(state, NOW, () => {
      throw new Error("provider down");
    });
    expect(failed.signals.map((item) => item.id)).toEqual(["keep"]);
    expect(failed.jobs[0]?.status).toBe("error");
    expect(failed.signals[0]?.origin).toBe("demo");
    const live = signal({ id: "live", type: "brand_website_change", title: "Page", origin: "live", lastObservedAt: "2026-08-01T00:00:00.000Z" });
    const demo = signal({ id: "demo", type: "competitor_follower_change", title: "Count", origin: "demo", lastObservedAt: "2026-08-01T00:00:00.000Z" });
    const marked = markFreshness([live, demo], NOW);
    expect(marked.find((item) => item.id === "live")?.origin).toBe("stale");
    expect(marked.find((item) => item.id === "demo")?.origin).toBe("demo");
    expect(marked.find((item) => item.id === "demo")?.status).toBe("stale");
  });
});
