import type { DiscoverySession } from "../../types/discovery";
import type { DiscoveryStatus } from "../../types/project";

/** Sections a discovery link is allowed to render. Strategy is not among them. */
export const CLIENT_SECTIONS = [
  "welcome",
  "business",
  "audience",
  "goals",
  "personality",
  "spectrum",
  "visual",
  "colour",
  "type",
  "imagery",
  "voice",
  "inspiration",
  "clarify",
  "complete",
] as const;

const INTELLIGENCE = ["understanding", "competitors", "opportunities", "assets", "agent_pack", "strategy", "evidence", "history"] as const;

export type IntelligenceResource = (typeof INTELLIGENCE)[number];

export function clientCanSeeIntelligence(_resource: IntelligenceResource): false {
  return false;
}

export function clientDestination(status: DiscoveryStatus): "discovery" | "complete" | "follow_up" {
  if (status === "follow_up_requested") return "follow_up";
  if (status === "submitted" || status === "follow_up_complete" || status === "closed") return "complete";
  return "discovery";
}

export function completionMessage(managerName: string): { title: string; body: string; next: string } {
  const name = managerName.trim() || "your manager";
  return {
    title: "That's it.",
    body: `Your answers have been sent to ${name}.`,
    next: "You can leave this here.",
  };
}

export function clientContribution(session: DiscoverySession): { answered: number; visuals: number; references: number } {
  const texts = [
    session.business.name,
    session.business.description,
    session.business.peopleComeFor,
    session.audience.bestCustomers,
    session.goals.twelveMonthSuccess,
    session.voicePreferences.preferredLanguage,
    session.voicePreferences.avoidedLanguage,
  ];
  const answered = texts.filter((item) => item.state === "evidence" && item.evidence.raw.trim()).length
    + (session.business.differentiation.state === "evidence" ? 1 : 0)
    + (session.audience.desiredCustomers.state === "evidence" || session.audience.desiredCustomers.state === "same_as_current" ? 1 : 0)
    + (session.goals.outcomes.selected.length > 0 ? 1 : 0)
    + (session.personality.attract.selected.length > 0 ? 1 : 0);
  const visuals = session.visualPreferences.comparisons.filter((item) => item.choice.state === "selected").length
    + session.colourPreferences.preferredPaletteIds.length
    + session.typographyPreferences.preferredDirectionIds.length
    + session.imageryPreferences.preferredDirectionIds.length;
  const references = session.inspiration.positiveReferences.length + session.inspiration.negativeReferences.length;
  return { answered, visuals, references };
}
