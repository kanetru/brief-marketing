import type { Qualitative, Signal, SignalAssessment, TemporalCharacter } from "../../types/intelligence";
import type { BrandBrain } from "../../types/intelligence";
import type { ManagerReaction } from "../../types/intelligence";

const DAY = 24 * 60 * 60 * 1000;

export function signalFingerprint(signal: Pick<Signal, "type" | "entityId" | "metric" | "periodStart">): string {
  return [signal.type, signal.entityId, signal.metric, signal.periodStart.slice(0, 10)].join("|").toLowerCase();
}

export function normalizeSignal(input: Signal): Signal {
  const fingerprint = input.fingerprint || signalFingerprint(input);
  return {
    ...input,
    fingerprint,
    title: input.title.trim(),
    description: input.description.trim(),
    evidence: input.evidence ?? [],
    metadata: input.metadata ?? {},
    firstObservedAt: input.firstObservedAt || input.observedAt,
    lastObservedAt: input.lastObservedAt || input.observedAt,
  };
}

/** Same observation updates the existing record. History of first sight stays. */
export function collapseSignals(signals: readonly Signal[]): Signal[] {
  const byKey = new Map<string, Signal>();
  for (const raw of signals) {
    const signal = normalizeSignal(raw);
    const existing = byKey.get(signal.fingerprint);
    if (!existing) {
      byKey.set(signal.fingerprint, signal);
      continue;
    }
    const first = existing.firstObservedAt < signal.firstObservedAt ? existing.firstObservedAt : signal.firstObservedAt;
    const last = existing.lastObservedAt > signal.lastObservedAt ? existing : signal;
    byKey.set(signal.fingerprint, {
      ...last,
      id: existing.id,
      firstObservedAt: first,
      evidence: [...new Set([...existing.evidence, ...signal.evidence])],
    });
  }
  return [...byKey.values()];
}

export function markFreshness(signals: readonly Signal[], now: string): Signal[] {
  const at = Date.parse(now);
  return signals.map((signal) => {
    const age = at - Date.parse(signal.lastObservedAt);
    if (signal.origin === "demo") {
      return age > 14 * DAY ? { ...signal, status: "stale" } : signal;
    }
    if (signal.origin === "unavailable") return signal;
    if (age > 7 * DAY) return { ...signal, origin: "stale", status: "stale" };
    if (age > 2 * DAY && signal.origin === "live") return { ...signal, origin: "cached" };
    return signal;
  });
}

function haystack(brain: BrandBrain): string {
  return [
    brain.narrative,
    brain.goals,
    brain.offers,
    brain.customers,
    brain.positioning,
    brain.commercialPriorities,
    brain.differentiation,
    brain.proof,
    brain.brand,
  ].join(" ").toLowerCase();
}

function mentions(brain: BrandBrain, words: string[]): boolean {
  const text = haystack(brain);
  return words.some((word) => text.includes(word.toLowerCase()));
}

function level(value: Qualitative): Qualitative {
  return value;
}

export function assessSignal(signal: Signal, brain: BrandBrain, reactions: readonly ManagerReaction[]): SignalAssessment {
  const dismissed = reactions.some((reaction) =>
    (reaction.action === "dismiss" || reaction.action === "not_relevant")
    && (reaction.targetId === signal.id || reaction.targetId === signal.fingerprint),
  );
  const material = signal.metadata.material === "yes";
  const temporal = (signal.metadata.temporal ?? "") as TemporalCharacter | "";
  const related = signal.evidence;
  let significance: Qualitative = "low";
  let brandRelevance: Qualitative = "low";
  let rationale = "Observed. Not yet read against the brand.";

  if (signal.type === "competitor_follower_change" || signal.metadata.once === "yes") {
    significance = "moderate";
    brandRelevance = "low";
    rationale = "A single count moved. That is not a reason to change the work.";
  } else if (signal.type.includes("theme") || signal.type === "competitor_content_theme_rising") {
    significance = "high";
    const words = (signal.metadata.themes ?? signal.title).split(",").map((item) => item.trim()).filter(Boolean);
    brandRelevance = mentions(brain, words.length ? words : [signal.title]) ? "high" : "moderate";
    rationale = brandRelevance === "high"
      ? "The theme touches something this brand already cares about."
      : "Several competitors moved. The brand has not said this theme matters.";
  } else if (signal.sourceType === "search") {
    const words = (signal.metadata.themes ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    significance = temporal === "acceleration" || temporal === "seasonality" ? "high" : "moderate";
    brandRelevance = words.length && mentions(brain, words) ? "high" : "low";
    rationale = brandRelevance === "high"
      ? "The language in search matches an offer this brand wants."
      : "Search moved in a direction this brand does not sell.";
  } else if (signal.sourceType === "news") {
    significance = "moderate";
    brandRelevance = signal.metadata.clientLink === "yes" ? "high" : "low";
    rationale = brandRelevance === "high"
      ? "The story touches this client's customer or offer."
      : "The story is in the category, without a reason this manager should act.";
  } else if (signal.sourceType === "market") {
    const words = (signal.metadata.themes ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    significance = "moderate";
    brandRelevance = words.length && mentions(brain, words) ? "moderate" : "low";
    rationale = brandRelevance === "low"
      ? "A price moved. Nothing in the brand brain says it changes the work."
      : "A cost this brand actually buys has moved. Worth watching, not a campaign.";
  } else if (signal.type === "competitor_website_change") {
    significance = "low";
    brandRelevance = "low";
    rationale = "A line on a website changed. One line is not a shift in the category.";
  }

  const leaveInRaw = signal.sourceType === "news" && signal.metadata.clientLink !== "yes" && signal.metadata.surface !== "yes";
  const suppressed = (dismissed && !material) || leaveInRaw;
  const escalate = !suppressed && (brandRelevance === "high" || (brandRelevance as Qualitative) === "critical");
  return {
    signalId: signal.id,
    significance: level(significance),
    brandRelevance,
    confidence: signal.origin === "demo" ? "moderate" : signal.confidence === "high" ? "high" : "moderate",
    rationale,
    relatedEvidenceIds: related,
    temporal,
    suppressed,
    suppressReason: dismissed && !material ? "You set this aside." : suppressed ? rationale : "",
    escalate,
  };
}

export function assessSignals(signals: readonly Signal[], brain: BrandBrain, reactions: readonly ManagerReaction[]): SignalAssessment[] {
  return signals.map((signal) => assessSignal(signal, brain, reactions));
}

/** Flagship reasoning runs only after the cheap filter finds something that might matter. */
export function shouldCallStrategist(assessments: readonly SignalAssessment[]): boolean {
  return assessments.some((item) => item.escalate);
}
