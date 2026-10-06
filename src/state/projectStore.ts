import { migrateSession } from "./storage";
import { createSession } from "./createSession";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { projectStatus } from "../domain/project/assemble";
import { emptyWatch, normaliseWatch, withStoredReaction } from "../domain/intelligence/watch";
import type { MarketDiscoveryRecord } from "../types/marketDiscovery";
import { emptyMarketDiscovery } from "../domain/market/review";
import { normaliseHandle } from "../domain/socialHandle";
import type { StoredClientReading } from "../types/clientRead";
import type { ManagerReaction } from "../types/intelligence";
import type {
  AssetStatus,
  BriefProject,
  ClientProfile,
  ClientSocial,
  CompetitorInput,
  ContentIdea,
  DiscoveryStatus,
  FollowUp,
  HistoryKind,
  LearningResponse,
  LibraryAsset,
  StatementOverride,
  StoredResearch,
  WorkNote,
} from "../types/project";
import type { DiscoverySession } from "../types/discovery";

export const PROJECTS_KEY = "lover-lover.projects.v1";
export const ROLE_KEY = "lover-lover.role";

export function loadProjects(): BriefProject[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(coerceProject).filter((project): project is BriefProject => project !== null);
  } catch {
    return [];
  }
}

export function saveProjects(projects: BriefProject[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function coerceProject(value: unknown): BriefProject | null {
  if (!isProject(value)) return null;
  return normaliseProject(value);
}

export function createProject(input: {
  clientName?: string;
  businessName?: string;
  website?: string;
  category?: string;
  contactEmail?: string;
  discovery?: DiscoverySession;
  discoveryStatus?: DiscoveryStatus;
  now?: string;
}): BriefProject {
  const now = input.now ?? new Date().toISOString();
  const discovery = input.discovery ?? createSession(now);
  const project: BriefProject = {
    id: crypto.randomUUID(),
    managerId: DEMO_ACCOUNT.id,
    workspaceId: DEMO_ACCOUNT.workspaceId,
    clientName: input.clientName?.trim() ?? "",
    businessName: input.businessName?.trim() || businessNameFrom(discovery),
    website: input.website?.trim() ?? "",
    category: input.category?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    status: "draft",
    discoveryStatus: input.discoveryStatus ?? "draft",
    createdAt: now,
    updatedAt: now,
    version: 1,
    history: [{ at: now, version: 1, kind: "project_created", note: "Project created" }],
    shareToken: crypto.randomUUID().replace(/-/g, ""),
    discovery,
    managerNotes: "",
    socials: [],
    profile: emptyProfile(),
    workNotes: [],
    contentIdeas: [],
    competitors: [],
    followUps: [],
    followUpRequest: null,
    overrides: [],
    assetStates: {},
    library: [],
    websiteResearch: null,
    competitorResearch: {},
    learning: [],
    clientReading: null,
    watch: emptyWatch(now),
    marketDiscovery: emptyMarketDiscovery(now),
  };
  return { ...project, status: projectStatus(project) };
}

export function projectByToken(projects: readonly BriefProject[], token: string): BriefProject | null {
  return projects.find((project) => project.shareToken === token) ?? null;
}

export function replaceProject(projects: readonly BriefProject[], next: BriefProject): BriefProject[] {
  return projects.map((project) => (project.id === next.id ? next : project));
}

export function withDiscovery(project: BriefProject, discovery: DiscoverySession, now = new Date().toISOString()): BriefProject {
  const discoveryStatus = project.discoveryStatus === "draft" || project.discoveryStatus === "invited" || project.discoveryStatus === "opened"
    ? "in_progress"
    : project.discoveryStatus;
  const next = bump(project, now, "", {
    discovery,
    discoveryStatus,
    businessName: project.businessName || businessNameFrom(discovery),
  }, null);
  return { ...next, status: projectStatus(next) };
}

export function inviteDiscovery(project: BriefProject, now = new Date().toISOString()): BriefProject {
  if (project.discoveryStatus !== "draft") return project;
  return bump(project, now, "Discovery sent", { discoveryStatus: "invited" }, "discovery_sent");
}

export function markDiscoveryOpened(project: BriefProject, now = new Date().toISOString()): BriefProject {
  if (project.discoveryStatus !== "draft" && project.discoveryStatus !== "invited") return project;
  return bump(project, now, "Client opened discovery", { discoveryStatus: "opened" }, "discovery_opened");
}

export function submitDiscovery(project: BriefProject, now = new Date().toISOString()): BriefProject {
  if (project.discoveryStatus === "submitted" || project.discoveryStatus === "follow_up_complete" || project.discoveryStatus === "closed") return project;
  const presence = project.discovery?.strategyInputs?.presence;
  const socials = [...(project.socials ?? [])];
  for (const platform of ["instagram", "tiktok"] as const) {
    const handle = normaliseHandle(presence?.[platform] ?? "").handle;
    if (handle && !socials.some((item) => item.platform === platform && item.handle.replace(/^@/, "").toLowerCase() === handle.toLowerCase())) {
      socials.push({ platform, handle });
    }
  }
  const website = project.website.trim() || presence?.website?.trim() || "";
  return bump(project, now, "Discovery submitted", { discoveryStatus: "submitted", socials, website }, "discovery_submitted");
}

export function requestFollowUp(
  project: BriefProject,
  prompts: Array<{ id: string; prompt: string }>,
  now = new Date().toISOString(),
): BriefProject {
  const usable = prompts.filter((item) => item.prompt.trim()).slice(0, 5);
  if (usable.length === 0) return project;
  return bump(project, now, "Follow-up requested", {
    discoveryStatus: "follow_up_requested",
    followUpRequest: { prompts: usable, answers: {} },
  }, "follow_up_requested");
}

export function completeFollowUp(
  project: BriefProject,
  answers: Record<string, string>,
  now = new Date().toISOString(),
): BriefProject {
  return bump(project, now, "Follow-up completed", {
    discoveryStatus: "follow_up_complete",
    followUpRequest: {
      prompts: project.followUpRequest?.prompts ?? [],
      answers,
    },
  }, "follow_up_completed");
}

export function withOverride(project: BriefProject, override: StatementOverride, now = new Date().toISOString()): BriefProject {
  const overrides = project.overrides.filter((item) => item.fieldId !== override.fieldId);
  overrides.push(override);
  const rejected = override.status === "rejected" || override.decisionStatus === "rejected";
  return bump(
    project,
    now,
    rejected ? "Direction set aside" : "Approved a direction",
    { overrides },
    rejected ? "note" : "direction_approved",
  );
}

export function withFollowUp(project: BriefProject, follow: FollowUp, now = new Date().toISOString()): BriefProject {
  const followUps = project.followUps.filter((item) => item.id !== follow.id);
  followUps.push(follow);
  return bump(project, now, "", { followUps }, null);
}

export function withCompetitor(project: BriefProject, competitor: CompetitorInput, now = new Date().toISOString()): BriefProject {
  const existing = project.competitors.some((item) => item.id === competitor.id);
  const competitors = existing
    ? project.competitors.map((item) => (item.id === competitor.id ? competitor : item))
    : [...project.competitors, competitor];
  return bump(project, now, "", { competitors: competitors.slice(0, 10) }, null);
}

export function withoutCompetitor(project: BriefProject, id: string, now = new Date().toISOString()): BriefProject {
  const competitorResearch = { ...project.competitorResearch };
  delete competitorResearch[id];
  return bump(project, now, "", { competitors: project.competitors.filter((item) => item.id !== id), competitorResearch }, null);
}

export function withClientReading(project: BriefProject, clientReading: StoredClientReading, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "The client was read again", { clientReading }, "client_reread");
}

export function withWebsiteResearch(project: BriefProject, websiteResearch: StoredResearch, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Website researched", { websiteResearch }, "website_researched");
}

export function withCompetitorResearch(project: BriefProject, competitorId: string, research: StoredResearch, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Competitor researched", {
    competitorResearch: { ...project.competitorResearch, [competitorId]: research },
  }, "competitor_researched");
}

export function withLibraryAsset(project: BriefProject, asset: LibraryAsset, now = new Date().toISOString()): BriefProject {
  const library = [...project.library.filter((item) => item.id !== asset.id), asset];
  return bump(project, now, "Asset added", { library }, "asset_added");
}

export function withoutLibraryAsset(project: BriefProject, assetId: string, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "File removed", { library: project.library.filter((item) => item.id !== assetId) }, null);
}

export function withSocials(project: BriefProject, socials: ClientSocial[], now = new Date().toISOString()): BriefProject {
  return bump(project, now, "", { socials: socials.filter((item) => item.handle.trim()) }, null);
}

export function withProfile(project: BriefProject, profile: ClientProfile, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "", { profile }, null);
}

export function withWorkNotes(project: BriefProject, workNotes: WorkNote[], now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Note updated", { workNotes }, "note");
}

export function withBriefing(project: BriefProject, briefing: BriefProject["briefing"], now = new Date().toISOString()): BriefProject {
  return bump(project, now, "", { briefing: briefing ?? [] }, null);
}

export function withContentIdeas(project: BriefProject, contentIdeas: ContentIdea[], now = new Date().toISOString()): BriefProject {
  return bump(project, now, "", { contentIdeas }, null);
}

export function withLearning(project: BriefProject, response: LearningResponse, now = new Date().toISOString()): BriefProject {
  const learning = [...project.learning.filter((item) => item.id !== response.id), response];
  return bump(project, now, "", { learning }, null);
}

export function withAssetState(
  project: BriefProject,
  assetId: string,
  state: { status: AssetStatus; owner: string; notes: string },
  now = new Date().toISOString(),
): BriefProject {
  const kind: HistoryKind | null = state.status === "complete" ? "asset_completed" : null;
  return bump(project, now, kind ? "Asset completed" : "", { assetStates: { ...project.assetStates, [assetId]: state } }, kind);
}

export function withManagerNotes(project: BriefProject, managerNotes: string, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "", { managerNotes }, null);
}

export function withProjectDetails(
  project: BriefProject,
  details: Partial<Pick<BriefProject, "clientName" | "businessName" | "website" | "category">>,
  now = new Date().toISOString(),
): BriefProject {
  return bump(project, now, "", details, null);
}

export function withReaction(project: BriefProject, reaction: ManagerReaction, now = reaction.at): BriefProject {
  const watch = withStoredReaction(normaliseWatch(project.watch, now), { ...reaction, at: now });
  const note = reaction.action === "save"
    ? "Saved an opportunity"
    : reaction.action === "dismiss" || reaction.action === "not_relevant"
      ? "Set a signal aside"
      : "Noted a reaction";
  return bump(project, now, note, { watch }, "intelligence_reaction");
}

export function withMarketDiscovery(project: BriefProject, marketDiscovery: MarketDiscoveryRecord, now = marketDiscovery.updatedAt): BriefProject {
  return bump(project, now, "Market watch updated", { marketDiscovery }, "market_watch");
}

export function touchProject(project: BriefProject, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Agent pack regenerated", {}, "pack_regenerated");
}

export function readRole(): "manager" | "client" | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(ROLE_KEY);
  return value === "manager" || value === "client" ? value : null;
}

const MANAGER_PRESENT_KEY = "lover-lover.manager-present";

export function writeRole(role: "manager" | "client"): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ROLE_KEY, role);
  if (role === "manager") sessionStorage.setItem(MANAGER_PRESENT_KEY, "1");
}

export function managerPresent(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(MANAGER_PRESENT_KEY) === "1";
}

function bump(
  project: BriefProject,
  now: string,
  note: string,
  patch: Partial<BriefProject>,
  kind: HistoryKind | null,
): BriefProject {
  const version = project.version + 1;
  const history = kind
    ? [...(project.history ?? []), { at: now, version, kind, note }].slice(-24)
    : project.history ?? [];
  return { ...project, ...patch, updatedAt: now, version, history };
}

function normaliseProject(project: BriefProject): BriefProject {
  return {
    ...project,
    managerId: project.managerId || DEMO_ACCOUNT.id,
    workspaceId: project.workspaceId || DEMO_ACCOUNT.workspaceId,
    discovery: migrateSession(project.discovery) ?? project.discovery,
    discoveryStatus: project.discoveryStatus ?? "draft",
    history: (project.history ?? []).map((event) => ({
      at: event.at,
      version: event.version,
      kind: event.kind ?? "note",
      note: event.note ?? "",
    })),
    managerNotes: project.managerNotes ?? "",
    socials: project.socials ?? [],
    profile: project.profile ?? emptyProfile(),
    workNotes: project.workNotes ?? [],
    contentIdeas: project.contentIdeas ?? [],
    briefing: project.briefing ?? [],
    contactEmail: project.contactEmail ?? "",
    competitors: project.competitors ?? [],
    followUps: project.followUps ?? [],
    followUpRequest: project.followUpRequest ?? null,
    overrides: project.overrides ?? [],
    assetStates: project.assetStates ?? {},
    library: project.library ?? [],
    websiteResearch: project.websiteResearch ?? null,
    competitorResearch: project.competitorResearch ?? {},
    learning: project.learning ?? [],
    clientReading: project.clientReading ?? null,
    watch: normaliseWatch(project.watch, project.updatedAt),
    marketDiscovery: project.marketDiscovery ?? emptyMarketDiscovery(project.updatedAt),
  };
}

function emptyProfile(): ClientProfile {
  return { description: "", audience: "", goal: "", offers: [] };
}

function businessNameFrom(session: DiscoverySession): string {
  return session.business.name.state === "evidence" ? session.business.name.evidence.raw.trim() : "";
}

function isProject(value: unknown): value is BriefProject {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BriefProject>;
  return typeof record.id === "string" && typeof record.shareToken === "string" && !!record.discovery;
}
