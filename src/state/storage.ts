import { stepCount } from "../domain/sections";
import type {
  ColourPreferences,
  DiscoverySession,
  ImageryPreferences,
  PersonalitySpectrumSection,
  SectionId,
  TypographyPreferences,
  VisualPreferences,
} from "../types/discovery";
import { createSession } from "./createSession";

export const STORAGE_KEY = "lover-lover.discovery-session.v2";
const LEGACY_KEY = "lover-lover.discovery-session.v1";

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

/** Keep older sessions and fill any collection areas this version introduced. */
export function migrateSession(value: unknown): DiscoverySession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 && raw.version !== 2) return null;
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
    version: 2,
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
    colourPreferences: isColour(record.colourPreferences) ? record.colourPreferences : fresh.colourPreferences,
    typographyPreferences: isType(record.typographyPreferences) ? record.typographyPreferences : fresh.typographyPreferences,
    imageryPreferences: isImagery(record.imageryPreferences) ? record.imageryPreferences : fresh.imageryPreferences,
    voicePreferences: record.voicePreferences ?? fresh.voicePreferences,
    inspiration: record.inspiration ?? fresh.inspiration,
    existingAssets: record.existingAssets ?? fresh.existingAssets,
    agentObservations: record.agentObservations ?? fresh.agentObservations,
    agentQuestions: record.agentQuestions ?? fresh.agentQuestions,
    discoveryProfile: record.discoveryProfile ?? fresh.discoveryProfile,
  };
}

export function loadSession(): DiscoverySession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
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
