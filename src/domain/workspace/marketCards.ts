import type { BriefProject } from "../../types/project";
import type { MonitoredCompetitor, Signal } from "../../types/intelligence";

export interface CompetitorCardModel {
  id: string;
  name: string;
  channel: string;
  followers: string;
  recentChange: string;
  themes: string;
}

function platformLabel(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("instagram") || text === "ig") return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("social")) return "Social";
  return "";
}

export function formatFollowers(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const value = Number(digits);
  if (!digits || Number.isNaN(value) || value <= 0) return "";
  if (value >= 1000) {
    const compact = (value / 1000).toFixed(1).replace(/\.0$/, "");
    return `${compact}k followers`;
  }
  return `${value} followers`;
}

function relatedSignals(project: BriefProject, competitor: MonitoredCompetitor): Signal[] {
  return (project.watch?.signals ?? [])
    .filter((signal) => signal.entityId === competitor.id || signal.entity === competitor.name)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
}

export function competitorCard(project: BriefProject, competitor: MonitoredCompetitor): CompetitorCardModel {
  const handles = competitor.socialHandles.map(platformLabel).filter(Boolean);
  const channel = handles.length > 0 ? [...new Set(handles)].join(" · ") : competitor.monitoredSources.some((source) => source.includes("social")) ? "Social" : "";
  const latest = competitor.snapshots[competitor.snapshots.length - 1];
  const followers = formatFollowers(latest?.metrics.followers ?? "");
  const signals = relatedSignals(project, competitor);
  const newest = signals[0];
  const recentChange = newest ? (newest.title.length <= 90 ? newest.title : newest.change) : (latest?.note ?? "");
  const themes = [...new Set(signals.flatMap((signal) => (signal.metadata.themes ?? "").split(/[,·]/).map((item) => item.trim()).filter(Boolean)))];
  return {
    id: competitor.id,
    name: competitor.name,
    channel,
    followers,
    recentChange,
    themes: themes.slice(0, 4).map((theme) => theme.charAt(0).toUpperCase() + theme.slice(1)).join(" · "),
  };
}

export function competitorCards(project: BriefProject): CompetitorCardModel[] {
  return (project.watch?.competitors ?? []).map((competitor) => competitorCard(project, competitor));
}
