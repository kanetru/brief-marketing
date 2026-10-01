import type { CategorySynthesis, CompetitorInput, CompetitorProfile } from "../../types/project";

/**
 * A future search integration implements this. Nothing in the app calls the network from here.
 * Until a provider is configured, competitor profiles use manager notes or stay unavailable.
 */
export interface CompetitorResearchProvider {
  readonly id: string;
  research(input: CompetitorInput): Promise<{
    apparentPositioning?: string;
    headline?: string;
    audience?: string;
    offer?: string;
    tone?: string;
    visualConventions?: string;
    contentThemes?: string;
    proof?: string;
    callsToAction?: string;
    language?: string;
    strengths?: string;
    weaknesses?: string;
    differentiation?: string;
  } | null>;
}

export function configuredResearchProvider(): CompetitorResearchProvider | null {
  return null;
}

export function profileCompetitor(input: CompetitorInput, researched: boolean): CompetitorProfile {
  const base: CompetitorProfile = {
    id: input.id,
    name: input.name.trim() || "Unnamed competitor",
    website: input.website.trim(),
    basis: "unavailable",
    apparentPositioning: "",
    headline: "",
    audience: "",
    offer: "",
    tone: "",
    visualConventions: "",
    contentThemes: "",
    proof: "",
    callsToAction: "",
    language: "",
    strengths: "",
    weaknesses: "",
    differentiation: "",
    evidenceIds: [],
    unavailableReason: "",
  };
  if (researched) {
    return {
      ...base,
      basis: "research",
      unavailableReason: "",
      evidenceIds: [`competitor.${input.id}`],
    };
  }
  if (!input.notes.trim()) {
    return {
      ...base,
      unavailableReason: "No research provider is configured, and this competitor has no manager notes. Brief has not visited the website.",
    };
  }
  return {
    ...base,
    basis: "manager_notes",
    apparentPositioning: input.notes.trim(),
    evidenceIds: [`competitor.${input.id}`],
    unavailableReason: "",
  };
}

export function synthesiseCategory(profiles: CompetitorProfile[], clientDifference: string): CategorySynthesis | null {
  const grounded = profiles.filter((profile) => profile.basis !== "unavailable");
  if (grounded.length === 0) return null;
  const notes = grounded.map((profile) => profile.apparentPositioning).filter(Boolean);
  return {
    basis: grounded.every((profile) => profile.basis === "manager_notes") ? "manager_notes" : "research",
    observation: "These comparisons use only what was supplied. Brief has not browsed the competitor sites.",
    commonClaims: [],
    visualSameness: [],
    languageInCommon: [],
    whiteSpace: notes.length > 0 ? ["Read the notes against what the client actually said they do, and keep any overlap explicit."] : [],
    avoidCopying: ["Do not turn these notes into claims about the competitor's real advertising."],
    clientDifference: clientDifference ? [clientDifference] : [],
    evidenceIds: grounded.flatMap((profile) => profile.evidenceIds),
  };
}
