import type {
  DiscoverySession,
  NotStartedSection,
  PersonalityPole,
  SectionId,
} from "../types/discovery";
import { unanswered } from "./textEvidence";

function notStarted(): NotStartedSection {
  return { status: "not_started" };
}

function blankPole(): PersonalityPole {
  return { state: "unanswered", selected: [], custom: [], capturedAt: null };
}

function blankSteps(): Record<SectionId, number> {
  return { welcome: 0, business: 0, audience: 0, goals: 0, personality: 0 };
}

export function createSession(timestamp = new Date().toISOString()): DiscoverySession {
  return {
    id: crypto.randomUUID(),
    version: 1,
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
    personalitySpectrum: notStarted(),
    visualPreferences: notStarted(),
    colourPreferences: notStarted(),
    typographyPreferences: notStarted(),
    imageryPreferences: notStarted(),
    voicePreferences: notStarted(),
    inspiration: notStarted(),
    existingAssets: notStarted(),
    agentObservations: { status: "not_generated", items: [] },
    agentQuestions: { status: "not_generated", items: [] },
    discoveryProfile: { status: "not_compiled", managerInterpretation: [] },
  };
}
