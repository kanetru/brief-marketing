import { acceptQueries, namedQueries, selectLiveQueries } from "../src/domain/market/context";
import { MARKET_DISCOVERY_LIMITS } from "../src/domain/market/limits";
import {
  candidateId,
  chooseEnrichment,
  clientClaimFor,
  contextTerms,
  dedupeCandidates,
  poolCandidates,
  preRank,
  proposeIdentities,
  publicProfileUrl,
} from "../src/domain/market/rank";
import type {
  CompetitorDiscoveryContext,
  MarketDiscoverySet,
  NormalizedSocialPost,
  SocialAccountCandidate,
  SocialDiscoveryQuery,
  SocialProviderStatus,
} from "../src/types/marketDiscovery";
import { callEnsemble, type EnsembleCache, type EnsembleCallResult } from "./ensembleClient";
import {
  parseInstagramDetailed,
  parseInstagramSearch,
  parseTikTokInfo,
  parseTikTokKeywordAuthors,
  parseTikTokPosts,
  parseTikTokUserSearch,
  type ParsedSearchHit,
} from "./ensembleParse";
import { classifyCandidates, generateDiscoveryQueries } from "./marketReason";

export interface DiscoverInput {
  context: CompetitorDiscoveryContext;
  queries?: SocialDiscoveryQuery[];
  executeQueryIds?: string[];
  refresh?: boolean;
  now: string;
}

export interface DiscoverDeps {
  fetchImpl: typeof fetch;
  cache: EnsembleCache;
  token: string;
  openaiKey: string;
}

export interface DiscoverResponse {
  ok: boolean;
  failure: "not_configured" | "authentication_failed" | "unavailable" | null;
  message: string;
  set: MarketDiscoverySet | null;
  candidates: SocialAccountCandidate[];
  assessments: import("../src/types/marketDiscovery").MarketAccountAssessment[];
  proposals: import("../src/types/marketDiscovery").IdentityProposal[];
  usage: import("../src/types/marketDiscovery").ProviderUsageRecord[];
  origin: SocialProviderStatus;
}

export async function runMarketDiscovery(input: DiscoverInput, deps: DiscoverDeps): Promise<DiscoverResponse> {
  const queries = await resolveQueries(input, deps);
  if (queries.length === 0) {
    return failed(input, null, deps.token ? "unavailable" : "not_configured");
  }
  const set = makeSet(input, queries);
  if (!deps.token) return { ...failed(input, set, "not_configured"), set };
  const selected = chooseExecution(queries, input.executeQueryIds);
  set.executedQueryIds = selected.map((item) => item.id);
  const usage: DiscoverResponse["usage"] = [];
  const found: SocialAccountCandidate[] = [];
  let failure: DiscoverResponse["failure"] = null;
  let keywordUsed = false;
  for (const query of selected) {
    const calls = searchCalls(query, keywordUsed);
    if (query.platform === "tiktok" && query.queryType === "hashtag") keywordUsed = true;
    for (const call of calls) {
      const result = await callEnsemble(call, { fetchImpl: deps.fetchImpl, now: input.now, refresh: Boolean(input.refresh), cache: deps.cache, token: deps.token });
      usage.push(result.usage);
      if (result.failure === "authentication_failed" || result.failure === "rate_limited") {
        failure = result.failure === "rate_limited" ? "unavailable" : "authentication_failed";
        break;
      }
      if (!result.ok) continue;
      found.push(...hitsToCandidates(hitsFor(call.endpoint, result), query, input, result.usage.cached ? "cached" : "live"));
    }
    if (failure) break;
  }
  const deduped = dedupeCandidates(found);
  const terms = contextTerms([input.context.whatTheyDo, input.context.offers, input.context.category, input.context.audience, input.context.customerLanguage]);
  const ranked = preRank(deduped, queries, terms);
  const pooled = poolCandidates(ranked);
  const toEnrich = chooseEnrichment(ranked.filter((item) => pooled.some((candidate) => candidate.id === item.candidate.id)));
  const enriched = [...pooled];
  for (const candidate of toEnrich) {
    if (failure) break;
    const next = await enrich(candidate, input.now, deps, usage, Boolean(input.refresh));
    if (next.failure) {
      failure = next.failure;
      break;
    }
    const index = enriched.findIndex((item) => item.id === candidate.id);
    if (index >= 0 && next.candidate) enriched[index] = next.candidate;
  }
  if (failure && enriched.every((item) => item.sourceQueries.length === 0)) {
    return { ...failed(input, set, failure), set, usage };
  }
  if (found.length === 0) {
    return { ...failed(input, set, failure ?? "unavailable"), set, usage };
  }
  const judged = enriched.filter((item) => item.enriched || item.clientClaim);
  const assessments = deps.openaiKey
    ? await classifyCandidates(input.context, judged, deps.fetchImpl, deps.openaiKey) ?? []
    : [];
  const origin = usage.some((item) => item.success && !item.cached) ? "live" : usage.some((item) => item.success) ? "cached" : "unavailable";
  return {
    ok: origin !== "unavailable",
    failure: origin === "unavailable" ? (failure ?? "unavailable") : null,
    message: origin === "unavailable" ? "Discovery unavailable" : "",
    set,
    candidates: enriched,
    assessments,
    proposals: proposeIdentities(enriched),
    usage,
    origin,
  };
}

async function resolveQueries(input: DiscoverInput, deps: DiscoverDeps): Promise<SocialDiscoveryQuery[]> {
  if (input.queries && input.queries.length > 0) return acceptQueries(input.queries, input.context);
  if (deps.openaiKey) {
    const generated = await generateDiscoveryQueries(input.context, deps.fetchImpl, deps.openaiKey);
    if (generated && generated.length > 0) return generated;
  }
  return namedQueries(input.context, input.now);
}

function chooseExecution(queries: SocialDiscoveryQuery[], ids: string[] | undefined): SocialDiscoveryQuery[] {
  if (!ids || ids.length === 0) return selectLiveQueries(queries, MARKET_DISCOVERY_LIMITS.livePerPlatform);
  const wanted = new Set(ids);
  const picked = queries.filter((item) => wanted.has(item.id));
  return selectLiveQueries(picked, MARKET_DISCOVERY_LIMITS.hardCapPerPlatform);
}

function searchCalls(query: SocialDiscoveryQuery, keywordUsed: boolean): Parameters<typeof callEnsemble>[0][] {
  if (query.platform === "instagram") {
    return [{ endpoint: "/instagram/search", platform: "instagram", purpose: "discovery_search", params: { text: query.query } }];
  }
  const calls: Parameters<typeof callEnsemble>[0][] = [
    { endpoint: "/tt/user/search", platform: "tiktok", purpose: "discovery_search", params: { keyword: query.query } },
  ];
  if (query.queryType === "hashtag" && !keywordUsed) {
    calls.push({ endpoint: "/tt/keyword/search", platform: "tiktok", purpose: "discovery_search", params: { name: query.query.replace(/^#/, ""), period: "30" } });
  }
  return calls;
}

function hitsFor(endpoint: string, result: EnsembleCallResult): ParsedSearchHit[] {
  if (endpoint === "/instagram/search") return parseInstagramSearch(result.data);
  if (endpoint === "/tt/user/search") return parseTikTokUserSearch(result.data);
  if (endpoint === "/tt/keyword/search") return parseTikTokKeywordAuthors(result.data);
  return [];
}

function hitsToCandidates(hits: ParsedSearchHit[], query: SocialDiscoveryQuery, input: DiscoverInput, providerStatus: "live" | "cached"): SocialAccountCandidate[] {
  return hits.map((hit) => ({
    id: candidateId(hit.platform, hit.handle),
    platform: hit.platform,
    handle: hit.handle.replace(/^@/, ""),
    displayName: hit.displayName,
    bio: hit.bio,
    profileUrl: publicProfileUrl(hit.platform, hit.handle),
    website: "",
    followers: hit.followers,
    following: hit.following,
    recentPosts: [],
    sourceQueries: [query.id],
    discoveryFrequency: 1,
    providerStatus,
    retrievedAt: input.now,
    clientClaim: clientClaimFor(hit.displayName, hit.handle, input.context.knownCompetitors),
    enriched: false,
  }));
}

async function enrich(
  candidate: SocialAccountCandidate,
  now: string,
  deps: DiscoverDeps,
  usage: DiscoverResponse["usage"],
  refresh: boolean,
): Promise<{ candidate: SocialAccountCandidate | null; failure: DiscoverResponse["failure"] }> {
  if (candidate.platform === "instagram") {
    const result = await callEnsemble({
      endpoint: "/instagram/user/detailed-info",
      platform: "instagram",
      purpose: "candidate_profile",
      params: { username: candidate.handle },
    }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
    usage.push(result.usage);
    if (result.failure === "authentication_failed") return { candidate: null, failure: "authentication_failed" };
    if (result.failure === "rate_limited") return { candidate: null, failure: "unavailable" };
    if (!result.ok) return { candidate: null, failure: null };
    const detail = parseInstagramDetailed(result.data, now);
    return { candidate: mergeEnrichment(candidate, detail, detail.posts, result.usage.cached ? "cached" : "live", now), failure: null };
  }
  const info = await callEnsemble({
    endpoint: "/tt/user/info",
    platform: "tiktok",
    purpose: "candidate_profile",
    params: { username: candidate.handle },
  }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
  usage.push(info.usage);
  if (info.failure === "authentication_failed") return { candidate: null, failure: "authentication_failed" };
  if (info.failure === "rate_limited") return { candidate: null, failure: "unavailable" };
  if (!info.ok) return { candidate: null, failure: null };
  const posts = await callEnsemble({
    endpoint: "/tt/user/posts",
    platform: "tiktok",
    purpose: "candidate_posts",
    params: { username: candidate.handle, depth: "1" },
  }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
  usage.push(posts.usage);
  if (posts.failure === "authentication_failed") return { candidate: null, failure: "authentication_failed" };
  const profile = parseTikTokInfo(info.data);
  const recent = posts.ok ? parseTikTokPosts(posts.data, candidate.handle, now).slice(0, MARKET_DISCOVERY_LIMITS.postsPerAccount) : [];
  const status: SocialProviderStatus = info.usage.cached && (!posts.ok || posts.usage.cached) ? "cached" : "live";
  return { candidate: mergeEnrichment(candidate, profile, recent, status, now), failure: null };
}

function mergeEnrichment(
  candidate: SocialAccountCandidate,
  detail: Partial<SocialAccountCandidate>,
  posts: NormalizedSocialPost[],
  status: SocialProviderStatus,
  now: string,
): SocialAccountCandidate {
  return {
    ...candidate,
    displayName: detail.displayName || candidate.displayName,
    bio: detail.bio || candidate.bio,
    website: detail.website || candidate.website,
    followers: detail.followers ?? candidate.followers,
    following: detail.following ?? candidate.following,
    recentPosts: posts.slice(0, MARKET_DISCOVERY_LIMITS.postsPerAccount),
    providerStatus: status,
    retrievedAt: now,
    enriched: true,
  };
}

function makeSet(input: DiscoverInput, queries: SocialDiscoveryQuery[]): MarketDiscoverySet {
  return {
    clientId: input.context.clientId,
    queries,
    executedQueryIds: [],
    generatedAt: input.now,
    brandBrainVersion: input.context.brandBrainVersion,
    approvedByManager: false,
  };
}

function failed(input: DiscoverInput, set: MarketDiscoverySet | null, failure: NonNullable<DiscoverResponse["failure"]>): DiscoverResponse {
  return {
    ok: false,
    failure,
    message: "Discovery unavailable",
    set,
    candidates: [],
    assessments: [],
    proposals: [],
    usage: [],
    origin: "unavailable",
  };
}
