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

export type Confidence = "low" | "medium" | "high";

export type ProjectStatus = "draft" | "discovery" | "review" | "active";

export type AssetCategory = "brand" | "web" | "content" | "photo_video" | "proof";

export type AssetPriority = "now" | "soon" | "later";

export type AssetStatus = "proposed" | "approved" | "in_progress" | "complete";

export type OpportunityType =
  | "positioning"
  | "content"
  | "channel"
  | "campaign"
  | "proof"
  | "visual"
  | "format"
  | "gap";

export type Effort = "low" | "medium" | "high";

export interface EvidenceRecord {
  id: string;
  sourceType: EvidenceSourceType;
  sourceReference: string;
  text: string;
  topic: string;
  confidence: Confidence;
  kind: EvidenceKind;
  timestamp: string;
  managerStatus: "unreviewed" | "approved" | "rejected";
}

export interface UnderstandingField {
  id: string;
  section: "company" | "audience" | "market" | "brand" | "strategy" | "creative";
  label: string;
  text: string;
  kind: EvidenceKind;
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
  status: "approved" | "edited" | "rejected";
  updatedAt: string;
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
  clientName: string;
  businessName: string;
  website: string;
  category: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Recent canonical changes. The agent pack is never stored here. */
  history: Array<{ at: string; version: number; note: string }>;
  shareToken: string;
  discovery: DiscoverySession;
  managerNotes: string;
  competitors: CompetitorInput[];
  followUps: FollowUp[];
  overrides: StatementOverride[];
  /** Keyed by asset id. */
  assetStates: Record<string, { status: AssetStatus; owner: string; notes: string }>;
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
  openQuestions: OpenQuestion[];
  contradictions: Contradiction[];
  agentPack: AgentPack;
  discoveryProgress: number;
}
