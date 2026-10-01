import type { CategoryPattern, CategorySynthesis, CompetitorInput, CompetitorProfile, StoredResearch } from "../../types/project";
import { observationHasSubstance } from "./pageExtract";

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

export function profileCompetitor(input: CompetitorInput, researched: boolean | StoredResearch | null = false): CompetitorProfile {
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
  const research = typeof researched === "object" && researched ? researched : null;
  const page = research && observationHasSubstance(research.observation) ? research.observation : null;
  if (page) {
    return {
      ...base,
      basis: "research",
      headline: page.headline,
      apparentPositioning: page.excerpt || page.description,
      callsToAction: page.callsToAction.join("; "),
      language: page.recurringLanguage.join(", "),
      evidenceIds: [`competitor.${input.id}`],
      unavailableReason: "",
    };
  }
  if ((researched === true || research) && !input.notes.trim()) {
    return {
      ...base,
      unavailableReason: research?.unavailableReason || "Research was requested but no page came back. Brief has not invented a profile.",
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
  const patterns = [...repeatedPatterns(grounded), ...whitespacePatterns(grounded, clientDifference)];
  const browsed = grounded.every((profile) => profile.basis === "research");
  return {
    basis: browsed ? "research" : "manager_notes",
    observation: browsed
      ? "These comparisons use only pages that were retrieved. Empty fields were not filled in."
      : "These comparisons use only what was supplied. Brief has not browsed the competitor sites.",
    commonClaims: patterns.filter((pattern) => pattern.title === "Category pattern").map((pattern) => pattern.statement),
    visualSameness: patterns.filter((pattern) => pattern.title === "Visual pattern").map((pattern) => pattern.statement),
    languageInCommon: patterns.filter((pattern) => pattern.title === "Language pattern").map((pattern) => pattern.statement),
    whiteSpace: patterns.filter((pattern) => pattern.title === "White space").map((pattern) => pattern.statement),
    avoidCopying: ["Do not turn these notes into claims about a competitor's real advertising unless a page was retrieved."],
    clientDifference: clientDifference ? [clientDifference] : [],
    evidenceIds: grounded.flatMap((profile) => profile.evidenceIds),
    patterns,
  };
}

const PATTERN_STOP = new Set(["about", "their", "which", "there", "these", "those", "where", "while", "would", "could", "should", "other", "after", "before", "people", "business", "company", "brand", "every", "piece", "pieces", "client", "notes"]);
const VISUAL_WORDS = new Set(["interior", "interiors", "finished", "photograph", "photography", "portrait", "texture", "styled"]);

function repeatedPatterns(profiles: CompetitorProfile[]): CategoryPattern[] {
  if (profiles.length < 2) return [];
  const texts = profiles.map((profile) => [profile.apparentPositioning, profile.headline, profile.language, profile.visualConventions].join(" "));
  const counts = new Map<string, number>();
  texts.forEach((text) => {
    for (const word of new Set(text.toLowerCase().match(/[a-z]{6,}/g) ?? [])) {
      if (PATTERN_STOP.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  });
  const patterns: CategoryPattern[] = [];
  for (const [word, count] of counts) {
    if (count < 2) continue;
    const holders = profiles.filter((_, index) => texts[index]?.toLowerCase().includes(word));
    const visual = VISUAL_WORDS.has(word);
    patterns.push({
      id: `pattern-${word}`,
      title: visual ? "Visual pattern" : "Category pattern",
      statement: `"${word}" appears in ${count} of ${profiles.length} competitor sources on record.`,
      count,
      total: profiles.length,
      evidenceIds: holders.flatMap((profile) => profile.evidenceIds),
      epistemicStatus: "hypothesis",
    });
  }
  return patterns.slice(0, 4);
}

function whitespacePatterns(profiles: CompetitorProfile[], clientText: string): CategoryPattern[] {
  if (profiles.length < 2 || !clientText.trim()) return [];
  const blob = profiles.map((profile) => profile.apparentPositioning).join(" ").toLowerCase();
  const client = clientText.toLowerCase();
  const clientMaking = /made|making|workshop|process|joint|built/.test(client);
  const theyShowMaking = /made|making|workshop|process|joint|built/.test(blob);
  if (!clientMaking || theyShowMaking) return [];
  return [{
    id: "pattern-making-gap",
    title: "White space",
    statement: "Making is largely absent from the competitor sources. The client's own words keep returning to how the work is made. There may be room to make that part of the story. This is a hypothesis, not a decision.",
    count: profiles.length,
    total: profiles.length,
    evidenceIds: ["business.description", ...profiles.flatMap((profile) => profile.evidenceIds)],
    epistemicStatus: "hypothesis",
  }];
}
