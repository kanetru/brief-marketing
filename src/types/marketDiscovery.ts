import type { DecisionStatus, EpistemicStatus } from "./project";

/** How Brief should treat an account operationally. Irrelevant stays out of the review. */
export type MarketAccountType =
  | "direct_competitor"
  | "indirect_competitor"
  | "market_reference"
  | "watch_account"
  | "emerging_account"
  | "irrelevant";

export type SocialPlatform = "instagram" | "tiktok";

export type DiscoveryQueryType =
  | "category"
  | "offer"
  | "customer_problem"
  | "customer_language"
  | "geography"
  | "hashtag"
  | "adjacent_category"
  | "client_named";

export type SocialProviderStatus = "live" | "cached" | "stale" | "demo" | "unavailable";

export type DiscoveryUsagePurpose = "discovery_search" | "candidate_profile" | "candidate_posts";

/**
 * What Brief already knows. Built from the brand brain and discovery.
 * It is a view, not a second brain.
 */
export interface CompetitorDiscoveryContext {
  clientId: string;
  clientName: string;
  whatTheyDo: string;
  category: string;
  offers: string;
  highValueOffers: string;
  audience: string;
  customerProblems: string;
  customerLanguage: string;
  geography: string;
  positioning: string;
  differentiation: string;
  contentThemes: string;
  knownCompetitors: string[];
  knownMarketReferences: string[];
  websiteResearch: string;
  discoveryEvidence: string[];
  managerNotes: string;
  brandBrainVersion: string;
}

export interface SocialDiscoveryQuery {
  id: string;
  query: string;
  platform: SocialPlatform;
  queryType: DiscoveryQueryType;
  rationale: string;
}

export interface MarketDiscoverySet {
  clientId: string;
  queries: SocialDiscoveryQuery[];
  /** Queries actually sent to the provider. The rest stay saved. */
  executedQueryIds: string[];
  generatedAt: string;
  brandBrainVersion: string;
  approvedByManager: boolean;
}

export interface NormalizedSocialPost {
  platform: SocialPlatform;
  postId: string;
  accountId: string;
  publishedAt: string | null;
  caption: string | null;
  hashtags: string[];
  mentions: string[];
  mediaType: "image" | "video" | "carousel" | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  shares: number | null;
  url: string | null;
  retrievedAt: string;
}

export interface SocialAccountCandidate {
  id: string;
  platform: SocialPlatform;
  handle: string;
  displayName: string;
  bio: string;
  profileUrl: string;
  website: string;
  followers: number | null;
  following: number | null;
  recentPosts: NormalizedSocialPost[];
  sourceQueries: string[];
  discoveryFrequency: number;
  providerStatus: SocialProviderStatus;
  retrievedAt: string;
  /** Present when the client named this business. The research does not replace the statement. */
  clientClaim: string;
  enriched: boolean;
}

export interface EvidenceReference {
  id: string;
  kind: "search" | "profile" | "post" | "client_statement";
  label: string;
}

export interface MarketAccountAssessment {
  candidateId: string;
  classification: MarketAccountType;
  /** The model inference. A manager reclassification does not overwrite this. */
  machineClassification: MarketAccountType;
  relevance: "high" | "moderate" | "low";
  summary: string;
  whyItMatters: string;
  overlap: {
    offer: string;
    audience: string;
    geography: string;
    category: string;
  };
  evidence: EvidenceReference[];
  uncertainty: string;
  recommendedAction: "monitor" | "consider" | "ignore";
  source: "social_discovery";
  epistemicStatus: Extract<EpistemicStatus, "inference">;
  decisionStatus: Extract<DecisionStatus, "unreviewed" | "approved" | "rejected">;
  clientClaim: string;
}

export interface IdentityProposal {
  id: string;
  name: string;
  accountIds: string[];
  /** A proposal is never an automatic merge. */
  confidence: "proposed" | "confirmed";
  reason: string;
}

export interface MonitoredAccountRef {
  platform: SocialPlatform;
  handle: string;
  providerId: string;
}

/** The set a later monitoring worker can read. This pass does not schedule that worker. */
export interface MonitoredMarketEntity {
  id: string;
  clientId: string;
  name: string;
  classification: MarketAccountType;
  accounts: MonitoredAccountRef[];
  monitoringStatus: "active" | "paused";
  addedAt: string;
  addedBy: "manager" | "discovery";
  epistemicStatus: Extract<EpistemicStatus, "inference">;
  decisionStatus: Extract<DecisionStatus, "approved">;
  machineClassification: MarketAccountType;
  clientClaim: string;
  candidateIds: string[];
}

export interface ProviderUsageRecord {
  provider: "ensembledata";
  endpoint: string;
  platform: SocialPlatform;
  requestedAt: string;
  success: boolean;
  /** Set only when the provider response reports it. */
  units?: number;
  purpose: DiscoveryUsagePurpose;
  cached: boolean;
}

export type ResearchStageStatus = "not_started" | "running" | "partial" | "complete" | "failed";

export type MarketRetry = "instagram" | "tiktok" | "enrichment" | "classification";

export interface ResearchStage {
  status: ResearchStageStatus;
  message?: string;
  httpStatus?: number;
}

/** Internal pipeline state. Managers do not see this structure. */
export interface ResearchStages {
  queries: ResearchStage;
  instagram: ResearchStage;
  tiktok: ResearchStage;
  enrichment: ResearchStage;
  classification: ResearchStage;
}

export interface TechnicalDetail {
  stage: string;
  httpStatus?: number;
  message: string;
}

export interface CompletedSearch {
  platform: SocialPlatform;
  query: string;
  endpoint: string;
}

export interface MarketRunResult {
  ok: boolean;
  failure: "not_configured" | "authentication_failed" | "unavailable" | null;
  message: string;
  set: MarketDiscoverySet | null;
  candidates: SocialAccountCandidate[];
  assessments: MarketAccountAssessment[];
  proposals: IdentityProposal[];
  usage: ProviderUsageRecord[];
  origin: SocialProviderStatus;
  stages?: ResearchStages;
  technical?: TechnicalDetail[];
  completedSearches?: CompletedSearch[];
}

export interface MarketDiscoveryRecord {
  set: MarketDiscoverySet | null;
  candidates: SocialAccountCandidate[];
  assessments: MarketAccountAssessment[];
  proposals: IdentityProposal[];
  entities: MonitoredMarketEntity[];
  usage: ProviderUsageRecord[];
  origin: SocialProviderStatus | "idle";
  message: string;
  updatedAt: string;
  stages?: ResearchStages;
  technical?: TechnicalDetail[];
  completedSearches?: CompletedSearch[];
}
