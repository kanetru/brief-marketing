import { assembleBrandBrain } from "../intelligence/brain";
import { textValue } from "../../state/textEvidence";
import type { BriefProject, ProjectIntelligence } from "../../types/project";
import type { CompetitorDiscoveryContext, SocialDiscoveryQuery, SocialPlatform } from "../../types/marketDiscovery";
import { MARKET_DISCOVERY_LIMITS } from "./limits";

const QUERY_TYPES = new Set([
  "category",
  "offer",
  "customer_problem",
  "customer_language",
  "geography",
  "hashtag",
  "adjacent_category",
  "client_named",
]);

export function discoveryContext(project: BriefProject, intelligence: ProjectIntelligence): CompetitorDiscoveryContext {
  const brain = assembleBrandBrain(project, intelligence);
  const inputs = project.discovery.strategyInputs;
  const site = project.websiteResearch?.site;
  const problems = [
    inputs ? textValue(inputs.hesitate) : "",
    inputs ? textValue(inputs.hateAlternatives) : "",
    inputs ? textValue(inputs.stopsThem) : "",
  ].filter(Boolean);
  const themes = intelligence.strategy.territories.map((item) => item.name).filter(Boolean);
  const knownCompetitors = uniqueNames([
    ...splitNames(inputs ? textValue(inputs.neighbours) : ""),
    ...project.competitors.map((item) => item.name),
  ]);
  const knownMarketReferences = uniqueNames(
    project.discovery.inspiration.positiveReferences.map((item) => item.name),
  );
  const websiteResearch = [
    site?.positioning ?? "",
    ...(site?.offers ?? []),
    ...(site?.audienceSignals ?? []),
  ].filter(Boolean).join(" ");
  return {
    clientId: project.id,
    clientName: project.businessName || brain.identity,
    whatTheyDo: brain.business,
    category: project.category || brain.category,
    offers: brain.offers,
    highValueOffers: brain.commercialPriorities,
    audience: brain.customers,
    customerProblems: problems.join(" "),
    customerLanguage: brain.verbalIdentity,
    geography: "",
    positioning: brain.positioning,
    differentiation: brain.differentiation,
    contentThemes: themes.join(", "),
    knownCompetitors,
    knownMarketReferences,
    websiteResearch,
    discoveryEvidence: brain.facts.slice(0, 8),
    managerNotes: project.managerNotes.trim(),
    brandBrainVersion: `${project.id}:${project.version}`,
  };
}

export function namedQueries(context: CompetitorDiscoveryContext, now: string): SocialDiscoveryQuery[] {
  const stamp = now.replace(/[^0-9]/g, "").slice(0, 12);
  return context.knownCompetitors.flatMap((name, index) => {
    const phrase = name.trim();
    if (!phrase) return [];
    return (["instagram", "tiktok"] as const).map((platform) => ({
      id: `named-${platform}-${index}-${stamp}`,
      query: phrase,
      platform,
      queryType: "client_named" as const,
      rationale: "The client named this. Brief is looking it up. The name is not proof they compete.",
    }));
  });
}

export function acceptQueries(
  raw: readonly SocialDiscoveryQuery[],
  context: CompetitorDiscoveryContext,
): SocialDiscoveryQuery[] {
  const seen = new Set<string>();
  const accepted: SocialDiscoveryQuery[] = [];
  const counts: Record<SocialPlatform, number> = { instagram: 0, tiktok: 0 };
  const named = namedQueries(context, context.brandBrainVersion);
  for (const item of [...named, ...raw]) {
    const query = item.query.trim().replace(/^#/, "");
    const platform = item.platform === "tiktok" ? "tiktok" : item.platform === "instagram" ? "instagram" : "";
    if (!query || !platform) continue;
    if (query.length > 80) continue;
    const key = `${platform}:${query.toLowerCase()}`;
    if (seen.has(key)) continue;
    if (counts[platform] >= MARKET_DISCOVERY_LIMITS.maxQueriesPerPlatform) continue;
    seen.add(key);
    counts[platform] += 1;
    accepted.push({
      id: item.id.trim() || `q-${platform}-${accepted.length + 1}`,
      query,
      platform,
      queryType: QUERY_TYPES.has(item.queryType) ? item.queryType : "category",
      rationale: item.rationale.trim() || "This search follows from the client's own description.",
    });
  }
  return accepted;
}

export function addSearch(recordQueries: SocialDiscoveryQuery[], query: string, platform: SocialPlatform): SocialDiscoveryQuery[] {
  const phrase = query.trim().replace(/^#/, "");
  if (!phrase) return recordQueries;
  const id = `manager-${platform}-${phrase.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`;
  if (recordQueries.some((item) => item.platform === platform && item.query.toLowerCase() === phrase.toLowerCase())) return recordQueries;
  return [...recordQueries, { id, query: phrase, platform, queryType: "category", rationale: "Added by the manager." }];
}

export function removeSearch(queries: SocialDiscoveryQuery[], id: string): SocialDiscoveryQuery[] {
  return queries.filter((item) => item.id !== id);
}

/** Which saved searches to send. Client-named and a spread of types go first. */
export function selectLiveQueries(queries: readonly SocialDiscoveryQuery[], perPlatform = MARKET_DISCOVERY_LIMITS.livePerPlatform): SocialDiscoveryQuery[] {
  const cap = Math.min(perPlatform, MARKET_DISCOVERY_LIMITS.hardCapPerPlatform);
  const chosen: SocialDiscoveryQuery[] = [];
  for (const platform of ["instagram", "tiktok"] as const) {
    const pool = queries.filter((item) => item.platform === platform);
    const named = pool.filter((item) => item.queryType === "client_named");
    const rest = pool.filter((item) => item.queryType !== "client_named");
    const spread = spreadTypes(rest);
    chosen.push(...[...named, ...spread].slice(0, cap));
  }
  return chosen;
}

function spreadTypes(queries: SocialDiscoveryQuery[]): SocialDiscoveryQuery[] {
  const buckets = new Map<string, SocialDiscoveryQuery[]>();
  for (const query of queries) {
    const list = buckets.get(query.queryType) ?? [];
    list.push(query);
    buckets.set(query.queryType, list);
  }
  const out: SocialDiscoveryQuery[] = [];
  const lists = [...buckets.values()];
  let moved = true;
  while (moved) {
    moved = false;
    for (const list of lists) {
      const next = list.shift();
      if (!next) continue;
      out.push(next);
      moved = true;
    }
  }
  return out;
}

export function splitNames(value: string): string[] {
  return value
    .split(/[\n,;]|(?:\s+and\s+)/i)
    .map((item) => item.replace(/^[\s\-–—]+|[\s.]+$/g, "").trim())
    .filter((item) => item.length > 1 && item.length < 80);
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
