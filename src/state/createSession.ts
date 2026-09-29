import { VISUAL_COMPARISON_PAIRS, snapshotDirection } from "../domain/visualDirections";
import { blankSpectrumDimensions } from "../domain/spectrum";
import type {
  ColourPreferences,
  DiscoverySession,
  ImageryPreferences,
  NotStartedSection,
  PersonalityPole,
  SectionId,
  TypographyPreferences,
  VisualPreferences,
} from "../types/discovery";
import { unanswered } from "./textEvidence";

function notStarted(): NotStartedSection {
  return { status: "not_started" };
}

function blankPole(): PersonalityPole {
  return { state: "unanswered", selected: [], custom: [], capturedAt: null };
}

function blankSteps(): Record<SectionId, number> {
  return {
    welcome: 0,
    business: 0,
    audience: 0,
    goals: 0,
    personality: 0,
    spectrum: 0,
    visual: 0,
    colour: 0,
    type: 0,
    imagery: 0,
  };
}

function blankVisual(): VisualPreferences {
  return {
    comparisons: VISUAL_COMPARISON_PAIRS.map((pair, index) => ({
      comparisonId: pair.id,
      order: index + 1,
      a: snapshotDirection(pair.a),
      b: snapshotDirection(pair.b),
      choice: { state: "unanswered" },
    })),
  };
}

function blankColour(): ColourPreferences {
  return {
    preferredPaletteIds: [],
    avoidedPaletteIds: [],
    preferredCapturedAt: null,
    avoidedCapturedAt: null,
    existingColourRelationship: { state: "unanswered" },
    existingBrandColours: [],
  };
}

function blankType(): TypographyPreferences {
  return {
    preferredDirectionIds: [],
    avoidedDirectionIds: [],
    preferredCapturedAt: null,
    avoidedCapturedAt: null,
  };
}

function blankImagery(): ImageryPreferences {
  return {
    preferredDirectionIds: [],
    avoidedDirectionIds: [],
    preferredCapturedAt: null,
    avoidedCapturedAt: null,
  };
}

export function createSession(timestamp = new Date().toISOString()): DiscoverySession {
  return {
    id: crypto.randomUUID(),
    version: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    agency: { id: "lover-lover", name: "Lover Lover" },
    progress: {
      section: "welcome",
      steps: blankSteps(),
      furthest: "welcome",
    },
    business: {
      name: unanswered(),
      description: unanswered(),
      peopleComeFor: unanswered(),
      differentiation: unanswered(),
    },
    audience: {
      bestCustomers: unanswered(),
      desiredCustomers: { state: "unanswered" },
    },
    goals: {
      outcomes: { state: "unanswered", selected: [], capturedAt: null },
      somethingElse: unanswered(),
      twelveMonthSuccess: unanswered(),
    },
    personality: {
      attract: blankPole(),
      avoid: blankPole(),
    },
    personalitySpectrum: { dimensions: blankSpectrumDimensions() },
    visualPreferences: blankVisual(),
    colourPreferences: blankColour(),
    typographyPreferences: blankType(),
    imageryPreferences: blankImagery(),
    voicePreferences: notStarted(),
    inspiration: notStarted(),
    existingAssets: notStarted(),
    agentObservations: { status: "not_generated", items: [] },
    agentQuestions: { status: "not_generated", items: [] },
    discoveryProfile: { status: "not_compiled", managerInterpretation: [] },
  };
}
