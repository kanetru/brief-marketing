import type { HistoryEvent, HistoryKind } from "../../types/project";

const LINE: Record<HistoryKind, string> = {
  project_created: "Project created.",
  discovery_sent: "Discovery sent.",
  discovery_opened: "Client opened discovery.",
  discovery_submitted: "Discovery completed.",
  follow_up_requested: "Follow-up sent.",
  follow_up_completed: "Follow-up completed.",
  website_researched: "Website research updated.",
  competitor_researched: "Competitor intelligence updated.",
  direction_approved: "Direction approved.",
  asset_added: "Asset added.",
  asset_completed: "Asset completed.",
  pack_regenerated: "Agent pack rebuilt.",
  client_reread: "Strategy reread.",
  intelligence_reaction: "Insight updated.",
  watch_checked: "Intelligence checked.",
  note: "Note added.",
};

export function historyLine(event: Pick<HistoryEvent, "kind" | "note">): string {
  const note = event.note?.trim() ?? "";
  if (note && note.length <= 90) return note.endsWith(".") ? note : `${note}.`;
  return LINE[event.kind];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function historyDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}
