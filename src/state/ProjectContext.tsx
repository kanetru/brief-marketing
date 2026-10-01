import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AssetStatus, BriefProject, CompetitorInput, FollowUp, StatementOverride } from "../types/project";
import type { DiscoverySession } from "../types/discovery";
import {
  createProject,
  loadProjects,
  replaceProject,
  saveProjects,
  touchProject,
  withAssetState,
  withCompetitor,
  withDiscovery,
  withFollowUp,
  withManagerNotes,
  withOverride,
  withProjectDetails,
  withoutCompetitor,
} from "./projectStore";

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
}

const ProjectContext = createContext<ProjectApi | null>(null);
const ClientProjectContext = createContext<BriefProject | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<BriefProject[]>(() => loadProjects());

  useEffect(() => {
    saveProjects(projects);
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
