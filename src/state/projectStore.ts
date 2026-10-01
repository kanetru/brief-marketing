import { createSession } from "./createSession";
import { DEMO_MANAGER_ID } from "../domain/project/access";
import { projectStatus } from "../domain/project/assemble";
import type { AssetStatus, BriefProject, CompetitorInput, FollowUp, StatementOverride } from "../types/project";
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
    return parsed.filter(isProject).map(normaliseProject);
  } catch {
    return [];
  }
}

export function saveProjects(projects: BriefProject[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function createProject(input: {
  clientName?: string;
  businessName?: string;
  website?: string;
  category?: string;
  discovery?: DiscoverySession;
  now?: string;
}): BriefProject {
  const now = input.now ?? new Date().toISOString();
  const discovery = input.discovery ?? createSession(now);
  const project: BriefProject = {
    id: crypto.randomUUID(),
    managerId: DEMO_MANAGER_ID,
    clientName: input.clientName?.trim() ?? "",
    businessName: input.businessName?.trim() || businessNameFrom(discovery),
    website: input.website?.trim() ?? "",
    category: input.category?.trim() ?? "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    version: 1,
    history: [{ at: now, version: 1, note: "Created" }],
    shareToken: crypto.randomUUID().replace(/-/g, ""),
    discovery,
    managerNotes: "",
    competitors: [],
    followUps: [],
    overrides: [],
    assetStates: {},
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
  const next = bump(project, now, "Discovery updated", {
    discovery,
    businessName: project.businessName || businessNameFrom(discovery),
  });
  return { ...next, status: projectStatus(next) };
}

export function withOverride(project: BriefProject, override: StatementOverride, now = new Date().toISOString()): BriefProject {
  const overrides = project.overrides.filter((item) => item.fieldId !== override.fieldId);
  overrides.push(override);
  const note = override.status === "rejected" ? "Derived statement restored" : "Derived statement updated";
  return bump(project, now, note, { overrides });
}

export function withFollowUp(project: BriefProject, follow: FollowUp, now = new Date().toISOString()): BriefProject {
  const followUps = project.followUps.filter((item) => item.id !== follow.id);
  followUps.push(follow);
  return bump(project, now, "Follow-up answered", { followUps });
}

export function withCompetitor(project: BriefProject, competitor: CompetitorInput, now = new Date().toISOString()): BriefProject {
  const existing = project.competitors.some((item) => item.id === competitor.id);
  const competitors = existing
    ? project.competitors.map((item) => (item.id === competitor.id ? competitor : item))
    : [...project.competitors, competitor];
  return bump(project, now, "Competitor set updated", { competitors: competitors.slice(0, 10) });
}

export function withoutCompetitor(project: BriefProject, id: string, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Competitor removed", { competitors: project.competitors.filter((item) => item.id !== id) });
}

export function withAssetState(
  project: BriefProject,
  assetId: string,
  state: { status: AssetStatus; owner: string; notes: string },
  now = new Date().toISOString(),
): BriefProject {
  return bump(project, now, "Asset register updated", { assetStates: { ...project.assetStates, [assetId]: state } });
}

export function withManagerNotes(project: BriefProject, managerNotes: string, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Manager notes updated", { managerNotes });
}

export function withProjectDetails(
  project: BriefProject,
  details: Partial<Pick<BriefProject, "clientName" | "businessName" | "website" | "category">>,
  now = new Date().toISOString(),
): BriefProject {
  return bump(project, now, "Project details updated", details);
}

export function touchProject(project: BriefProject, now = new Date().toISOString()): BriefProject {
  return bump(project, now, "Agent pack regenerated", {});
}

export function readRole(): "manager" | "client" | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(ROLE_KEY);
  return value === "manager" || value === "client" ? value : null;
}

export function writeRole(role: "manager" | "client"): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ROLE_KEY, role);
}

function bump(
  project: BriefProject,
  now: string,
  note: string,
  patch: Partial<BriefProject>,
): BriefProject {
  const version = project.version + 1;
  const history = [...(project.history ?? []), { at: now, version, note }].slice(-12);
  return { ...project, ...patch, updatedAt: now, version, history };
}

function normaliseProject(project: BriefProject): BriefProject {
  return {
    ...project,
    history: project.history ?? [],
    managerNotes: project.managerNotes ?? "",
    competitors: project.competitors ?? [],
    followUps: project.followUps ?? [],
    overrides: project.overrides ?? [],
    assetStates: project.assetStates ?? {},
  };
}

function businessNameFrom(session: DiscoverySession): string {
  return session.business.name.state === "evidence" ? session.business.name.evidence.raw.trim() : "";
}

function isProject(value: unknown): value is BriefProject {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BriefProject>;
  return typeof record.id === "string" && typeof record.shareToken === "string" && !!record.discovery;
}
