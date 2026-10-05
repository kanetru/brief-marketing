import type { BriefProject } from "../../types/project";

export type CardTone = "insights" | "review" | "stale" | "paused" | "waiting" | "quiet" | "empty";

export interface ClientCardModel {
  name: string;
  subtitle: string;
  status: string;
  tone: CardTone;
  updated: string;
  watch: string;
}

export function formatChecked(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const hour = hours % 12 || 12;
  return `${hour}:${minutes} ${hours < 12 ? "am" : "pm"}`;
}

function platformLabel(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("instagram") || text === "ig") return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("youtube")) return "YouTube";
  if (!text || text.includes("demo") || text.includes("website") || text.includes("http")) return "";
  return value.trim();
}

export function platformsFor(project: BriefProject): string[] {
  const found = new Set<string>();
  for (const competitor of project.watch?.competitors ?? []) {
    for (const handle of competitor.socialHandles) {
      const label = platformLabel(handle);
      if (label) found.add(label);
    }
  }
  if (found.size === 0 && (project.watch?.signals ?? []).some((signal) => signal.sourceType === "social")) found.add("Social");
  return [...found];
}

export function competitorCount(project: BriefProject): number {
  return Math.max(project.competitors?.length ?? 0, project.watch?.competitors?.length ?? 0);
}

export function clientCardModel(project: BriefProject): ClientCardModel {
  const reading = project.watch?.readings[0] ?? null;
  const insights = (reading?.importantChanges.length ?? 0) + (reading?.opportunities.length ?? 0);
  const challenges = reading?.challengedDecisions.length ?? 0;
  const paused = (project.watch?.jobs.length ?? 0) > 0 && (
    project.watch.jobs.every((job) => job.status === "error")
    || project.watch.jobs.some((job) => /paused/i.test(job.lastError))
  );
  const stale = (project.watch?.signals ?? []).some((signal) => signal.origin === "stale")
    || (project.watch?.competitors ?? []).some((competitor) => competitor.origin === "stale");
  const waiting = project.discoveryStatus === "draft"
    || project.discoveryStatus === "invited"
    || project.discoveryStatus === "opened"
    || project.discoveryStatus === "in_progress";

  let status = "Nothing to watch";
  let tone: CardTone = "empty";
  if (paused) {
    status = "Monitoring paused";
    tone = "paused";
  } else if (insights > 0) {
    status = `${insights} new ${insights === 1 ? "insight" : "insights"}`;
    tone = "insights";
  } else if (challenges > 0) {
    status = "Needs review";
    tone = "review";
  } else if (stale) {
    status = "Research stale";
    tone = "stale";
  } else if (waiting) {
    status = "Discovery waiting";
    tone = "waiting";
  } else if ((project.watch?.signals.length ?? 0) > 0) {
    status = "Nothing significant changed";
    tone = "quiet";
  }

  const platforms = platformsFor(project);
  const count = competitorCount(project);
  const watch = count === 0
    ? "No competitors yet"
    : `${count} ${count === 1 ? "competitor" : "competitors"}${platforms.length ? ` · ${platforms.join(" + ")}` : ""}`;
  const when = project.watch?.updatedAt || project.updatedAt;

  return {
    name: project.businessName || "Untitled",
    subtitle: project.category?.trim() || "Client",
    status,
    tone,
    updated: when ? `Updated ${formatChecked(when)}` : "",
    watch,
  };
}
