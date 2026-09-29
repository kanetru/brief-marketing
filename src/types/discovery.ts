/**
 * Discovery session model.
 *
 * Layers stay apart so a later API can store them in different tables
 * without untangling a mixed blob:
 *
 * - Raw client evidence: verbatim words the client typed.
 * - Structured selections: values chosen from a controlled vocabulary.
 * - Unresolved uncertainty: an explicit "I'm not sure", never an empty string.
 * - Agent observations and clarification questions. Written only by the analysis pass.
 * - Discovery profile: a derived handover. It never overwrites client answers.
 *
 * Navigation progress is session state, not evidence.
 */

export type IsoDateTime = string;

export type SectionId =
  | "welcome"
  | "business"
  | "audience"
  | "goals"
  | "personality"
  | "spectrum"
  | "visual"
  | "colour"
  | "type"
  | "imagery"
  | "voice"
  | "inspiration"
  | "clarify"
  | "profile"
  | "complete";

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

export type SpectrumDimensionId =
  | "playful_serious"
  | "traditional_progressive"
  | "understated_bold"
  | "raw_polished"
  | "familiar_exclusive"
  | "human_corporate";

/**
 * A spectrum answer.
 * `unanswered` means they have not touched it.
 * `neutral` is an explicit "neither really matters" — not the midpoint.
 * `selected` is a chosen position from 0 (left) to 100 (right).
 */
export type SpectrumAnswer =
  | { state: "unanswered" }
  | { state: "neutral"; capturedAt: IsoDateTime }
  | { state: "selected"; value: number; capturedAt: IsoDateTime };

/** Structured client evidence for one tension. Labels are what they were shown. */
export interface SpectrumDimensionEvidence {
  id: SpectrumDimensionId;
  leftLabel: string;
  rightLabel: string;
  answer: SpectrumAnswer;
}

export interface PersonalitySpectrumSection {
  dimensions: SpectrumDimensionEvidence[];
}

export type VisualTrait =
  | "editorial"
  | "organic"
  | "minimal"
  | "expressive"
  | "playful"
  | "technical"
  | "warm"
  | "cool"
  | "polished"
  | "raw"
  | "bold"
  | "restrained"
  | "classic"
  | "contemporary";

/** Catalogue scores copied onto the evidence so later rescoring still has the original board. */
export type VisualTraitScores = Record<VisualTrait, number>;

export type VisualChoice = "a" | "b" | "both" | "neither";

export interface VisualDirectionSnapshot {
  id: string;
  traits: VisualTraitScores;
}

/**
 * One pair the client was shown, plus what they did with it.
 * This is raw selection evidence, not an interpretation.
 */
export interface VisualComparisonEvidence {
  comparisonId: string;
  order: number;
  a: VisualDirectionSnapshot;
  b: VisualDirectionSnapshot;
  choice:
    | { state: "unanswered" }
    | { state: "selected"; value: VisualChoice; capturedAt: IsoDateTime };
}

export interface VisualPreferences {
  comparisons: VisualComparisonEvidence[];
}

export type ColourRelationship = "yes" | "sort_of" | "no";

/** A colour the client says they already use. Not a recommendation. */
export interface ExistingBrandColour {
  hex: string;
  capturedAt: IsoDateTime;
}

/**
 * Preference evidence about colour worlds.
 * Liking a palette is not an instruction to use it as the brand palette.
 */
export interface ColourPreferences {
  preferredPaletteIds: string[];
  avoidedPaletteIds: string[];
  preferredCapturedAt: IsoDateTime | null;
  avoidedCapturedAt: IsoDateTime | null;
  existingColourRelationship:
    | { state: "unanswered" }
    | { state: "selected"; value: ColourRelationship; capturedAt: IsoDateTime };
  existingBrandColours: ExistingBrandColour[];
}

export type TypographyDirectionId =
  | "editorial_serif"
  | "clean_sans"
  | "humanist_sans"
  | "bold_grotesk"
  | "classic_serif"
  | "expressive_display";

/**
 * Direction ids only. The font used to render a specimen lives in the catalogue
 * and can change without rewriting this evidence.
 */
export interface TypographyPreferences {
  preferredDirectionIds: TypographyDirectionId[];
  avoidedDirectionIds: TypographyDirectionId[];
  preferredCapturedAt: IsoDateTime | null;
  avoidedCapturedAt: IsoDateTime | null;
}

export type ImageryDirectionId =
  | "documentary"
  | "polished"
  | "editorial"
  | "people_first"
  | "detail_craft"
  | "atmospheric";

/** Preference evidence. Not a recommendation of what to publish. */
export interface ImageryPreferences {
  preferredDirectionIds: ImageryDirectionId[];
  avoidedDirectionIds: ImageryDirectionId[];
  preferredCapturedAt: IsoDateTime | null;
  avoidedCapturedAt: IsoDateTime | null;
}

/** A later collection step. Present so the document shape stays stable. */
export interface NotStartedSection {
  status: "not_started";
}

export type VoiceTrait =
  | "formal"
  | "conversational"
  | "reserved"
  | "expressive"
  | "technical"
  | "simple"
  | "confident"
  | "humble"
  | "polished"
  | "human"
  | "promotional"
  | "understated";

export type VoiceTraitScores = Record<VoiceTrait, number>;

export interface VoiceOptionSnapshot {
  id: string;
  text: string;
  traits: VoiceTraitScores;
}

/**
 * One voice round the client was shown.
 * `none` is an explicit rejection of every line, distinct from not answering.
 */
export interface VoiceComparisonEvidence {
  roundId: string;
  order: number;
  situation: string;
  options: VoiceOptionSnapshot[];
  choice:
    | { state: "unanswered" }
    | { state: "selected"; optionId: string; capturedAt: IsoDateTime }
    | { state: "none"; capturedAt: IsoDateTime };
}

/** Raw voice evidence. Not a tone-of-voice profile. */
export interface VoicePreferences {
  comparisons: VoiceComparisonEvidence[];
  /** Raw client evidence. */
  preferredLanguage: TextEvidenceAnswer;
  /** Raw client evidence. */
  avoidedLanguage: TextEvidenceAnswer;
}

/** A business, person, or account the client named. Not scraped. */
export interface InspirationReference {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  capturedAt: IsoDateTime;
}

export interface InspirationSection {
  positiveReferences: InspirationReference[];
  negativeReferences: InspirationReference[];
}

export type ObservationType =
  | "missing_information"
  | "tension"
  | "consistent_signal"
  | "explicit_uncertainty"
  | "possible_follow_up";

export type AgentConfidence = "low" | "medium" | "high";

/**
 * How an observation is allowed to speak.
 * Derived from observationType. The model is not required to send it.
 */
export type EpistemicStatus = "direct" | "derived_pattern" | "possible_tension" | "missing" | "explicit_uncertainty";

/**
 * A reading of client evidence. Not a fact about the brand.
 * `consistent_signal` means several choices point the same way, not that the brand is that thing.
 */
export interface AgentObservation {
  id: string;
  category: string;
  statement: string;
  evidenceReferences: string[];
  confidence: AgentConfidence;
  importance: AgentConfidence;
  observationType: ObservationType;
  /** Set by the quality gate. Absent on older sessions and on raw model JSON. */
  epistemicStatus?: EpistemicStatus;
}

export type AnalysisStatus = "not_generated" | "running" | "ready" | "failed";

export type AnalysisFailureCode = "not_configured" | "unavailable" | "invalid_response";

export interface AgentObservationLayer {
  status: AnalysisStatus;
  analysisVersion: string | null;
  provider: string | null;
  model: string | null;
  generatedAt: IsoDateTime | null;
  /** Safe code for development. Never a stack trace or a secret. */
  failureCode: AnalysisFailureCode | null;
  items: AgentObservation[];
  /** Model JSON before filtering. Development inspection only. */
  rawModelResponse: unknown;
  /** Evidence payload actually sent. Development inspection only. */
  evidenceSent: unknown;
}

export type AnswerMode = "free_text" | "single_choice";

export interface ClarificationOption {
  id: string;
  label: string;
}

/** A candidate the model proposed. Not yet a question the client sees. */
export interface CandidateQuestion {
  id: string;
  question: string;
  reason: string;
  targetEvidenceGap: string;
  relatedObservationIds: string[];
  answerMode: AnswerMode;
  options: ClarificationOption[];
  /** 1 is the model's highest priority. */
  priority: number;
}

export type ClarificationResponse =
  | { state: "unanswered" }
  | { state: "evidence"; text: string; capturedAt: IsoDateTime }
  | { state: "selected"; optionId: string; capturedAt: IsoDateTime }
  | { state: "uncertain"; reason: "manager_help"; capturedAt: IsoDateTime };

export interface SelectedQuestion extends CandidateQuestion {
  response: ClarificationResponse;
}

export interface AgentQuestionLayer {
  status: AnalysisStatus;
  /** Everything valid the model returned, before the cap. */
  candidates: CandidateQuestion[];
  /** The questions the client is actually asked. */
  selected: SelectedQuestion[];
  generatedAt: IsoDateTime | null;
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
 * How a profile statement is allowed to speak.
 * Shown as a kind of reading, never as a percentage.
 */
export type ProfileStatementStatus =
  | "direct"
  | "strong_pattern"
  | "possible_pattern"
  | "tension"
  | "explicit_uncertainty";

export interface ProfileStatement {
  id: string;
  type: string;
  statement: string;
  evidenceReferences: string[];
  confidence: AgentConfidence;
  status: ProfileStatementStatus;
}

export interface NarrativeSection {
  summary: string;
  statements: ProfileStatement[];
}

export interface ProfileClarification {
  id: string;
  question: string;
  response: "unanswered" | "text" | "selected" | "manager_help";
  detail: string | null;
}

export interface DiscussionPoint {
  id: string;
  prompt: string;
  evidenceReferences: string[];
}

/** Something the client explicitly rejected. Built from evidence, not from the model. */
export interface HardAvoid {
  label: string;
  detail: string;
  sourcePath: string;
}

/** Derived handover. Separate from the raw answers it was read from. */
export interface ProfileContent {
  businessSummary: NarrativeSection;
  audienceSummary: NarrativeSection;
  marketingGoals: NarrativeSection;
  personalitySummary: NarrativeSection;
  visualPreferences: NarrativeSection;
  colourPreferences: NarrativeSection;
  typographyPreferences: NarrativeSection;
  imageryPreferences: NarrativeSection;
  voicePreferences: NarrativeSection;
  inspirationSummary: NarrativeSection;
  strongSignals: ProfileStatement[];
  mixedSignals: ProfileStatement[];
  unresolvedQuestions: ProfileStatement[];
  discussionPoints: DiscussionPoint[];
  hardAvoids: HardAvoid[];
}

export interface RejectedProfileStatement {
  statement: string;
  code: string;
  reason: string;
}

export type ProfileSource = "model" | "fallback" | "refinement";

export type ProfileFeedbackResponse = "yes" | "mostly" | "not_really";

export interface ProfileFeedback {
  response: ProfileFeedbackResponse;
  note: string | null;
  capturedAt: IsoDateTime;
}

export interface DiscoveryProfileVersion {
  version: number;
  generatedAt: IsoDateTime;
  evidenceHash: string;
  source: ProfileSource;
  promptVersion: string | null;
  provider: string | null;
  model: string | null;
  content: ProfileContent;
  /** The client note that caused this revision. Empty on the first version. */
  feedback: ProfileFeedback | null;
  rawModelResponse: unknown;
  rejectedStatements: RejectedProfileStatement[];
  usedFallback: boolean;
}

export type ProfileStatus = "not_compiled" | "running" | "ready" | "refining";

export interface DiscoveryProfile {
  status: ProfileStatus;
  activeVersion: number | null;
  versions: DiscoveryProfileVersion[];
  clientFeedback: ProfileFeedback | null;
  /** Why the model was skipped, when the shown profile was assembled from answers. */
  failureCode: AnalysisFailureCode | null;
  managerInterpretation: ManagerInterpretation[];
}

export interface DiscoverySession {
  id: string;
  version: 3;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  agency: AgencyRef;
  progress: SessionProgress;
  business: BusinessSection;
  audience: AudienceSection;
  goals: GoalsSection;
  personality: PersonalitySection;
  personalitySpectrum: PersonalitySpectrumSection;
  visualPreferences: VisualPreferences;
  colourPreferences: ColourPreferences;
  typographyPreferences: TypographyPreferences;
  imageryPreferences: ImageryPreferences;
  voicePreferences: VoicePreferences;
  inspiration: InspirationSection;
  existingAssets: NotStartedSection;
  agentObservations: AgentObservationLayer;
  agentQuestions: AgentQuestionLayer;
  discoveryProfile: DiscoveryProfile;
}

export type BusinessTextField = "name" | "description" | "peopleComeFor" | "differentiation";
