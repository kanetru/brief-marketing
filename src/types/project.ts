import type { DiscoverySession } from "./discovery";

export type EvidenceSourceType =
  | "client_statement"
  | "manager_statement"
  | "visual_choice"
  | "uploaded_reference"
  | "website_research"
  | "competitor_research"
  | "strategist_inference"
  | "system_derived";

export type EvidenceKind = "fact" | "preference" | "inference" | "hypothesis" | "recommendation";

/** What the statement is. Independent of whether anyone has approved it. */
export type EpistemicStatus = EvidenceKind;

/** What the manager has done with it. Approving a hypothesis does not make it a fact. */
export type DecisionStatus = "unreviewed" | "approved" | "rejected" | "superseded" | "accepted";

export type DiscoveryStatus =
  | "draft"
  | "invited"
  | "opened"
  | "in_progress"
  | "submitted"
  | "follow_up_requested"
  | "follow_up_complete"
  | "closed";

export type ProfessionalRole = "owner" | "strategist" | "designer" | "collaborator";

export type HistoryKind =
  | "project_created"
  | "discovery_sent"
  | "discovery_opened"
  | "discovery_submitted"
  | "follow_up_requested"
  | "follow_up_completed"
  | "website_researched"
  | "competitor_researched"
  | "direction_approved"
  | "asset_added"
  | "asset_completed"
  | "pack_regenerated"
  | "note";

export type Confidence = "low" | "medium" | "high";

export type ProjectStatus = "draft" | "discovery" | "review" | "active";

export type AssetCategory = "brand" | "web" | "content" | "photo_video" | "proof";

export type AssetPriority = "now" | "soon" | "later";

export type AssetStatus = "proposed" | "approved" | "in_progress" | "complete";

export type OpportunityType =
  | "positioning"
  | "messaging"
  | "content"
  | "channel"
  | "campaign"
  | "proof"
  | "visual"
  | "format"
  | "gap"
  | "website"
  | "audience"
  | "creative"
  | "asset"
  | "research";

export type Effort = "low" | "medium" | "high";

export interface EvidenceRecord {
  id: string;
  sourceType: EvidenceSourceType;
  sourceReference: string;
  text: string;
  topic: string;
  confidence: Confidence;
  kind: EvidenceKind;
  epistemicStatus: EpistemicStatus;
  decisionStatus: DecisionStatus;
  /** Set when the words were taken from a retrieved page. */
  url?: string;
  retrievedAt?: string;
  /** Published copy is what a site says. It is not a fact about the business. */
  claimScope?: "business" | "published_copy";
  timestamp: string;
  managerStatus: "unreviewed" | "approved" | "rejected";
}

export interface UnderstandingField {
  id: string;
  section: "company" | "business" | "audience" | "market" | "brand" | "strategy" | "marketing" | "creative" | "knowledge";
  label: string;
  text: string;
  kind: EvidenceKind;
  epistemicStatus: EpistemicStatus;
  decisionStatus: DecisionStatus;
  confidence: Confidence;
  evidenceIds: string[];
}

export interface CompanyUnderstanding {
  fields: UnderstandingField[];
}

export interface CompetitorInput {
  id: string;
  name: string;
  website: string;
  /** Manager-written notes. Never treated as a site visit. */
  notes: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  website: string;
  basis: "unavailable" | "manager_notes" | "research";
  apparentPositioning: string;
  headline: string;
  audience: string;
  offer: string;
  tone: string;
  visualConventions: string;
  contentThemes: string;
  proof: string;
  callsToAction: string;
  language: string;
  strengths: string;
  weaknesses: string;
  differentiation: string;
  evidenceIds: string[];
  unavailableReason: string;
}

export interface CategorySynthesis {
  basis: "manager_notes" | "research";
  observation: string;
  commonClaims: string[];
  visualSameness: string[];
  languageInCommon: string[];
  whiteSpace: string[];
  avoidCopying: string[];
  clientDifference: string[];
  evidenceIds: string[];
  patterns: CategoryPattern[];
}

export interface CategoryPattern {
  id: string;
  title: string;
  statement: string;
  count: number;
  total: number;
  evidenceIds: string[];
  epistemicStatus: "hypothesis" | "recommendation";
}

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  why: string;
  evidenceIds: string[];
  confidence: Confidence;
  action: string;
  effort: Effort;
  impactHypothesis: string;
}

export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
  reason: string;
  evidenceIds: string[];
  priority: AssetPriority;
  status: AssetStatus;
  owner: string;
  notes: string;
  sourceMaterial: string;
}

export interface OpenQuestion {
  id: string;
  prompt: string;
  reason: string;
  evidenceIds: string[];
}

export interface Contradiction {
  id: string;
  statement: string;
  evidenceIds: string[];
}

export interface StatementOverride {
  fieldId: string;
  text: string;
  /** Legacy label. Decision status is the one that counts. */
  status: "approved" | "edited" | "rejected";
  /** Omitted means: keep the field's existing epistemic status. Never implied to be fact. */
  epistemicStatus?: EpistemicStatus;
  decisionStatus?: DecisionStatus;
  updatedAt: string;
}

export interface PageObservation {
  url: string;
  retrievedAt: string;
  headline: string;
  description: string;
  excerpt: string;
  callsToAction: string[];
  recurringLanguage: string[];
}

export interface StoredResearch {
  url: string;
  retrievedAt: string;
  observation: PageObservation | null;
  unavailableReason: string;
}

export interface LibraryAsset {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  fileRef: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  approval: DecisionStatus;
  relatedOpportunityId: string | null;
}

export interface LearningResponse {
  id: string;
  prompt: string;
  choice: string;
}

export interface FollowUpRequest {
  prompts: Array<{ id: string; prompt: string }>;
  answers: Record<string, string>;
}

export interface HistoryEvent {
  at: string;
  version: number;
  kind: HistoryKind;
  note: string;
}

export interface FollowUp {
  id: string;
  prompt: string;
  reason: string;
  answer: string;
}

export interface AgentFile {
  name: string;
  title: string;
  markdown: string;
}

export interface AgentPack {
  generatedAt: string;
  projectVersion: number;
  files: AgentFile[];
  master: AgentFile;
}

export interface BriefProject {
  id: string;
  managerId: string;
  workspaceId: string;
  clientName: string;
  businessName: string;
  website: string;
  category: string;
  status: ProjectStatus;
  discoveryStatus: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Meaningful changes only. The agent pack is never stored here. */
  history: HistoryEvent[];
  shareToken: string;
  discovery: DiscoverySession;
  managerNotes: string;
  competitors: CompetitorInput[];
  followUps: FollowUp[];
  followUpRequest: FollowUpRequest | null;
  overrides: StatementOverride[];
  /** Keyed by asset id. Proposed work, not files on hand. */
  assetStates: Record<string, { status: AssetStatus; owner: string; notes: string }>;
  /** Files and references the manager actually has. */
  library: LibraryAsset[];
  websiteResearch: StoredResearch | null;
  competitorResearch: Record<string, StoredResearch>;
  learning: LearningResponse[];
}

export interface ProjectIntelligence {
  projectId: string;
  version: number;
  generatedAt: string;
  evidence: EvidenceRecord[];
  understanding: CompanyUnderstanding;
  competitors: CompetitorProfile[];
  category: CategorySynthesis | null;
  opportunities: Opportunity[];
  assets: AssetItem[];
  library: LibraryAsset[];
  openQuestions: OpenQuestion[];
  contradictions: Contradiction[];
  agentPack: AgentPack;
  discoveryProgress: number;
}
