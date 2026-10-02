import { claimsStaleDemographics, isGenericStrategy } from "../strategy/quality";
import type {
  ClientStrategistOutput,
  ManagerDecision,
  ReasonedChannel,
  ReasonedStage,
  ReasonedTerritory,
  StrategicHypothesis,
  StrategicObservation,
  StrategicTension,
  StrategicUnknown,
} from "../../../types/clientRead";
import type { ChannelId, ChannelPriority } from "../../../types/strategy";

const CHANNELS = new Set<ChannelId>(["instagram", "facebook", "linkedin", "tiktok", "youtube", "pinterest", "email", "search", "website", "events", "partnerships"]);
const PRIORITIES = new Set<ChannelPriority>(["primary", "secondary", "test", "maintain", "deprioritise", "not_now"]);
const BARE_TERRITORY = /^(education|inspiration|behind the scenes|promotion|authentic storytelling)$/i;

export function validateClientStrategist(value: unknown, evidenceIds: readonly string[]): ClientStrategistOutput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const clientRead = stringOf(raw.clientRead);
  if (clientRead.length < 80) return null;
  if (isGenericStrategy(clientRead) || claimsStaleDemographics(clientRead)) return null;
  const known = new Set(evidenceIds);
  const cite = (ids: unknown) => asStrings(ids).filter((id) => known.has(id));
  return {
    clientRead,
    clientReadEvidenceIds: cite(raw.clientReadEvidenceIds),
    observations: asList(raw.observations).map(observation).filter((item): item is StrategicObservation => Boolean(item)).map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((id) => known.has(id)) })).filter((item) => item.evidenceIds.length > 0 && !isGenericStrategy(item.body)),
    tensions: asList(raw.tensions).map(tension).filter((item): item is StrategicTension => Boolean(item)).map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((id) => known.has(id)) })).filter((item) => item.evidenceIds.length > 0),
    hypotheses: asList(raw.hypotheses).map(hypothesis).filter((item): item is StrategicHypothesis => Boolean(item)).map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((id) => known.has(id)), epistemicStatus: "hypothesis" as const })).filter((item) => item.evidenceIds.length > 0),
    unknowns: asList(raw.unknowns).map(unknown).filter((item): item is StrategicUnknown => Boolean(item)),
    positioning: positioning(raw.positioning, known),
    channels: asList(raw.channels).map(channel).filter((item): item is ReasonedChannel => Boolean(item)).map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((id) => known.has(id)) })),
    territories: asList(raw.territories).map(territory).filter((item): item is ReasonedTerritory => Boolean(item)).filter((item) => !BARE_TERRITORY.test(item.name) && !isGenericStrategy(item.idea)),
    roadmap: asList(raw.roadmap).map(stage).filter((item): item is ReasonedStage => Boolean(item)),
    assetNeeds: asStrings(raw.assetNeeds).filter((line) => !isGenericStrategy(line)).slice(0, 8),
  };
}

function positioning(value: unknown, known: Set<string>): ClientStrategistOutput["positioning"] {
  const statement = typeof value === "string" ? value.trim() : stringOf((value as { statement?: unknown } | null)?.statement);
  const ids = citeIds((value as { evidenceIds?: unknown } | null)?.evidenceIds, known);
  if (!statement || isGenericStrategy(statement) || claimsStaleDemographics(statement)) {
    return { statement: "", evidenceIds: [], epistemicStatus: "hypothesis", decisionStatus: "unreviewed" };
  }
  return { statement, evidenceIds: ids, epistemicStatus: "hypothesis", decisionStatus: "unreviewed" };
}

function observation(value: unknown): StrategicObservation | null {
  const raw = record(value);
  if (!raw) return null;
  const title = stringOf(raw.title);
  const body = stringOf(raw.body);
  if (!title || !body) return null;
  return { id: slug(title), title, body, evidenceIds: asStrings(raw.evidenceIds), confidence: confidence(raw.confidence) };
}

function tension(value: unknown): StrategicTension | null {
  const raw = record(value);
  if (!raw) return null;
  const sideA = stringOf(raw.sideA);
  const sideB = stringOf(raw.sideB);
  const observationText = stringOf(raw.observation);
  if (!sideA || !sideB || !observationText) return null;
  return {
    id: slug(observationText),
    observation: observationText,
    sideA,
    sideB,
    whyItMatters: stringOf(raw.whyItMatters),
    evidenceIds: asStrings(raw.evidenceIds),
    confidence: confidence(raw.confidence),
    epistemicStatus: "hypothesis",
    managerDecision: "unreviewed",
  };
}

function hypothesis(value: unknown): StrategicHypothesis | null {
  const raw = record(value);
  if (!raw) return null;
  const statement = stringOf(raw.statement);
  if (!statement) return null;
  return {
    id: slug(statement),
    statement,
    evidenceIds: asStrings(raw.evidenceIds),
    confidence: confidence(raw.confidence),
    epistemicStatus: "hypothesis",
    managerDecision: "unreviewed",
  };
}

function unknown(value: unknown): StrategicUnknown | null {
  const raw = record(value);
  if (!raw) return null;
  const question = stringOf(raw.question);
  if (question.length < 12) return null;
  return { id: slug(question), question, whyItMatters: stringOf(raw.whyItMatters) };
}

function channel(value: unknown): ReasonedChannel | null {
  const raw = record(value);
  if (!raw) return null;
  const name = stringOf(raw.channel) as ChannelId;
  const priority = stringOf(raw.priority) as ReasonedChannel["priority"];
  if (!CHANNELS.has(name) || !PRIORITIES.has(priority)) return null;
  const why = stringOf(raw.why);
  const role = stringOf(raw.role);
  if (!why || isGenericStrategy(why) || claimsStaleDemographics(why)) return null;
  return { channel: name, priority, role, why, evidenceIds: asStrings(raw.evidenceIds) };
}

function territory(value: unknown): ReasonedTerritory | null {
  const raw = record(value);
  if (!raw) return null;
  const name = stringOf(raw.name);
  const idea = stringOf(raw.idea);
  if (!name || !idea) return null;
  return {
    id: slug(name),
    name,
    idea,
    audienceNeed: stringOf(raw.audienceNeed),
    purpose: stringOf(raw.purpose),
    risk: stringOf(raw.risk),
    evidenceIds: asStrings(raw.evidenceIds),
  };
}

function stage(value: unknown): ReasonedStage | null {
  const raw = record(value);
  if (!raw) return null;
  const objective = stringOf(raw.objective);
  if (!objective || isGenericStrategy(objective)) return null;
  return {
    id: slug(stringOf(raw.horizon) || objective),
    horizon: stringOf(raw.horizon) || "Unspecified",
    objective,
    why: stringOf(raw.why),
    actions: asStrings(raw.actions).slice(0, 4),
    success: stringOf(raw.success),
    evidenceIds: asStrings(raw.evidenceIds),
  };
}

function citeIds(value: unknown, known: Set<string>): string[] {
  return asStrings(value).filter((id) => known.has(id));
}

function confidence(value: unknown): StrategicObservation["confidence"] {
  return value === "high" || value === "low" ? value : "medium";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "item";
}

export function decisionOf(value: string | undefined): ManagerDecision {
  if (value === "approved" || value === "edited" || value === "rejected" || value === "investigate") return value;
  return "unreviewed";
}
