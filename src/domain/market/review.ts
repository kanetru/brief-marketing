import { dedupeCandidates } from "./rank";
import type { MarketAccountAssessment, MarketAccountType, MarketDiscoveryRecord, MarketRunResult, MonitoredMarketEntity, SocialAccountCandidate } from "../../types/marketDiscovery";

const TYPES = new Set<MarketAccountType>([
  "direct_competitor",
  "indirect_competitor",
  "market_reference",
  "watch_account",
  "emerging_account",
  "irrelevant",
]);

const PROMINENT = [
  "direct_competitor",
  "indirect_competitor",
  "market_reference",
  "watch_account",
  "emerging_account",
] as const;

export const MARKET_GROUP_LABEL: Record<Exclude<MarketAccountType, "irrelevant">, string> = {
  direct_competitor: "Direct competitors",
  indirect_competitor: "Indirect competitors",
  market_reference: "Market references",
  watch_account: "Watch accounts",
  emerging_account: "Emerging",
};

export function emptyMarketDiscovery(now: string): MarketDiscoveryRecord {
  return {
    set: null,
    candidates: [],
    assessments: [],
    proposals: [],
    entities: [],
    usage: [],
    origin: "idle",
    message: "",
    updatedAt: now,
  };
}

export function storeRun(previous: MarketDiscoveryRecord, result: MarketRunResult, mode: "replace" | "merge", now: string): MarketDiscoveryRecord {
  const usage = [...(mode === "merge" ? previous.usage : []), ...result.usage].slice(-40);
  if (!result.ok) {
    return {
      ...previous,
      set: result.set ?? previous.set,
      usage,
      message: "Discovery unavailable",
      origin: previous.candidates.length > 0 ? previous.origin : "unavailable",
      updatedAt: now,
    };
  }
  if (result.origin === "demo") return { ...previous, updatedAt: now };
  const candidates = mode === "merge" ? dedupeCandidates([...previous.candidates, ...result.candidates]) : result.candidates;
  const assessments = carryDecisions(previous.assessments, mode === "merge" ? [...previous.assessments.filter((item) => !result.assessments.some((next) => next.candidateId === item.candidateId)), ...result.assessments] : result.assessments);
  return {
    ...previous,
    set: result.set ?? previous.set,
    candidates,
    assessments,
    proposals: mode === "merge" ? mergeProposals(previous.proposals, result.proposals) : result.proposals.map((item) => previous.proposals.find((saved) => saved.id === item.id)?.confidence === "confirmed" ? { ...item, confidence: "confirmed" as const } : item),
    usage,
    origin: result.origin,
    message: "",
    updatedAt: now,
  };
}

function carryDecisions(previous: MarketDiscoveryRecord["assessments"], next: MarketDiscoveryRecord["assessments"]): MarketDiscoveryRecord["assessments"] {
  return next.map((item) => {
    const saved = previous.find((entry) => entry.candidateId === item.candidateId);
    if (!saved || saved.decisionStatus === "unreviewed") return { ...item, epistemicStatus: "inference", machineClassification: item.machineClassification };
    return {
      ...item,
      classification: saved.classification,
      machineClassification: item.machineClassification,
      epistemicStatus: "inference",
      decisionStatus: saved.decisionStatus,
      recommendedAction: saved.decisionStatus === "rejected" ? "ignore" : item.recommendedAction,
    };
  });
}

function mergeProposals(previous: MarketDiscoveryRecord["proposals"], next: MarketDiscoveryRecord["proposals"]): MarketDiscoveryRecord["proposals"] {
  const confirmed = new Set(previous.filter((item) => item.confidence === "confirmed").map((item) => item.id));
  const merged = next.map((item) => confirmed.has(item.id) ? { ...item, confidence: "confirmed" as const } : item);
  for (const item of previous) {
    if (!merged.some((entry) => entry.id === item.id)) merged.push(item);
  }
  return merged;
}

export function prominentAssessments(record: MarketDiscoveryRecord): MarketAccountAssessment[] {
  return record.assessments.filter((item) => item.classification !== "irrelevant" && item.decisionStatus !== "rejected");
}

export function groupedReview(record: MarketDiscoveryRecord): Array<{ type: Exclude<MarketAccountType, "irrelevant">; items: MarketAccountAssessment[] }> {
  return PROMINENT.map((type) => ({
    type,
    items: prominentAssessments(record).filter((item) => item.classification === type),
  })).filter((group) => group.items.length > 0);
}

export function watchingSummary(record: MarketDiscoveryRecord): Array<{ type: Exclude<MarketAccountType, "irrelevant">; count: number }> {
  return PROMINENT.map((type) => ({
    type,
    count: record.entities.filter((item) => item.classification === type && item.monitoringStatus === "active").length,
  })).filter((item) => item.count > 0);
}

export function acceptAssessment(raw: MarketAccountAssessment, candidate: SocialAccountCandidate | undefined): MarketAccountAssessment | null {
  if (!candidate) return null;
  if (!TYPES.has(raw.classification)) return null;
  const machine = TYPES.has(raw.machineClassification) ? raw.machineClassification : raw.classification;
  return {
    ...raw,
    candidateId: candidate.id,
    classification: raw.classification,
    machineClassification: machine,
    relevance: raw.relevance === "high" || raw.relevance === "low" ? raw.relevance : "moderate",
    summary: raw.summary.trim(),
    whyItMatters: raw.whyItMatters.trim(),
    overlap: {
      offer: raw.overlap?.offer?.trim() ?? "",
      audience: raw.overlap?.audience?.trim() ?? "",
      geography: raw.overlap?.geography?.trim() ?? "",
      category: raw.overlap?.category?.trim() ?? "",
    },
    evidence: Array.isArray(raw.evidence) ? raw.evidence.filter((item) => item && item.label) : [],
    uncertainty: raw.uncertainty?.trim() ?? "",
    recommendedAction: raw.classification === "irrelevant" ? "ignore" : raw.recommendedAction === "monitor" || raw.recommendedAction === "ignore" ? raw.recommendedAction : "consider",
    source: "social_discovery",
    epistemicStatus: "inference",
    decisionStatus: "unreviewed",
    clientClaim: candidate.clientClaim,
  };
}

export function approveAccount(record: MarketDiscoveryRecord, candidateId: string, now: string): MarketDiscoveryRecord {
  const assessment = record.assessments.find((item) => item.candidateId === candidateId);
  const candidate = record.candidates.find((item) => item.id === candidateId);
  if (!assessment || !candidate || assessment.classification === "irrelevant") return record;
  const nextAssessment: MarketAccountAssessment = { ...assessment, decisionStatus: "approved", recommendedAction: "monitor" };
  const entity = entityFrom(record, candidate, nextAssessment, now);
  return {
    ...record,
    assessments: record.assessments.map((item) => (item.candidateId === candidateId ? nextAssessment : item)),
    entities: upsertEntity(record.entities, entity),
    updatedAt: now,
  };
}

export function reclassifyAccount(record: MarketDiscoveryRecord, candidateId: string, classification: MarketAccountType, now: string): MarketDiscoveryRecord {
  const assessment = record.assessments.find((item) => item.candidateId === candidateId);
  if (!assessment || !TYPES.has(classification)) return record;
  const next: MarketAccountAssessment = {
    ...assessment,
    classification,
    machineClassification: assessment.machineClassification,
    epistemicStatus: "inference",
    decisionStatus: classification === "irrelevant" ? "rejected" : "approved",
    recommendedAction: classification === "irrelevant" ? "ignore" : "monitor",
  };
  let entities = record.entities;
  if (classification === "irrelevant") {
    entities = entities.filter((item) => !item.candidateIds.includes(candidateId));
  } else if (entities.some((item) => item.candidateIds.includes(candidateId))) {
    entities = entities.map((item) => item.candidateIds.includes(candidateId) ? { ...item, classification, epistemicStatus: "inference", decisionStatus: "approved" } : item);
  }
  return { ...record, assessments: record.assessments.map((item) => item.candidateId === candidateId ? next : item), entities, updatedAt: now };
}

export function dismissAccount(record: MarketDiscoveryRecord, candidateId: string, now: string): MarketDiscoveryRecord {
  return {
    ...record,
    assessments: record.assessments.map((item) => item.candidateId === candidateId
      ? { ...item, decisionStatus: "rejected" as const, recommendedAction: "ignore" as const, epistemicStatus: "inference" as const }
      : item),
    entities: record.entities.filter((item) => !item.candidateIds.includes(candidateId)),
    updatedAt: now,
  };
}

export function confirmIdentity(record: MarketDiscoveryRecord, proposalId: string, now: string): MarketDiscoveryRecord {
  const proposal = record.proposals.find((item) => item.id === proposalId);
  if (!proposal) return record;
  const accounts = record.candidates.filter((item) => proposal.accountIds.includes(item.id));
  if (accounts.length < 2) return record;
  const entity: MonitoredMarketEntity = {
    id: `entity-${proposal.id}`,
    clientId: record.set?.clientId ?? "",
    name: proposal.name,
    classification: "watch_account",
    accounts: accounts.map((item) => ({ platform: item.platform, handle: item.handle, providerId: item.id })),
    monitoringStatus: "paused",
    addedAt: now,
    addedBy: "manager",
    epistemicStatus: "inference",
    decisionStatus: "approved",
    machineClassification: "watch_account",
    clientClaim: accounts.find((item) => item.clientClaim)?.clientClaim ?? "",
    candidateIds: accounts.map((item) => item.id),
  };
  return {
    ...record,
    proposals: record.proposals.map((item) => item.id === proposalId ? { ...item, confidence: "confirmed" } : item),
    entities: upsertEntity(record.entities.filter((item) => !accounts.every((account) => item.candidateIds.includes(account.id) && item.candidateIds.length === 1)), entity),
    updatedAt: now,
  };
}

function entityFrom(record: MarketDiscoveryRecord, candidate: SocialAccountCandidate, assessment: MarketAccountAssessment, now: string): MonitoredMarketEntity {
  return {
    id: `entity-${candidate.id}`,
    clientId: record.set?.clientId ?? "",
    name: candidate.displayName || candidate.handle,
    classification: assessment.classification,
    accounts: [{ platform: candidate.platform, handle: candidate.handle, providerId: candidate.id }],
    monitoringStatus: "active",
    addedAt: now,
    addedBy: "manager",
    epistemicStatus: "inference",
    decisionStatus: "approved",
    machineClassification: assessment.machineClassification,
    clientClaim: candidate.clientClaim,
    candidateIds: [candidate.id],
  };
}

function upsertEntity(entities: MonitoredMarketEntity[], next: MonitoredMarketEntity): MonitoredMarketEntity[] {
  const without = entities.filter((item) => item.id !== next.id && !next.candidateIds.some((id) => item.candidateIds.length === 1 && item.candidateIds[0] === id));
  return [...without, next];
}
