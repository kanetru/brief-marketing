import type { Confidence, DecisionStatus, EpistemicStatus } from "./project";
import type { ChannelId, ChannelPriority } from "./strategy";

/** What the manager has done with a conclusion. Approval never changes epistemic status. */
export type ManagerDecision = "unreviewed" | "approved" | "edited" | "rejected" | "investigate";

export interface StrategicObservation {
  id: string;
  title: string;
  body: string;
  evidenceIds: string[];
  confidence: Confidence;
}

export interface StrategicTension {
  id: string;
  observation: string;
  sideA: string;
  sideB: string;
  whyItMatters: string;
  evidenceIds: string[];
  confidence: Confidence;
  epistemicStatus: EpistemicStatus;
  managerDecision: ManagerDecision;
}

export interface StrategicHypothesis {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: Confidence;
  epistemicStatus: "hypothesis";
  managerDecision: ManagerDecision;
}

export interface StrategicUnknown {
  id: string;
  question: string;
  whyItMatters: string;
}

export interface ReasonedChannel {
  channel: ChannelId;
  priority: ChannelPriority;
  role: string;
  why: string;
  evidenceIds: string[];
}

export interface ReasonedTerritory {
  id: string;
  name: string;
  idea: string;
  audienceNeed: string;
  purpose: string;
  risk: string;
  evidenceIds: string[];
}

export interface ReasonedStage {
  id: string;
  horizon: string;
  objective: string;
  why: string;
  actions: string[];
  success: string;
  evidenceIds: string[];
}

/** The strategist's reading. Prose first. Structure afterwards. */
export interface ClientStrategistOutput {
  clientRead: string;
  clientReadEvidenceIds: string[];
  observations: StrategicObservation[];
  tensions: StrategicTension[];
  hypotheses: StrategicHypothesis[];
  unknowns: StrategicUnknown[];
  positioning: {
    statement: string;
    evidenceIds: string[];
    epistemicStatus: "hypothesis";
    decisionStatus: DecisionStatus;
  };
  channels: ReasonedChannel[];
  territories: ReasonedTerritory[];
  roadmap: ReasonedStage[];
  assetNeeds: string[];
}

export type StrategistSource = "live_model" | "local_fallback";

export interface StoredClientReading {
  evidenceHash: string;
  source: StrategistSource;
  provider: string | null;
  model: string | null;
  generatedAt: string;
  output: ClientStrategistOutput;
  /** Approved lines the new reading disagrees with. The approved text is kept. */
  challenges: string[];
}

export interface ClientBrain {
  source: StrategistSource;
  provider: string | null;
  model: string | null;
  generatedAt: string | null;
  evidenceHash: string;
  stale: boolean;
  challenges: string[];
  output: ClientStrategistOutput;
}
