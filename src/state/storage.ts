import { stepCount } from "../domain/sections";
import type {
  AgentObservationLayer,
  AgentQuestionLayer,
  ColourPreferences,
  DiscoverySession,
  ImageryPreferences,
  InspirationSection,
  PersonalitySpectrumSection,
  SectionId,
  TypographyPreferences,
  VisualPreferences,
  VoicePreferences,
} from "../types/discovery";
import { blankObservations, blankProfile, blankQuestions, createSession } from "./createSession";

export const STORAGE_KEY = "lover-lover.discovery-session.v3";
const LEGACY_KEYS = ["lover-lover.discovery-session.v2", "lover-lover.discovery-session.v1"];

const SECTION_IDS: readonly SectionId[] = [
  "welcome",
  "business",
  "audience",
  "goals",
  "personality",
  "spectrum",
  "visual",
  "colour",
  "type",
  "imagery",
  "voice",
  "inspiration",
  "clarify",
  "profile",
  "complete",
];

function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && SECTION_IDS.includes(value as SectionId);
}

function isSpectrum(value: unknown): value is PersonalitySpectrumSection {
  return !!value && typeof value === "object" && Array.isArray((value as PersonalitySpectrumSection).dimensions);
}

function isVisual(value: unknown): value is VisualPreferences {
  return !!value && typeof value === "object" && Array.isArray((value as VisualPreferences).comparisons);
}

function isColour(value: unknown): value is ColourPreferences {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ColourPreferences>;
  return Array.isArray(record.preferredPaletteIds) && Array.isArray(record.existingBrandColours);
}

function isType(value: unknown): value is TypographyPreferences {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as TypographyPreferences).preferredDirectionIds);
}

function isImagery(value: unknown): value is ImageryPreferences {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as ImageryPreferences).preferredDirectionIds);
}

function isVoice(value: unknown): value is VoicePreferences {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<VoicePreferences>;
  return Array.isArray(record.comparisons) && !!record.preferredLanguage && !!record.avoidedLanguage;
}

function isInspiration(value: unknown): value is InspirationSection {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<InspirationSection>;
  return Array.isArray(record.positiveReferences) && Array.isArray(record.negativeReferences);
}

function isObservationLayer(value: unknown): value is AgentObservationLayer {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AgentObservationLayer>;
  return typeof record.status === "string" && Array.isArray(record.items) && "failureCode" in record;
}

function isQuestionLayer(value: unknown): value is AgentQuestionLayer {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AgentQuestionLayer>;
  return typeof record.status === "string" && Array.isArray(record.selected) && Array.isArray(record.candidates);
}

function mergeSpectrum(existing: unknown, fresh: PersonalitySpectrumSection): PersonalitySpectrumSection {
  if (!isSpectrum(existing)) return fresh;
  return {
    dimensions: fresh.dimensions.map((dimension) => {
      const found = existing.dimensions.find((item) => item?.id === dimension.id);
      if (!found || !found.answer) return dimension;
      return {
        id: dimension.id,
        leftLabel: typeof found.leftLabel === "string" ? found.leftLabel : dimension.leftLabel,
        rightLabel: typeof found.rightLabel === "string" ? found.rightLabel : dimension.rightLabel,
        answer: found.answer,
      };
    }),
  };
}

function mergeVisual(existing: unknown, fresh: VisualPreferences): VisualPreferences {
  if (!isVisual(existing)) return fresh;
  const known = new Map(existing.comparisons.map((comparison) => [comparison.comparisonId, comparison]));
  return {
    comparisons: fresh.comparisons.map((comparison) => known.get(comparison.comparisonId) ?? comparison),
  };
}

function mergeVoice(existing: unknown, fresh: VoicePreferences): VoicePreferences {
  if (!isVoice(existing)) return fresh;
  const known = new Map(existing.comparisons.map((round) => [round.roundId, round]));
  return {
    comparisons: fresh.comparisons.map((round) => known.get(round.roundId) ?? round),
    preferredLanguage: existing.preferredLanguage,
    avoidedLanguage: existing.avoidedLanguage,
  };
}

/** Keep older sessions and fill any collection areas this version introduced. */
export function migrateSession(value: unknown): DiscoverySession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) return null;
  const record = value as Partial<DiscoverySession>;
  if (!record.business || !record.audience || !record.goals || !record.personality || !record.progress) {
    return null;
  }
  if (typeof record.id !== "string") return null;

  const fresh = createSession(typeof record.createdAt === "string" ? record.createdAt : undefined);
  const priorSteps = record.progress.steps ?? {};
  const steps = { ...fresh.progress.steps };
  for (const section of SECTION_IDS) {
    const stored = priorSteps[section];
    if (typeof stored === "number" && Number.isFinite(stored)) {
      steps[section] = Math.max(0, Math.min(stored, stepCount(section) - 1));
    }
  }

  return {
    ...fresh,
    id: record.id,
    version: 3,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : fresh.createdAt,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : fresh.updatedAt,
    progress: {
      section: isSectionId(record.progress.section) ? record.progress.section : "welcome",
      furthest: isSectionId(record.progress.furthest) ? record.progress.furthest : "welcome",
      steps,
    },
    business: record.business,
    audience: record.audience,
    goals: record.goals,
    personality: record.personality,
    personalitySpectrum: mergeSpectrum(record.personalitySpectrum, fresh.personalitySpectrum),
    visualPreferences: mergeVisual(record.visualPreferences, fresh.visualPreferences),
    colourPreferences: mergeColour(record.colourPreferences, fresh.colourPreferences),
    typographyPreferences: mergeType(record.typographyPreferences, fresh.typographyPreferences),
    imageryPreferences: isImagery(record.imageryPreferences) ? record.imageryPreferences : fresh.imageryPreferences,
    voicePreferences: mergeVoice(record.voicePreferences, fresh.voicePreferences),
    inspiration: isInspiration(record.inspiration) ? record.inspiration : fresh.inspiration,
    existingAssets: record.existingAssets ?? fresh.existingAssets,
    agentObservations: isObservationLayer(record.agentObservations) ? record.agentObservations : blankObservations(),
    agentQuestions: isQuestionLayer(record.agentQuestions) ? record.agentQuestions : blankQuestions(),
    discoveryProfile: normaliseProfile(record.discoveryProfile, fresh.discoveryProfile),
    territoryFeedback: normaliseTerritoryFeedback(record.territoryFeedback, fresh.territoryFeedback),
    strategist: normaliseStrategist(record.strategist, fresh.strategist),
  };
}

const COLOUR_PUSHES = ["warmer", "darker", "cleaner", "stranger", "brighter", "quieter"];

function mergeColour(value: unknown, fresh: ColourPreferences): ColourPreferences {
  if (!isColour(value)) return fresh;
  const push = (value as { colourPush?: unknown }).colourPush;
  return {
    ...fresh,
    ...value,
    colourPush: typeof push === "string" && COLOUR_PUSHES.includes(push) ? (push as ColourPreferences["colourPush"]) : null,
  };
}

function mergeType(value: unknown, fresh: TypographyPreferences): TypographyPreferences {
  if (!isType(value)) return fresh;
  const record = value as TypographyPreferences & { worldIds?: unknown; refinementIds?: unknown };
  return {
    ...fresh,
    ...value,
    worldIds: stringList(record.worldIds),
    refinementIds: stringList(record.refinementIds),
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normaliseStrategist(value: unknown, fresh: DiscoverySession["strategist"]): DiscoverySession["strategist"] {
  if (!value || typeof value !== "object") return fresh;
  const record = value as Partial<DiscoverySession["strategist"]>;
  const status = record.status === "running" || record.status === "ready" || record.status === "failed" || record.status === "idle" ? record.status : "idle";
  const reading = record.reading && typeof record.reading === "object" && Array.isArray(record.reading.territories) ? record.reading : null;
  return {
    status: reading ? status : status === "ready" ? "failed" : status,
    evidenceHash: typeof record.evidenceHash === "string" ? record.evidenceHash : null,
    reading,
    failureCode: typeof record.failureCode === "string" ? record.failureCode : null,
  };
}

function normaliseTerritoryFeedback(
  value: unknown,
  fresh: DiscoverySession["territoryFeedback"],
): DiscoverySession["territoryFeedback"] {
  if (!value || typeof value !== "object") return fresh;
  const record = value as Partial<DiscoverySession["territoryFeedback"]>;
  const reactions = Array.isArray(record.reactions)
    ? record.reactions.filter(
        (item) =>
          !!item &&
          typeof item === "object" &&
          typeof item.territoryId === "string" &&
          (item.response === "very_close" || item.response === "something_here" || item.response === "not_for_us"),
      )
    : [];
  return {
    reactions: reactions.map((item) => ({
      territoryId: item.territoryId,
      response: item.response,
      note: typeof item.note === "string" ? item.note : "",
    })),
    preference: typeof record.preference === "string" ? record.preference : null,
    capturedAt: typeof record.capturedAt === "string" ? record.capturedAt : null,
  };
}

function normaliseProfile(value: unknown, fresh: DiscoverySession["discoveryProfile"]): DiscoverySession["discoveryProfile"] {
  if (!value || typeof value !== "object") return fresh;
  const record = value as Partial<DiscoverySession["discoveryProfile"]>;
  const managerInterpretation = Array.isArray(record.managerInterpretation) ? record.managerInterpretation : [];
  if (!Array.isArray(record.versions) || record.versions.some((version) => !version || typeof version !== "object" || !("content" in version))) {
    return { ...blankProfile(), managerInterpretation };
  }
  const status = record.status;
  return {
    status: status === "running" || status === "ready" || status === "refining" || status === "not_compiled" ? status : "not_compiled",
    activeVersion: typeof record.activeVersion === "number" ? record.activeVersion : null,
    versions: record.versions,
    clientFeedback: record.clientFeedback ?? null,
    failureCode: record.failureCode ?? null,
    managerInterpretation,
  };
}

export function loadSession(): DiscoverySession {
  try {
    const raw = [STORAGE_KEY, ...LEGACY_KEYS].map((key) => localStorage.getItem(key)).find((value) => value !== null);
    if (!raw) return createSession();
    const parsed: unknown = JSON.parse(raw);
    return migrateSession(parsed) ?? createSession();
  } catch {
    return createSession();
  }
}

export function saveSession(session: DiscoverySession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
