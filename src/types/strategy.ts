import type { TextEvidenceAnswer, TextEvidenceOrUncertain } from "./discovery";
import type { Confidence, DecisionStatus, EpistemicStatus } from "./project";

export type OfferRole = "core" | "growth" | "secondary" | "legacy";
export type OfferImportance = "primary" | "meaningful" | "occasional";
export type PriceBand = "" | "under_500" | "500_5k" | "5k_25k" | "25k_plus" | "prefer_not";

export interface OfferInput {
  id: string;
  name: string;
  role: OfferRole;
  importance: OfferImportance;
  priceBand: PriceBand;
  buyer: string;
  context: string;
}

export type CommercialWant =
  | "more_volume"
  | "higher_value"
  | "more_repeat"
  | "particular_offer"
  | "new_audience"
  | "new_market"
  | "better_fit"
  | "something_else";

export type LeanSignal =
  | "expertise"
  | "personality"
  | "aesthetics"
  | "results"
  | "proof"
  | "trust"
  | "convenience"
  | "status"
  | "shared_values"
  | "price"
  | "community"
  | "technical_depth"
  | "speed"
  | "other";

export type AwarenessState =
  | "unaware"
  | "problem_aware"
  | "solution_aware"
  | "provider_aware"
  | "comparing"
  | "ready";

export type ChannelId =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "email"
  | "search"
  | "website"
  | "events"
  | "partnerships";

export type WorkingSignal = "enquiries" | "referrals" | "reach" | "engagement" | "repeat" | "nothing" | "unknown";

export type Makeable =
  | "photography"
  | "short_video"
  | "talking_head"
  | "articles"
  | "education"
  | "customer_stories"
  | "case_studies"
  | "process_footage"
  | "audio"
  | "graphics"
  | "email";

export type TimeBand = "under_2h" | "half_day" | "a_day" | "more" | "unknown";

export type ConstraintId =
  | "no_face"
  | "limited_photo"
  | "compliance"
  | "privacy"
  | "seasonal"
  | "long_cycle"
  | "tiny_team"
  | "approvals"
  | "capacity";

export type Capacity = "room" | "tight" | "full" | "unknown";

export type ProofKind =
  | "testimonials"
  | "case_studies"
  | "years"
  | "results"
  | "expertise"
  | "qualifications"
  | "awards"
  | "methodology"
  | "repeat_customers"
  | "partnerships"
  | "guarantees"
  | "material"
  | "process"
  | "founder";

export type NeighbourKind = "brands" | "people" | "publications" | "places" | "events" | "communities";

/** Raw material from the client. Strategy is derived from this, not stored here. */
export interface StrategyInputs {
  offers: OfferInput[];
  want: CommercialWant[];
  wantNote: TextEvidenceAnswer;
  whyExist: TextEvidenceOrUncertain;
  whatWasMissing: TextEvidenceAnswer;
  whatGetsBetter: TextEvidenceAnswer;
  refuse: TextEvidenceAnswer;
  differently: TextEvidenceAnswer;
  embarrassed: TextEvidenceAnswer;
  situation: TextEvidenceAnswer;
  afterwards: TextEvidenceAnswer;
  hesitate: TextEvidenceAnswer;
  hateAlternatives: TextEvidenceAnswer;
  lean: LeanSignal[];
  leanNote: TextEvidenceAnswer;
  awareness: AwarenessState | null;
  goalFollowUp: TextEvidenceAnswer;
  capacity: Capacity | null;
  active: ChannelId[];
  working: WorkingSignal[];
  chore: TextEvidenceAnswer;
  canMake: Makeable[];
  whoCreates: TextEvidenceAnswer;
  time: TimeBand | null;
  constraints: ConstraintId[];
  hear: TextEvidenceAnswer;
  beforeContact: TextEvidenceAnswer;
  mustBelieve: TextEvidenceAnswer;
  stopsThem: TextEvidenceAnswer;
  afterBuy: TextEvidenceAnswer;
  comeBack: TextEvidenceAnswer;
  proofKinds: ProofKind[];
  proofAvailable: TextEvidenceAnswer;
  neighbourKinds: NeighbourKind[];
  neighbours: TextEvidenceAnswer;
  wrongCompany: TextEvidenceAnswer;
}

export type StrategyTextField = {
  [K in keyof StrategyInputs]: StrategyInputs[K] extends TextEvidenceAnswer | TextEvidenceOrUncertain ? K : never;
}[keyof StrategyInputs];

export type StrategyListField = {
  [K in keyof StrategyInputs]: StrategyInputs[K] extends readonly string[] ? K : never;
}[keyof StrategyInputs];

export interface MarketingGoal {
  id: string;
  desiredOutcome: string;
  outcomeType: "qualitative" | "quantitative";
  baseline: string;
  target: string;
  targetDate: string;
  audience: string;
  commercialImportance: string;
  constraints: string[];
  evidenceIds: string[];
  confidence: Confidence;
  managerApproved: boolean;
}

export interface AudiencePsychology {
  situation: string;
  desiredOutcome: string;
  frustrations: string;
  anxieties: string;
  objections: string;
  motivations: string;
  buyingTriggers: string;
  trustSignals: string;
  attractionSignals: string[];
  alternatives: string;
  customerLanguage: string;
  awarenessState: AwarenessState | "unknown";
  identitySignals: string;
  evidenceIds: string[];
}

export interface JourneyStage {
  id: string;
  stage: string;
  customerState: string;
  tension: string;
  proof: string;
  content: string;
  channel: string;
  next: string;
  evidenceIds: string[];
}

export type ChannelPriority = "primary" | "secondary" | "test" | "maintain" | "deprioritise" | "not_now";

export interface ChannelRecommendation {
  channel: ChannelId;
  priority: ChannelPriority;
  role: string;
  why: string;
  forWhom: string;
  goal: string;
  strength: string;
  limitation: string;
  success: string;
  needs: string[];
  evidenceIds: string[];
}

export interface ContentTerritory {
  id: string;
  name: string;
  idea: string;
  audienceNeed: string;
  purpose: string;
  evidenceIds: string[];
  themes: string[];
  formats: string[];
  channels: ChannelId[];
  assets: string[];
  proof: string;
  risk: string;
}

export interface LanguageModel {
  owned: string[];
  customer: string[];
  category: string[];
  search: string[];
  cliches: string[];
  avoid: string[];
}

export interface BrandStory {
  context: string;
  belief: string;
  origin: string;
  response: string;
  difference: string;
  proof: string;
  future: string;
  evidenceIds: string[];
}

export interface RoadmapStage {
  id: "m3" | "m6" | "m9" | "m12";
  horizon: "3 months" | "6 months" | "9 months" | "12 months";
  phase: "Foundation" | "Consistency" | "Proof" | "Outcome";
  marker: "Now" | "Build" | "Prove" | "Outcome";
  objective: string;
  why: string;
  actions: string[];
  dependencies: string[];
  evidenceIds: string[];
  success: string;
  status: DecisionStatus;
}

export interface SocialPositioning {
  statement: string;
  epistemicStatus: EpistemicStatus;
  decisionStatus: DecisionStatus;
  evidenceIds: string[];
}

export interface StrategicPlan {
  objective: string;
  constraint: string;
  goals: MarketingGoal[];
  audience: AudiencePsychology;
  positioning: SocialPositioning;
  story: BrandStory;
  journey: JourneyStage[];
  channels: ChannelRecommendation[];
  territories: ContentTerritory[];
  language: LanguageModel;
  proof: { have: string[]; gaps: string[]; evidenceIds: string[] };
  collaborations: { fits: string; wrong: string; kinds: NeighbourKind[]; evidenceIds: string[] };
  roadmap: RoadmapStage[];
  assets: string[];
  openQuestions: string[];
  risks: string[];
  nextPriority: string;
}
