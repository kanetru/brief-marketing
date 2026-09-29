import { blankSpectrumDimensions } from "../domain/spectrum";
import { VISUAL_COMPARISON_PAIRS, snapshotDirection } from "../domain/visualDirections";
import { VOICE_ROUNDS, snapshotVoiceOption } from "../domain/voice";
import type {
  AgentObservationLayer,
  AgentQuestionLayer,
  ColourPreferences,
  DiscoverySession,
  ImageryPreferences,
  InspirationSection,
  NotStartedSection,
  PersonalityPole,
  SectionId,
  TypographyPreferences,
  VisualPreferences,
  VoicePreferences,
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
    voice: 0,
    inspiration: 0,
    clarify: 0,
    complete: 0,
  };
}

export function blankObservations(): AgentObservationLayer {
  return {
    status: "not_generated",
    analysisVersion: null,
    provider: null,
    model: null,
    generatedAt: null,
    failureCode: null,
    items: [],
    rawModelResponse: null,
    evidenceSent: null,
  };
}

export function blankQuestions(): AgentQuestionLayer {
  return {
    status: "not_generated",
    candidates: [],
    selected: [],
    generatedAt: null,
  };
}

function blankVoice(): VoicePreferences {
  return {
    comparisons: VOICE_ROUNDS.map((round, index) => ({
      roundId: round.id,
      order: index + 1,
      situation: round.situation,
      options: round.options.map(snapshotVoiceOption),
      choice: { state: "unanswered" },
    })),
    preferredLanguage: unanswered(),
    avoidedLanguage: unanswered(),
  };
}

function blankInspiration(): InspirationSection {
  return { positiveReferences: [], negativeReferences: [] };
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
    version: 3,
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
    voicePreferences: blankVoice(),
    inspiration: blankInspiration(),
    existingAssets: notStarted(),
    agentObservations: blankObservations(),
    agentQuestions: blankQuestions(),
    discoveryProfile: { status: "not_compiled", managerInterpretation: [] },
  };
}
