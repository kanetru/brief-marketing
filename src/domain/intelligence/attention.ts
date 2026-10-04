import type { BriefProject } from "../../types/project";
import type { NotificationIntent, WorkspaceAttentionItem } from "../../types/intelligence";

function readingOf(project: BriefProject) {
  return project.watch?.readings[0] ?? null;
}

export function attentionForProject(project: BriefProject): WorkspaceAttentionItem {
  const reading = readingOf(project);
  const changes = reading?.importantChanges.length ?? 0;
  const opportunities = reading?.opportunities.length ?? 0;
  const challenges = reading?.challengedDecisions.length ?? 0;
  const name = project.businessName || "Untitled project";

  if (changes > 0 || opportunities > 0) {
    const parts = [
      changes > 0 ? `${changes} meaningful ${changes === 1 ? "change" : "changes"}` : "",
      opportunities > 0 ? `${opportunities} ${opportunities === 1 ? "opportunity" : "opportunities"} worth reviewing` : "",
    ].filter(Boolean);
    return {
      id: `${project.id}-attention`,
      projectId: project.id,
      businessName: name,
      kind: opportunities > 0 ? "opportunity" : "change",
      headline: `${parts.join(". ")}.`,
      detail: reading?.importantChanges[0]?.headline || reading?.opportunities[0]?.headline || reading?.summary || "",
      rank: 10 + changes + opportunities * 2,
    };
  }
  if (challenges > 0) {
    return {
      id: `${project.id}-attention`,
      projectId: project.id,
      businessName: name,
      kind: "decision",
      headline: reading?.challengedDecisions[0]?.headline ?? "A current hypothesis may need another look.",
      detail: "Still a hypothesis. You decide.",
      rank: 8,
    };
  }
  if ((project.watch?.signals.length ?? 0) > 0) {
    return {
      id: `${project.id}-attention`,
      projectId: project.id,
      businessName: name,
      kind: "quiet",
      headline: "Nothing significant changed.",
      detail: "The sources being watched did not move enough to matter.",
      rank: 1,
    };
  }
  if (project.discoveryStatus === "invited" || project.discoveryStatus === "opened") {
    return {
      id: `${project.id}-attention`,
      projectId: project.id,
      businessName: name,
      kind: "onboarding",
      headline: "Discovery is with the client.",
      detail: "Brief is waiting to learn the brand before it watches the market.",
      rank: 4,
    };
  }
  if (project.discoveryStatus === "in_progress") {
    return {
      id: `${project.id}-attention`,
      projectId: project.id,
      businessName: name,
      kind: "onboarding",
      headline: "The client is still in discovery.",
      detail: "Nothing in the market is being asked of you.",
      rank: 3,
    };
  }
  return {
    id: `${project.id}-attention`,
    projectId: project.id,
    businessName: name,
    kind: "quiet",
    headline: "Nothing to watch yet.",
    detail: "Add competitors and the topics that could actually matter.",
    rank: 0,
  };
}

export function workspaceAttention(projects: readonly BriefProject[]): WorkspaceAttentionItem[] {
  return projects
    .map(attentionForProject)
    .sort((a, b) => b.rank - a.rank || a.businessName.localeCompare(b.businessName));
}

/** Prepared events. Nothing is delivered. */
export function notificationIntents(project: BriefProject): NotificationIntent[] {
  const reading = readingOf(project);
  const intents: NotificationIntent[] = [];
  if ((reading?.importantChanges.length ?? 0) > 0 || (reading?.opportunities.length ?? 0) > 0) {
    intents.push({
      kind: "high_relevance_intelligence",
      projectId: project.id,
      reason: reading?.summary ?? "",
      deliver: false,
    });
  }
  if (reading?.challengedDecisions.length) {
    intents.push({
      kind: "strategy_challenged",
      projectId: project.id,
      reason: reading.challengedDecisions[0]?.headline ?? "",
      deliver: false,
    });
  }
  if (project.discoveryStatus === "submitted") {
    intents.push({
      kind: "client_discovery_submitted",
      projectId: project.id,
      reason: "Discovery is in.",
      deliver: false,
    });
  }
  return intents;
}
