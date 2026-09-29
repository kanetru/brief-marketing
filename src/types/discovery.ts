/**
 * Discovery session model.
 *
 * Layers stay apart so a later API can store them in different tables
 * without untangling a mixed blob:
 *
 * - Raw client evidence: verbatim words the client typed.
 * - Structured selections: values chosen from a controlled vocabulary.
 * - Unresolved uncertainty: an explicit "I'm not sure", never an empty string.
 * - AI-derived observations: agentObservations / agentQuestions. Empty here.
 * - Media-manager interpretation: discoveryProfile.managerInterpretation. Empty here.
 *
 * Navigation progress is session state, not evidence.
 */

export type IsoDateTime = string;

export type SectionId = "welcome" | "business" | "audience" | "goals" | "personality";

export interface AgencyRef {
  id: "lover-lover";
  name: "Lover Lover";
}

/** Where the client is in the conversation. Not evidence and not an observation. */
export interface SessionProgress {
  section: SectionId;
  /** Step index remembered per section so moving backward keeps their place. */
  steps: Record<SectionId, number>;
  /** Furthest section opened. Drives which progress marks can be revisited. */
  furthest: SectionId;
}

/** Verbatim client words. */
export interface ClientTextEvidence {
  raw: string;
  capturedAt: IsoDateTime;
}

/** A free-text answer. Empty input stays unanswered — it is not stored as "". */
export type TextEvidenceAnswer =
  | { state: "unanswered" }
  | { state: "evidence"; evidence: ClientTextEvidence };

/**
 * Free text, or an explicit admission that the client doesn't know.
 * Unknown is a state, not a blank string.
 */
export type TextEvidenceOrUncertain =
  | TextEvidenceAnswer
  | { state: "uncertain"; reason: "not_sure"; capturedAt: IsoDateTime };

export interface BusinessSection {
  /** Raw client evidence. */
  name: TextEvidenceAnswer;
  /** Raw client evidence. */
  description: TextEvidenceAnswer;
  /** Raw client evidence. What people actually come to them for. */
  peopleComeFor: TextEvidenceAnswer;
  /** Raw evidence, or explicit uncertainty. */
  differentiation: TextEvidenceOrUncertain;
}

/**
 * Desired audience is stored separately from current audience.
 * `same_as_current` is a structured selection (a pointer, not a copied paragraph).
 * `uncertain` is unresolved uncertainty.
 */
export type DesiredAudienceAnswer =
  | { state: "unanswered" }
  | { state: "evidence"; evidence: ClientTextEvidence }
  | { state: "same_as_current"; capturedAt: IsoDateTime }
  | { state: "uncertain"; reason: "not_sure"; capturedAt: IsoDateTime };

export interface AudienceSection {
  /** Raw client evidence. */
  bestCustomers: TextEvidenceAnswer;
  desiredCustomers: DesiredAudienceAnswer;
}

export type MarketingOutcome =
  | "generate_enquiries"
  | "increase_sales"
  | "build_awareness"
  | "build_trust"
  | "educate_people"
  | "build_a_community"
  | "launch_something"
  | "reach_a_new_audience"
  | "show_our_work"
  | "stay_visible"
  | "something_else";

/** Structured multi-select. Click order is preserved. */
export interface GoalSelection {
  state: "unanswered" | "selected";
  selected: MarketingOutcome[];
  capturedAt: IsoDateTime | null;
}

export interface GoalsSection {
  /** Structured selections. The UI allows at most three. */
  outcomes: GoalSelection;
  /**
   * Raw client evidence for the something_else selection.
   * Meaningful when `something_else` is among outcomes.selected.
   */
  somethingElse: TextEvidenceAnswer;
  /** Raw client evidence. */
  twelveMonthSuccess: TextEvidenceAnswer;
}

export type PersonalityTrait =
  | "warm"
  | "knowledgeable"
  | "bold"
  | "playful"
  | "natural"
  | "refined"
  | "rebellious"
  | "technical"
  | "traditional"
  | "progressive"
  | "dependable"
  | "energetic"
  | "calm"
  | "premium"
  | "accessible"
  | "creative"
  | "practical"
  | "human";

export type PersonalityPoleId = "attract" | "avoid";

/**
 * One side of the personality contrast.
 * `selected` is the controlled vocabulary. `custom` is client-authored.
 */
export interface PersonalityPole {
  state: "unanswered" | "selected";
  selected: PersonalityTrait[];
  custom: string[];
  capturedAt: IsoDateTime | null;
}

export interface PersonalitySection {
  /** How they should feel. Structured selections plus custom words. */
  attract: PersonalityPole;
  /** How they should not feel. Same shape, kept as its own set. */
  avoid: PersonalityPole;
}

/** A later collection step. Present so the document shape stays stable. */
export interface NotStartedSection {
  status: "not_started";
}

/** A future AI reading of the evidence. Not a fact about the client. */
export interface AgentObservation {
  id: string;
  /** Evidence path this reading is based on, e.g. "business.differentiation". */
  subject: string;
  statement: string;
  confidence: "low" | "medium" | "high";
  basedOn: string[];
  createdAt: IsoDateTime;
}

export interface AgentObservationLayer {
  status: "not_generated";
  items: AgentObservation[];
}

/** A follow-up an agent might ask. Not client evidence. */
export interface AgentQuestion {
  id: string;
  prompt: string;
  reason: string;
  relatedEvidence: string[];
  status: "open" | "resolved" | "dismissed";
}

export interface AgentQuestionLayer {
  status: "not_generated";
  items: AgentQuestion[];
}

/** The media manager's own reading. Never written by the client flow. */
export interface ManagerInterpretation {
  id: string;
  authorId: string;
  subject: string;
  note: string;
  createdAt: IsoDateTime;
}

/**
 * Compiled later from evidence, observations, and manager interpretation.
 * This prototype does not produce one.
 */
export interface DiscoveryProfile {
  status: "not_compiled";
  managerInterpretation: ManagerInterpretation[];
}

export interface DiscoverySession {
  id: string;
  version: 1;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  agency: AgencyRef;
  progress: SessionProgress;
  business: BusinessSection;
  audience: AudienceSection;
  goals: GoalsSection;
  personality: PersonalitySection;
  personalitySpectrum: NotStartedSection;
  visualPreferences: NotStartedSection;
  colourPreferences: NotStartedSection;
  typographyPreferences: NotStartedSection;
  imageryPreferences: NotStartedSection;
  voicePreferences: NotStartedSection;
  inspiration: NotStartedSection;
  existingAssets: NotStartedSection;
  agentObservations: AgentObservationLayer;
  agentQuestions: AgentQuestionLayer;
  discoveryProfile: DiscoveryProfile;
}

export type BusinessTextField = "name" | "description" | "peopleComeFor" | "differentiation";
