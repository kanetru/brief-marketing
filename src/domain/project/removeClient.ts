import type { BriefProject } from "../../types/project";

/** The name a manager must type. Business name is what the card shows. */
export function clientRemovalName(project: Pick<BriefProject, "businessName" | "clientName">): string {
  return project.businessName.trim() || project.clientName.trim() || "Untitled";
}

/** Exact match after trimming. An empty expected name never confirms. */
export function nameMatches(expected: string, typed: string): boolean {
  const name = expected.trim();
  return name.length > 0 && typed.trim() === name;
}

export function withoutProject<T extends { id: string }>(projects: readonly T[], id: string): T[] {
  return projects.filter((project) => project.id !== id);
}
