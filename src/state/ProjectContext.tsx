import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SEED_KEY, seedDemoWorkspace } from "../domain/project/demoWorkspace";
import type { StoredClientReading } from "../types/clientRead";
import type { MarketDiscoveryRecord } from "../types/marketDiscovery";
import type { AssetStatus, BriefProject, CompetitorInput, FollowUp, LearningResponse, LibraryAsset, StatementOverride, StoredResearch } from "../types/project";
import type { DiscoverySession } from "../types/discovery";
import {
  completeFollowUp,
  createProject,
  inviteDiscovery,
  loadProjects,
  markDiscoveryOpened,
  replaceProject,
  requestFollowUp,
  saveProjects,
  submitDiscovery,
  touchProject,
  withAssetState,
  withCompetitor,
  withCompetitorResearch,
  withDiscovery,
  withFollowUp,
  withLearning,
  withLibraryAsset,
  withClientReading,
  withReaction,
  withManagerNotes,
  withOverride,
  withProjectDetails,
  withWebsiteResearch,
  withoutCompetitor,
  withMarketDiscovery,
} from "./projectStore";
import type { ManagerReaction } from "../types/intelligence";

interface ProjectApi {
  projects: BriefProject[];
  create: (input: Parameters<typeof createProject>[0]) => BriefProject;
  saveDiscovery: (projectId: string, discovery: DiscoverySession) => void;
  setOverride: (projectId: string, override: StatementOverride) => void;
  setFollowUp: (projectId: string, follow: FollowUp) => void;
  setCompetitor: (projectId: string, competitor: CompetitorInput) => void;
  removeCompetitor: (projectId: string, competitorId: string) => void;
  setAssetState: (projectId: string, assetId: string, state: { status: AssetStatus; owner: string; notes: string }) => void;
  setNotes: (projectId: string, notes: string) => void;
  setDetails: (projectId: string, details: Partial<Pick<BriefProject, "clientName" | "businessName" | "website" | "category">>) => void;
  regenerate: (projectId: string) => void;
  sendDiscovery: (projectId: string) => void;
  markOpened: (projectId: string) => void;
  submitDiscovery: (projectId: string) => void;
  requestFollowUp: (projectId: string, prompts: Array<{ id: string; prompt: string }>) => void;
  completeFollowUp: (projectId: string, answers: Record<string, string>) => void;
  setWebsiteResearch: (projectId: string, research: StoredResearch) => void;
  setCompetitorResearch: (projectId: string, competitorId: string, research: StoredResearch) => void;
  addLibraryAsset: (projectId: string, asset: LibraryAsset) => void;
  setLearning: (projectId: string, response: LearningResponse) => void;
  setClientReading: (projectId: string, reading: StoredClientReading) => void;
  setReaction: (projectId: string, reaction: ManagerReaction) => void;
  setMarketDiscovery: (projectId: string, record: MarketDiscoveryRecord) => void;
}

const ProjectContext = createContext<ProjectApi | null>(null);
const ClientProjectContext = createContext<BriefProject | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<BriefProject[]>(() => {
    const loaded = loadProjects();
    if (loaded.length > 0) return loaded;
    if (typeof localStorage !== "undefined" && localStorage.getItem(SEED_KEY)) return loaded;
    return seedDemoWorkspace();
  });

  useEffect(() => {
    saveProjects(projects);
    if (typeof localStorage === "undefined" || projects.length === 0) return;
    if (!localStorage.getItem(SEED_KEY)) localStorage.setItem(SEED_KEY, "1");
  }, [projects]);

  const mutate = useCallback((projectId: string, change: (project: BriefProject) => BriefProject) => {
    setProjects((current) => {
      const project = current.find((item) => item.id === projectId);
      if (!project) return current;
      return replaceProject(current, change(project));
    });
  }, []);

  const api = useMemo<ProjectApi>(() => ({
    projects,
    create: (input) => {
      const project = createProject(input);
      setProjects((current) => [project, ...current]);
      return project;
    },
    saveDiscovery: (projectId, discovery) => {
      mutate(projectId, (project) => (project.discovery === discovery ? project : withDiscovery(project, discovery)));
    },
    setOverride: (projectId, override) => mutate(projectId, (project) => withOverride(project, override)),
    setFollowUp: (projectId, follow) => mutate(projectId, (project) => withFollowUp(project, follow)),
    setCompetitor: (projectId, competitor) => mutate(projectId, (project) => withCompetitor(project, competitor)),
    removeCompetitor: (projectId, competitorId) => mutate(projectId, (project) => withoutCompetitor(project, competitorId)),
    setAssetState: (projectId, assetId, state) => mutate(projectId, (project) => withAssetState(project, assetId, state)),
    setNotes: (projectId, notes) => mutate(projectId, (project) => withManagerNotes(project, notes)),
    setDetails: (projectId, details) => mutate(projectId, (project) => withProjectDetails(project, details)),
    regenerate: (projectId) => mutate(projectId, (project) => touchProject(project)),
    sendDiscovery: (projectId) => mutate(projectId, (project) => inviteDiscovery(project)),
    markOpened: (projectId) => mutate(projectId, (project) => markDiscoveryOpened(project)),
    submitDiscovery: (projectId) => mutate(projectId, (project) => submitDiscovery(project)),
    requestFollowUp: (projectId, prompts) => mutate(projectId, (project) => requestFollowUp(project, prompts)),
    completeFollowUp: (projectId, answers) => mutate(projectId, (project) => completeFollowUp(project, answers)),
    setWebsiteResearch: (projectId, research) => mutate(projectId, (project) => withWebsiteResearch(project, research)),
    setCompetitorResearch: (projectId, competitorId, research) => mutate(projectId, (project) => withCompetitorResearch(project, competitorId, research)),
    addLibraryAsset: (projectId, asset) => mutate(projectId, (project) => withLibraryAsset(project, asset)),
    setLearning: (projectId, response) => mutate(projectId, (project) => withLearning(project, response)),
    setClientReading: (projectId, reading) => mutate(projectId, (project) => withClientReading(project, reading)),
    setReaction: (projectId, reaction) => mutate(projectId, (project) => withReaction(project, reaction)),
    setMarketDiscovery: (projectId, record) => mutate(projectId, (project) => withMarketDiscovery(project, record)),
  }), [mutate, projects]);

  return <ProjectContext.Provider value={api}>{children}</ProjectContext.Provider>;
}

export function useProjects(): ProjectApi {
  const api = useContext(ProjectContext);
  if (!api) throw new Error("Project provider missing");
  return api;
}

export function ClientProjectScope({ project, children }: { project: BriefProject; children: ReactNode }) {
  return <ClientProjectContext.Provider value={project}>{children}</ClientProjectContext.Provider>;
}

/** Null on the demo and manager surfaces. */
export function useClientProject(): BriefProject | null {
  return useContext(ClientProjectContext);
}
