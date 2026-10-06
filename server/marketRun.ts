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
import { emptyStages, mergeCompleted, searchKey, stageOf } from "../src/domain/market/stages";
import type {
  CompetitorDiscoveryContext,
  CompletedSearch,
  MarketDiscoverySet,
  MarketRetry,
  NormalizedSocialPost,
  ResearchStages,
  SocialAccountCandidate,
  SocialDiscoveryQuery,
  SocialProviderStatus,
  TechnicalDetail,
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
import { marketLog } from "./marketLog";
import { classifyCandidates, generateDiscoveryQueries } from "./marketReason";

export interface DiscoverInput {
  context: CompetitorDiscoveryContext;
  queries?: SocialDiscoveryQuery[];
  executeQueryIds?: string[];
  refresh?: boolean;
  now: string;
  retry?: MarketRetry;
  previousCandidates?: SocialAccountCandidate[];
  completedSearches?: CompletedSearch[];
  previousStages?: ResearchStages;
  previousOrigin?: SocialProviderStatus;
}

export interface DiscoverDeps {
  fetchImpl: typeof fetch;
  cache: EnsembleCache;
  token: string;
  openaiKey: string;
  log?: (line: string) => void;
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
  stages?: ResearchStages;
  technical?: TechnicalDetail[];
  completedSearches?: CompletedSearch[];
}

export async function runMarketDiscovery(input: DiscoverInput, deps: DiscoverDeps): Promise<DiscoverResponse> {
  const log = (line: string) => marketLog(line, { log: deps.log, secrets: [deps.token, deps.openaiKey] });
  log("[market-discovery] context ready");
  const stages: ResearchStages = { ...(input.previousStages ?? emptyStages()) };
  const technical: TechnicalDetail[] = [];
  if (input.retry === "classification") return classifyOnly(input, deps, stages, technical, log);
  if (input.retry === "enrichment") return enrichOnly(input, deps, stages, technical, log);

  const queries = await resolveQueries(input, deps, stages, technical, log);
  if (queries.length === 0) {
    log("[market-discovery] FAILED\nstage: query_generation\nmessage: no searches to run");
    return failed(input, null, deps.token ? "unavailable" : "not_configured", stages, technical, input.completedSearches ?? [], []);
  }
  const set = makeSet(input, queries);
  if (!deps.token) {
    technical.push({ stage: "EnsembleData", message: "Not configured" });
    log("[market-discovery] FAILED\nstage: provider\nmessage: Not configured");
    return failed(input, set, "not_configured", stages, technical, input.completedSearches ?? [], []);
  }

  const platforms = input.retry === "instagram" || input.retry === "tiktok" ? [input.retry] : ["instagram", "tiktok"] as const;
  const selected = chooseExecution(queries, input.executeQueryIds).filter((item) => platforms.includes(item.platform));
  set.executedQueryIds = selected.map((item) => item.id);
  const usage: DiscoverResponse["usage"] = [];
  const found: SocialAccountCandidate[] = [];
  const completed = [...(input.completedSearches ?? [])];
  const done = new Set(completed.map(searchKey));
  const blocked = new Set<string>();
  let keywordUsed = false;
  let failure: DiscoverResponse["failure"] = null;
  const attempted = { instagram: 0, tiktok: 0 };
  const succeeded = { instagram: 0, tiktok: 0 };
  const platformFailure: Partial<Record<"instagram" | "tiktok", TechnicalDetail>> = {};

  for (const query of selected) {
    if (blocked.has(query.platform)) continue;
    const calls = searchCalls(query, keywordUsed);
    if (query.platform === "tiktok" && query.queryType === "hashtag") keywordUsed = true;
    for (const call of calls) {
      const key = searchKey({ platform: query.platform, query: query.query, endpoint: call.endpoint });
      if (!input.refresh && done.has(key)) {
        log(`[market-discovery] skipped completed ${call.endpoint}`);
        continue;
      }
      attempted[query.platform] += 1;
      const result = await callEnsemble(call, { fetchImpl: deps.fetchImpl, now: input.now, refresh: Boolean(input.refresh), cache: deps.cache, token: deps.token });
      usage.push(result.usage);
      const path = call.endpoint.replace(/^\//, "");
      log(`[ensembledata] ${path} → ${result.httpStatus ?? "error"}`);
      if (!result.ok) {
        const detail = { stage: query.platform === "instagram" ? "Instagram search" : "TikTok search", httpStatus: result.httpStatus, message: result.safeMessage };
        technical.push(detail);
        platformFailure[query.platform] = detail;
        failure = result.failure === "authentication_failed" ? "authentication_failed" : failure ?? "unavailable";
        log(`[market-discovery] FAILED\nstage: ${query.platform === "instagram" ? "instagram_search" : "tiktok_search"}\nstatus: ${result.httpStatus ?? ""}\nmessage: ${result.safeMessage}`);
        if (result.failure === "authentication_failed" || result.failure === "rate_limited") blocked.add(query.platform);
        continue;
      }
      const hits = hitsFor(call.endpoint, result);
      log(`[ensembledata] ${path} returned ${hits.length} ${call.endpoint.includes("keyword") ? "accounts" : "users"}`);
      completed.push({ platform: query.platform, query: query.query, endpoint: call.endpoint });
      done.add(key);
      succeeded[query.platform] += 1;
      found.push(...hitsToCandidates(hits, query, input, result.usage.cached ? "cached" : "live"));
    }
  }

  for (const platform of ["instagram", "tiktok"] as const) {
    if (input.retry && input.retry !== platform) continue;
    const problem = platformFailure[platform];
    if (problem && succeeded[platform] === 0 && (attempted[platform] > 0 || blocked.has(platform))) {
      stages[platform] = stageOf("failed", problem.message, problem.httpStatus);
    } else if (problem && succeeded[platform] > 0) {
      stages[platform] = stageOf("partial", problem.message, problem.httpStatus);
    } else if (succeeded[platform] > 0 || completed.some((item) => item.platform === platform)) {
      stages[platform] = stageOf("complete");
    }
  }

  const previous = input.previousCandidates ?? [];
  if (attempted.instagram + attempted.tiktok === 0 && previous.length > 0 && found.length === 0 && !input.refresh) {
    log("[market-discovery] persisted");
    return finish(input, set, previous, [], usage, input.previousStages ?? stages, [], completed, null);
  }
  const deduped = dedupeCandidates([...previous, ...found]);
  log(`[market-discovery] deduped to ${deduped.length} candidates`);
  const terms = contextTerms([input.context.whatTheyDo, input.context.offers, input.context.category, input.context.audience, input.context.customerLanguage]);
  const ranked = preRank(deduped, queries, terms);
  const pooled = poolCandidates(ranked);
  const poolIds = new Set(pooled.map((item) => item.id));
  const toEnrich = chooseEnrichment(ranked.filter((item) => poolIds.has(item.candidate.id) && (input.refresh || !item.candidate.enriched)))
    .filter((item) => !input.retry || input.retry === item.platform || previous.every((saved) => saved.id !== item.id));
  const enriched = await enrichAll(toEnrich, pooled, input, deps, usage, stages, technical, log);
  if (enriched.length === 0 && (stages.instagram.status === "failed" || stages.tiktok.status === "failed" || stages.queries.status === "failed")) {
    return failed(input, set, failure ?? "unavailable", stages, technical, completed, usage);
  }
  if (found.length === 0 && previous.length === 0 && enriched.length === 0) {
    const quiet = stages.instagram.status !== "failed" && stages.tiktok.status !== "failed";
    if (quiet && usage.some((item) => item.success)) {
      log("[market-discovery] persisted");
      return finish(input, set, enriched, [], usage, stages, [], completed, null);
    }
    return failed(input, set, failure ?? "unavailable", stages, technical, completed, usage);
  }
  const assessments = await classify(input, deps, enriched, stages, technical, log);
  log("[market-discovery] persisted");
  return finish(input, set, enriched, assessments, usage, stages, technical, completed, null);
}

async function classifyOnly(
  input: DiscoverInput,
  deps: DiscoverDeps,
  stages: ResearchStages,
  technical: TechnicalDetail[],
  log: (line: string) => void,
): Promise<DiscoverResponse> {
  const candidates = input.previousCandidates ?? [];
  const set = input.queries && input.queries.length > 0 ? makeSet(input, acceptQueries(input.queries, input.context)) : null;
  const assessments = await classify(input, deps, candidates, stages, technical, log);
  log("[market-discovery] persisted");
  const failedClassification = stages.classification.status === "failed";
  return finish(input, set, candidates, assessments, [], stages, technical, input.completedSearches ?? [], failedClassification && candidates.length === 0 ? "unavailable" : null);
}

async function enrichOnly(
  input: DiscoverInput,
  deps: DiscoverDeps,
  stages: ResearchStages,
  technical: TechnicalDetail[],
  log: (line: string) => void,
): Promise<DiscoverResponse> {
  const previous = input.previousCandidates ?? [];
  const pending = previous.filter((item) => !item.enriched);
  const usage: DiscoverResponse["usage"] = [];
  const enriched = await enrichAll(pending, previous, input, deps, usage, stages, technical, log);
  const assessments = stages.classification.status === "complete"
    ? []
    : await classify(input, deps, enriched, stages, technical, log);
  log("[market-discovery] persisted");
  return finish(input, input.queries?.length ? makeSet(input, input.queries) : null, enriched, assessments, usage, stages, technical, input.completedSearches ?? [], null);
}

async function resolveQueries(
  input: DiscoverInput,
  deps: DiscoverDeps,
  stages: ResearchStages,
  technical: TechnicalDetail[],
  log: (line: string) => void,
): Promise<SocialDiscoveryQuery[]> {
  if (input.queries && input.queries.length > 0 && input.retry) {
    stages.queries = stageOf(stages.queries.status === "not_started" ? "complete" : stages.queries.status);
    return acceptQueries(input.queries, input.context);
  }
  if (input.queries && input.queries.length > 0) {
    stages.queries = stageOf("complete");
    return acceptQueries(input.queries, input.context);
  }
  if (deps.openaiKey) {
    log("[market-discovery] query generation started");
    const generated = await generateDiscoveryQueries(input.context, deps.fetchImpl, deps.openaiKey);
    if (generated.value && generated.value.length > 0) {
      const instagram = generated.value.filter((item) => item.platform === "instagram").length;
      const tiktok = generated.value.filter((item) => item.platform === "tiktok").length;
      log(`[market-discovery] generated ${instagram} Instagram queries`);
      log(`[market-discovery] generated ${tiktok} TikTok queries`);
      stages.queries = stageOf("complete");
      return generated.value;
    }
    const message = generated.message || "Structured response could not be parsed";
    log(`[market-discovery] FAILED\nstage: query_generation\nstatus: ${generated.httpStatus ?? ""}\nmessage: ${message}`);
    technical.push({ stage: "Market query generation", ...(generated.httpStatus ? { httpStatus: generated.httpStatus } : {}), message });
    stages.queries = stageOf("failed", message, generated.httpStatus);
  }
  const named = namedQueries(input.context, input.now);
  if (named.length > 0) {
    log("[market-discovery] query generation failed, using client-named searches");
    stages.queries = stageOf("partial", "Using the competitors the client named");
    return named;
  }
  return [];
}

async function enrichAll(
  toEnrich: SocialAccountCandidate[],
  pooled: SocialAccountCandidate[],
  input: DiscoverInput,
  deps: DiscoverDeps,
  usage: DiscoverResponse["usage"],
  stages: ResearchStages,
  technical: TechnicalDetail[],
  log: (line: string) => void,
): Promise<SocialAccountCandidate[]> {
  const enriched = [...pooled];
  if (toEnrich.length === 0) {
    if (enriched.some((item) => item.enriched)) stages.enrichment = stageOf(stages.enrichment.status === "failed" ? "failed" : "complete");
    return enriched;
  }
  log(`[market-discovery] enriching ${toEnrich.length} candidates`);
  let okCount = 0;
  let failedCount = 0;
  let stop = false;
  for (const candidate of toEnrich) {
    if (stop) break;
    const next = await enrich(candidate, input.now, deps, usage, Boolean(input.refresh));
    if (next.failure === "authentication_failed" || next.failure === "rate_limited") stop = true;
    if (!next.candidate) {
      failedCount += 1;
      technical.push({ stage: "Candidate enrichment", ...(next.httpStatus ? { httpStatus: next.httpStatus } : {}), message: next.message || "Provider request failed" });
      log(`[market-discovery] FAILED\nstage: enrichment\nstatus: ${next.httpStatus ?? ""}\nmessage: ${next.message || "Provider request failed"}`);
      continue;
    }
    okCount += 1;
    const index = enriched.findIndex((item) => item.id === candidate.id);
    if (index >= 0) enriched[index] = next.candidate;
  }
  if (failedCount > 0 && okCount > 0) stages.enrichment = stageOf("partial", "Some accounts couldn't be read");
  else if (failedCount > 0) stages.enrichment = stageOf("failed", "Candidate enrichment couldn't finish");
  else stages.enrichment = stageOf("complete");
  return enriched;
}

async function classify(
  input: DiscoverInput,
  deps: DiscoverDeps,
  candidates: SocialAccountCandidate[],
  stages: ResearchStages,
  technical: TechnicalDetail[],
  log: (line: string) => void,
): Promise<DiscoverResponse["assessments"]> {
  if (!deps.openaiKey) {
    stages.classification = stageOf("not_started");
    return [];
  }
  const judged = candidates.filter((item) => item.enriched || item.clientClaim);
  if (judged.length === 0) {
    stages.classification = stageOf(candidates.length === 0 ? "not_started" : "complete");
    return [];
  }
  log("[market-discovery] classification started");
  const outcome = await classifyCandidates(input.context, judged, deps.fetchImpl, deps.openaiKey);
  if (!outcome.value) {
    const message = outcome.message || "Structured response did not match schema";
    stages.classification = stageOf("failed", message, outcome.httpStatus);
    technical.push({ stage: "Market classification", ...(outcome.httpStatus ? { httpStatus: outcome.httpStatus } : {}), message });
    log(`[market-discovery] FAILED\nstage: classification\nstatus: ${outcome.httpStatus ?? ""}\nmessage: ${message}`);
    return [];
  }
  stages.classification = stageOf("complete");
  log("[market-discovery] classification complete");
  return outcome.value;
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
): Promise<{ candidate: SocialAccountCandidate | null; failure: DiscoverResponse["failure"]; httpStatus?: number; message: string }> {
  if (candidate.platform === "instagram") {
    const result = await callEnsemble({
      endpoint: "/instagram/user/detailed-info",
      platform: "instagram",
      purpose: "candidate_profile",
      params: { username: candidate.handle },
    }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
    usage.push(result.usage);
    if (!result.ok) {
      const failure = result.failure === "authentication_failed" ? "authentication_failed" : result.failure === "rate_limited" ? "unavailable" : null;
      return { candidate: null, failure, httpStatus: result.httpStatus, message: result.safeMessage };
    }
    const detail = parseInstagramDetailed(result.data, now);
    return { candidate: mergeEnrichment(candidate, detail, detail.posts, result.usage.cached ? "cached" : "live", now), failure: null, message: "" };
  }
  const info = await callEnsemble({
    endpoint: "/tt/user/info",
    platform: "tiktok",
    purpose: "candidate_profile",
    params: { username: candidate.handle },
  }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
  usage.push(info.usage);
  if (!info.ok) {
    const failure = info.failure === "authentication_failed" ? "authentication_failed" : info.failure === "rate_limited" ? "unavailable" : null;
    return { candidate: null, failure, httpStatus: info.httpStatus, message: info.safeMessage };
  }
  const posts = await callEnsemble({
    endpoint: "/tt/user/posts",
    platform: "tiktok",
    purpose: "candidate_posts",
    params: { username: candidate.handle, depth: "1" },
  }, { fetchImpl: deps.fetchImpl, now, refresh, cache: deps.cache, token: deps.token });
  usage.push(posts.usage);
  const profile = parseTikTokInfo(info.data);
  const recent = posts.ok ? parseTikTokPosts(posts.data, candidate.handle, now).slice(0, MARKET_DISCOVERY_LIMITS.postsPerAccount) : [];
  const status: SocialProviderStatus = info.usage.cached && (!posts.ok || posts.usage.cached) ? "cached" : "live";
  return { candidate: mergeEnrichment(candidate, profile, recent, status, now), failure: posts.failure === "authentication_failed" ? "authentication_failed" : null, message: "" };
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

function finish(
  input: DiscoverInput,
  set: MarketDiscoverySet | null,
  candidates: SocialAccountCandidate[],
  assessments: DiscoverResponse["assessments"],
  usage: DiscoverResponse["usage"],
  stages: ResearchStages,
  technical: TechnicalDetail[],
  completed: CompletedSearch[],
  failure: DiscoverResponse["failure"],
): DiscoverResponse {
  const live = usage.some((item) => item.success && !item.cached);
  const cached = usage.some((item) => item.success);
  const origin: SocialProviderStatus = live ? "live" : cached ? "cached" : candidates.length > 0 ? (input.previousOrigin ?? "cached") : "unavailable";
  const ok = failure === null && (candidates.length > 0 || origin !== "unavailable");
  return {
    ok,
    failure: ok ? null : failure ?? "unavailable",
    message: ok ? "" : "Discovery unavailable",
    set,
    candidates,
    assessments,
    proposals: proposeIdentities(candidates),
    usage,
    origin: ok ? origin : "unavailable",
    stages,
    technical,
    completedSearches: mergeCompleted(input.completedSearches, completed),
  };
}

function failed(
  input: DiscoverInput,
  set: MarketDiscoverySet | null,
  failure: NonNullable<DiscoverResponse["failure"]>,
  stages: ResearchStages,
  technical: TechnicalDetail[],
  completed: CompletedSearch[],
  usage: DiscoverResponse["usage"],
): DiscoverResponse {
  return {
    ok: false,
    failure,
    message: "Discovery unavailable",
    set,
    candidates: [],
    assessments: [],
    proposals: [],
    usage,
    origin: "unavailable",
    stages,
    technical,
    completedSearches: mergeCompleted(input.completedSearches, completed),
  };
}
