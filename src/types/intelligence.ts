/** Observed change, interpretation, and the memory around them. Kept apart on purpose. */

export type DataOrigin = "live" | "cached" | "stale" | "demo" | "unavailable";

export type RefreshCadence = "hourly" | "daily" | "weekly" | "manual";

export type SignalStatus = "new" | "reviewed" | "incorporated" | "dismissed" | "stale";

export type Qualitative = "low" | "moderate" | "high" | "critical";

export type TemporalCharacter =
  | "once"
  | "acceleration"
  | "deceleration"
  | "persistence"
  | "recurrence"
  | "seasonality"
  | "novelty"
  | "convergence"
  | "divergence"
  | "faded";

export type StrategyRelation = "support" | "challenge" | "not_affect";

export type IntelligenceSource = "demo" | "live_model" | "withheld";

export interface Signal {
  id: string;
  brandId: string;
  type: string;
  sourceType: string;
  sourceProvider: string;
  title: string;
  description: string;
  observedAt: string;
  periodStart: string;
  periodEnd: string;
  entity: string;
  entityId: string;
  metric: string;
  previousValue: string;
  currentValue: string;
  change: string;
  evidence: string[];
  confidence: "low" | "moderate" | "high";
  status: SignalStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  origin: DataOrigin;
  /** Stable key for collapsing the same observation. */
  fingerprint: string;
  metadata: Record<string, string>;
}

export interface SignalAssessment {
  signalId: string;
  significance: Qualitative;
  brandRelevance: Qualitative;
  confidence: Qualitative;
  rationale: string;
  relatedEvidenceIds: string[];
  temporal: TemporalCharacter | "";
  suppressed: boolean;
  suppressReason: string;
  /** Cheap filter only. This is not a strategic recommendation. */
  escalate: boolean;
}

export interface BrandBrain {
  projectId: string;
  version: number;
  updatedAt: string;
  narrative: string;
  identity: string;
  business: string;
  offers: string;
  commercialPriorities: string;
  goals: string;
  customers: string;
  customerPsychology: string;
  customerJourney: string;
  category: string;
  competitors: string;
  positioning: string;
  differentiation: string;
  brand: string;
  verbalIdentity: string;
  visualIdentity: string;
  colourPreferences: string;
  imageryPreferences: string;
  channels: string;
  content: string;
  proof: string;
  constraints: string;
  capabilities: string;
  opportunities: string;
  strategicDecisions: string;
  facts: string[];
  preferences: string[];
  hypotheses: string[];
  recommendations: string[];
  contradictions: string[];
  unknowns: string[];
  currentStrategicRead: string;
  evidenceIds: string[];
}

export interface BrainRevision {
  version: number;
  at: string;
  summary: string;
  previous: string;
  current: string;
  why: string;
  evidenceIds: string[];
  managerDecisionIds: string[];
}

export type IntelligenceKind =
  | "change"
  | "opportunity"
  | "watch"
  | "non_actionable"
  | "hypothesis"
  | "challenge"
  | "question";

export interface IntelligenceItem {
  id: string;
  kind: IntelligenceKind;
  eyebrow: string;
  headline: string;
  evidence: string;
  whyItMatters: string;
  briefRead: string;
  possibleMove: string;
  signalIds: string[];
  evidenceIds: string[];
  temporal: TemporalCharacter | "";
  strategyRelation: StrategyRelation | "";
  hypothesisId: string;
  epistemicStatus: "observation" | "hypothesis" | "recommendation";
  origin: DataOrigin;
  rank: number;
  bucket: "today" | "week" | "watching";
}

export interface BrandIntelligenceReading {
  id: string;
  period: string;
  summary: string;
  importantChanges: IntelligenceItem[];
  opportunities: IntelligenceItem[];
  watchItems: IntelligenceItem[];
  thingsNotWorthReactingTo: IntelligenceItem[];
  changedHypotheses: IntelligenceItem[];
  challengedDecisions: IntelligenceItem[];
  questions: IntelligenceItem[];
  evidenceIds: string[];
  generatedAt: string;
  brandBrainVersion: number;
  source: IntelligenceSource;
  model: string;
}

export interface DailyBrief {
  id: string;
  date: string;
  greeting: string;
  items: IntelligenceItem[];
  quietLine: string;
  generatedAt: string;
  source: IntelligenceSource;
}

export interface WeeklyIntelligenceRead {
  id: string;
  period: string;
  persisted: string[];
  disappeared: string[];
  convergence: string[];
  customerLanguage: string[];
  searchMovement: string[];
  opportunities: string[];
  hypothesesStrengthened: string[];
  hypothesesWeakened: string[];
  decisionsToReconsider: string[];
  generatedAt: string;
  source: IntelligenceSource;
}

export type ReactionAction =
  | "save"
  | "dismiss"
  | "investigate"
  | "not_relevant"
  | "approve"
  | "reject"
  | "edit";

export interface ManagerReaction {
  id: string;
  targetType: "signal" | "intelligence" | "opportunity" | "hypothesis";
  targetId: string;
  action: ReactionAction;
  note: string;
  at: string;
}

export interface IntelligenceMemory {
  fingerprint: string;
  headline: string;
  firstSurfacedAt: string;
  lastSurfacedAt: string;
  reaction: string;
  development: "new" | "pattern" | "faded" | "unchanged";
}

export interface CompetitorSnapshot {
  at: string;
  origin: DataOrigin;
  note: string;
  metrics: Record<string, string>;
}

export interface MonitoredCompetitor {
  id: string;
  name: string;
  website: string;
  socialHandles: string[];
  relationship: "direct" | "indirect" | "substitute";
  monitoredSources: string[];
  lastCheckedAt: string;
  origin: DataOrigin;
  snapshots: CompetitorSnapshot[];
}

export interface ProviderCapability {
  provider: string;
  sourceType: string;
  supportsHistorical: boolean;
  supportsRealtime: boolean;
  supportsFollowerCounts: boolean;
  supportsEngagement: boolean;
  supportsComments: boolean;
  supportsKeywords: boolean;
  supportsContent: boolean;
  supportsSearchVolume: boolean;
  supportsNews: boolean;
  supportsPricing: boolean;
  minimumRefreshInterval: RefreshCadence;
  typicalFreshness: string;
  mode: "live" | "demo" | "unavailable";
}

export interface MonitoringJob {
  id: string;
  brandId: string;
  provider: string;
  jobType: string;
  cadence: RefreshCadence;
  lastRunAt: string;
  nextRunAt: string;
  status: "idle" | "due" | "running" | "ok" | "error";
  lastError: string;
}

export interface WatchState {
  signals: Signal[];
  readings: BrandIntelligenceReading[];
  reactions: ManagerReaction[];
  jobs: MonitoringJob[];
  revisions: BrainRevision[];
  memory: IntelligenceMemory[];
  competitors: MonitoredCompetitor[];
  dailyBriefs: DailyBrief[];
  weeklyReads: WeeklyIntelligenceRead[];
  updatedAt: string;
}

export type AttentionKind =
  | "change"
  | "opportunity"
  | "decision"
  | "stale"
  | "onboarding"
  | "contradiction"
  | "quiet";

export interface WorkspaceAttentionItem {
  id: string;
  projectId: string;
  businessName: string;
  kind: AttentionKind;
  headline: string;
  detail: string;
  rank: number;
}

export type NotificationEventKind =
  | "high_relevance_intelligence"
  | "competitor_major_change"
  | "search_breakout"
  | "important_news"
  | "strategy_challenged"
  | "client_discovery_submitted"
  | "research_stale";

export interface NotificationIntent {
  kind: NotificationEventKind;
  projectId: string;
  reason: string;
  /** Delivery is not built. Quiet until a later product decides to send. */
  deliver: false;
}
