import type { BriefProject, ProjectIntelligence } from "../../types/project";

export function attentionLine(
  project: BriefProject,
  intelligence: Pick<ProjectIntelligence, "openQuestions" | "assets" | "category" | "discoveryProgress">,
): string {
  if (project.discoveryStatus === "submitted") return "Client discovery submitted — ready for review.";
  if (project.discoveryStatus === "follow_up_requested") return "A follow-up is with the client.";
  const audienceOpen = intelligence.openQuestions.filter((question) => /audience|who /i.test(question.prompt));
  if (audienceOpen.length >= 2) return "Two important audience questions remain unresolved.";
  const wantsPhotos = intelligence.assets.some((asset) => /photograph/i.test(asset.name) && asset.status !== "complete");
  const hasPhotos = (project.library ?? []).some((asset) => asset.category === "photo_video");
  if (wantsPhotos && !hasPhotos && (project.discoveryStatus === "follow_up_complete" || project.discoveryStatus === "closed")) {
    return "Asset opportunity blocked: no project photography.";
  }
  if ((project.history ?? []).some((event) => event.kind === "competitor_researched")) {
    return "Competitor research added new observations.";
  }
  if (intelligence.category && intelligence.category.patterns.length > 0) return "Category patterns are ready to review.";
  if (project.discoveryStatus === "invited") return "Waiting for the client.";
  if (project.discoveryStatus === "opened" || project.discoveryStatus === "in_progress") {
    return `Client discovery ${intelligence.discoveryProgress}% — waiting for the client.`;
  }
  if (intelligence.openQuestions.length > 0) return `${intelligence.openQuestions.length} unresolved questions.`;
  return "Nothing is waiting on you.";
}

/** Home counts work the manager should pick up. A client still filling discovery is not one of them. */
export function needsAttention(project: BriefProject): boolean {
  return project.discoveryStatus === "submitted"
    || project.discoveryStatus === "follow_up_requested"
    || project.discoveryStatus === "follow_up_complete";
}
