import type { CompetitorDiscoveryContext, SocialAccountCandidate } from "../src/types/marketDiscovery";
import { callEnsemble } from "./ensembleClient";
import { parseInstagramSearch } from "./ensembleParse";
import { classifyCandidates, generateDiscoveryQueries } from "./marketReason";

export interface EnsembleProbeResult {
  configured: boolean;
  ok: boolean;
  httpStatus?: number;
  accounts?: number;
  units?: number;
  message: string;
}

export interface OpenAIProbeResult {
  configured: boolean;
  ok: boolean;
  httpStatus?: number;
  queriesParse: boolean;
  classificationParse: boolean;
  message: string;
}

const PROBE_CONTEXT: CompetitorDiscoveryContext = {
  clientId: "dev-probe",
  clientName: "Probe",
  whatTheyDo: "Sells coffee.",
  category: "coffee",
  offers: "coffee",
  highValueOffers: "",
  audience: "people nearby",
  customerProblems: "",
  customerLanguage: "",
  geography: "",
  positioning: "",
  differentiation: "",
  contentThemes: "",
  knownCompetitors: [],
  knownMarketReferences: [],
  websiteResearch: "",
  discoveryEvidence: [],
  managerNotes: "",
  brandBrainVersion: "dev-probe",
};

export async function probeEnsemble(deps: { fetchImpl: typeof fetch; token: string; now: string }): Promise<EnsembleProbeResult> {
  if (!deps.token) return { configured: false, ok: false, message: "Not configured" };
  const result = await callEnsemble({
    endpoint: "/instagram/search",
    platform: "instagram",
    purpose: "discovery_search",
    params: { text: "coffee" },
  }, { fetchImpl: deps.fetchImpl, now: deps.now, refresh: true, cache: new Map(), token: deps.token });
  if (!result.ok) {
    return {
      configured: true,
      ok: false,
      ...(result.httpStatus ? { httpStatus: result.httpStatus } : {}),
      ...(result.usage.units !== undefined ? { units: result.usage.units } : {}),
      message: result.safeMessage,
    };
  }
  return {
    configured: true,
    ok: true,
    ...(result.httpStatus ? { httpStatus: result.httpStatus } : {}),
    accounts: parseInstagramSearch(result.data).length,
    ...(result.usage.units !== undefined ? { units: result.usage.units } : {}),
    message: "Connection successful",
  };
}

export async function probeOpenAI(deps: { fetchImpl: typeof fetch; apiKey: string }): Promise<OpenAIProbeResult> {
  if (!deps.apiKey) {
    return { configured: false, ok: false, queriesParse: false, classificationParse: false, message: "Not configured" };
  }
  const queries = await generateDiscoveryQueries(PROBE_CONTEXT, deps.fetchImpl, deps.apiKey);
  const candidate: SocialAccountCandidate = {
    id: "instagram:coffeeprobe",
    platform: "instagram",
    handle: "coffeeprobe",
    displayName: "Coffee Probe",
    bio: "Coffee.",
    profileUrl: "https://www.instagram.com/coffeeprobe/",
    website: "",
    followers: null,
    following: null,
    recentPosts: [],
    sourceQueries: [],
    discoveryFrequency: 1,
    providerStatus: "live",
    retrievedAt: new Date().toISOString(),
    clientClaim: "",
    enriched: true,
  };
  const classified = await classifyCandidates(PROBE_CONTEXT, [candidate], deps.fetchImpl, deps.apiKey);
  const httpStatus = queries.httpStatus ?? classified.httpStatus;
  const ok = Boolean(queries.value && queries.value.length > 0 && classified.value);
  return {
    configured: true,
    ok,
    ...(httpStatus ? { httpStatus } : {}),
    queriesParse: Boolean(queries.value && queries.value.length > 0),
    classificationParse: Boolean(classified.value),
    message: ok ? "Connection successful" : queries.message || classified.message || "Model request failed",
  };
}
