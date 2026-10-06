import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTikTokKeywordAuthors } from "../../../server/ensembleParse";
import { safeProviderMessage } from "../../../server/ensembleClient";
import { sanitiseLog } from "../../../server/marketLog";
import { runMarketDiscovery } from "../../../server/marketRun";
import { probeEnsemble, probeOpenAI } from "../../../server/providerProbe";
import type { EnsembleCache } from "../../../server/ensembleClient";
import { emptyMarketDiscovery, storeRun } from "./review";
import { researchRetry } from "./stages";
import type { CompetitorDiscoveryContext, SocialAccountCandidate, SocialDiscoveryQuery } from "../../types/marketDiscovery";

const NOW = "2026-10-05T12:00:00.000Z";
const TOKEN = "test-ensemble-token";

function context(): CompetitorDiscoveryContext {
  return {
    clientId: "client-1",
    clientName: "Harbour Linen",
    whatTheyDo: "Makes linen aprons for small restaurants.",
    category: "workwear",
    offers: "linen aprons",
    highValueOffers: "",
    audience: "independent restaurants",
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
    brandBrainVersion: "client-1:1",
  };
}

function query(partial: Partial<SocialDiscoveryQuery> & Pick<SocialDiscoveryQuery, "id" | "query" | "platform">): SocialDiscoveryQuery {
  return { queryType: "category", rationale: "From the offer.", ...partial };
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function candidate(handle: string): SocialAccountCandidate {
  return {
    id: `instagram:${handle}`,
    platform: "instagram",
    handle,
    displayName: handle,
    bio: "Aprons",
    profileUrl: "",
    website: "",
    followers: null,
    following: null,
    recentPosts: [],
    sourceQueries: ["ig1"],
    discoveryFrequency: 1,
    providerStatus: "live",
    retrievedAt: NOW,
    clientClaim: "",
    enriched: true,
  };
}

describe("market research reliability", () => {
  it("reads TikTok keyword authors from aweme_info", () => {
    const hits = parseTikTokKeywordAuthors({
      data: { data: [{ aweme_info: { author: { unique_id: "tesla.flex", nickname: "Tesla Flex" } } }] },
    });
    expect(hits[0]?.handle).toBe("tesla.flex");
    expect(hits[0]?.displayName).toBe("Tesla Flex");
  });

  it("maps provider failures without echoing a token", () => {
    expect(safeProviderMessage(401, { detail: "Token not found" })).toEqual({ failure: "authentication_failed", message: "Authentication failed" });
    expect(safeProviderMessage(493, { detail: "All daily units used" }).message).toBe("All daily units used");
    expect(safeProviderMessage(493, { detail: "Subscription expired" }).failure).toBe("rate_limited");
    expect(safeProviderMessage(500, { message: `https://ensembledata.com/apis?token=${TOKEN}` }).message).toBe("Provider request failed");
    expect(JSON.stringify(safeProviderMessage(401, { detail: `bad ${TOKEN}` }))).not.toContain(TOKEN);
  });

  it("strips secrets from development logs", () => {
    const line = sanitiseLog(`Bearer ${TOKEN} sk-live-secret https://ensembledata.com/apis/instagram/search?token=${TOKEN}`, [TOKEN]);
    expect(line).not.toContain(TOKEN);
    expect(line).not.toContain("sk-live");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("ensembledata.com");
  });

  it("keeps TikTok accounts when Instagram authentication fails", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("/instagram/search")) return jsonResponse({ detail: "Token not found" }, 401);
      if (url.includes("/tt/user/search")) return jsonResponse({ data: { users: [{ user_info: { unique_id: "apronlab", nickname: "Apron Lab" } }] } });
      if (url.includes("/tt/user/info")) return jsonResponse({ data: { user: { uniqueId: "apronlab", nickname: "Apron Lab" }, stats: { followerCount: 10 } } });
      if (url.includes("/tt/user/posts")) return jsonResponse({ data: { data: [] } });
      return jsonResponse({}, 404);
    };
    const lines: string[] = [];
    const result = await runMarketDiscovery({
      context: context(),
      queries: [
        query({ id: "ig1", query: "linen aprons", platform: "instagram" }),
        query({ id: "tt1", query: "linen aprons", platform: "tiktok" }),
      ],
      now: NOW,
    }, { fetchImpl, cache: new Map(), token: TOKEN, openaiKey: "", log: (line) => lines.push(line) });
    expect(result.ok).toBe(true);
    expect(result.candidates.map((item) => item.handle)).toContain("apronlab");
    expect(result.stages?.instagram.status).toBe("failed");
    expect(result.stages?.tiktok.status).toBe("complete");
    expect(result.technical?.some((item) => item.stage === "Instagram search" && item.httpStatus === 401)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(lines.join("\n")).not.toContain(TOKEN);
    expect(lines.join("\n")).toContain("instagram_search");
    const saved = storeRun(emptyMarketDiscovery(NOW), result, "replace", NOW);
    expect(saved.candidates.map((item) => item.handle)).toContain("apronlab");
    expect(saved.completedSearches?.some((item) => item.platform === "tiktok")).toBe(true);
    expect(researchRetry(saved)).toBe("instagram");
  });

  it("keeps Instagram accounts when TikTok hits a unit limit, and a retry does not repeat Instagram", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("/instagram/search")) return jsonResponse({ data: { users: [{ user: { username: "harbourcloth", full_name: "Harbour Cloth" } }] } });
      if (url.includes("/instagram/user/detailed-info")) return jsonResponse({ data: { username: "harbourcloth", biography: "Linen aprons" } });
      if (url.includes("/tt/")) return jsonResponse({ detail: "All daily units used" }, 493);
      return jsonResponse({}, 404);
    };
    const deps = { fetchImpl, cache: new Map() as EnsembleCache, token: TOKEN, openaiKey: "" };
    const queries = [
      query({ id: "ig1", query: "linen aprons", platform: "instagram" }),
      query({ id: "tt1", query: "linen aprons", platform: "tiktok" }),
    ];
    const first = await runMarketDiscovery({ context: context(), queries, now: NOW }, deps);
    expect(first.candidates.map((item) => item.handle)).toEqual(["harbourcloth"]);
    expect(first.stages?.tiktok.status).toBe("failed");
    expect(first.technical?.some((item) => item.message === "All daily units used")).toBe(true);
    expect(first.usage.some((item) => item.endpoint === "/tt/user/search" && item.success === false)).toBe(true);
    const before = seen.filter((url) => url.includes("/instagram/")).length;
    const second = await runMarketDiscovery({
      context: context(),
      queries,
      now: NOW,
      retry: "tiktok",
      previousCandidates: first.candidates,
      completedSearches: first.completedSearches,
      previousStages: first.stages,
      previousOrigin: "live",
    }, { ...deps, cache: new Map() });
    expect(second.candidates.map((item) => item.handle)).toContain("harbourcloth");
    expect(seen.filter((url) => url.includes("/instagram/"))).toHaveLength(before);
    expect(seen.filter((url) => url.includes("/tt/")).length).toBeGreaterThan(1);
  });

  it("keeps the other account when one enrichment fails", async () => {
    let details = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/instagram/search")) {
        return jsonResponse({ data: { users: [
          { user: { username: "one", full_name: "One" } },
          { user: { username: "two", full_name: "Two" } },
        ] } });
      }
      if (url.includes("/instagram/user/detailed-info")) {
        details += 1;
        if (details === 1) return jsonResponse({ detail: "Something went wrong" }, 500);
        return jsonResponse({ data: { username: "two", biography: "Aprons" } });
      }
      return jsonResponse({}, 404);
    };
    const result = await runMarketDiscovery({
      context: context(),
      queries: [query({ id: "ig1", query: "linen aprons", platform: "instagram" })],
      now: NOW,
    }, { fetchImpl, cache: new Map(), token: TOKEN, openaiKey: "" });
    expect(result.candidates.map((item) => item.handle).sort()).toEqual(["one", "two"]);
    expect(result.candidates.filter((item) => item.enriched).map((item) => item.handle)).toEqual(["two"]);
    expect(result.stages?.enrichment.status).toBe("partial");
    expect(result.ok).toBe(true);
  });

  it("keeps discovered accounts when classification fails and does not search again to retry it", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("api.openai.com")) return jsonResponse({ error: { message: `bad ${TOKEN}` } }, 502);
      if (url.includes("/instagram/search")) return jsonResponse({ data: { users: [{ user: { username: "harbourcloth", full_name: "Harbour Cloth" } }] } });
      if (url.includes("/instagram/user/detailed-info")) return jsonResponse({ data: { username: "harbourcloth", biography: "Aprons" } });
      return jsonResponse({}, 404);
    };
    const deps = { fetchImpl, cache: new Map() as EnsembleCache, token: TOKEN, openaiKey: "sk-test-key" };
    const queries = [query({ id: "ig1", query: "linen aprons", platform: "instagram" })];
    const first = await runMarketDiscovery({ context: context(), queries, now: NOW }, deps);
    expect(first.ok).toBe(true);
    expect(first.candidates).toHaveLength(1);
    expect(first.stages?.classification.status).toBe("failed");
    expect(first.technical?.some((item) => item.stage === "Market classification" && item.httpStatus === 502)).toBe(true);
    expect(JSON.stringify(first)).not.toContain(TOKEN);
    expect(JSON.stringify(first)).not.toContain("sk-test");
    const ensembleCalls = seen.filter((url) => url.includes("ensembledata.com")).length;
    const second = await runMarketDiscovery({
      context: context(),
      queries,
      now: NOW,
      retry: "classification",
      previousCandidates: first.candidates,
      completedSearches: first.completedSearches,
      previousStages: first.stages,
    }, deps);
    expect(seen.filter((url) => url.includes("ensembledata.com"))).toHaveLength(ensembleCalls);
    expect(second.candidates).toHaveLength(1);
    expect(researchRetry({ ...emptyMarketDiscovery(NOW), candidates: first.candidates, stages: first.stages })).toBe("classification");
  });

  it("does not spend a provider call when the successful search is already stored", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({}, 500);
    };
    const saved = candidate("harbourcloth");
    const result = await runMarketDiscovery({
      context: context(),
      queries: [query({ id: "ig1", query: "linen aprons", platform: "instagram" })],
      now: NOW,
      previousCandidates: [saved],
      completedSearches: [{ platform: "instagram", query: "linen aprons", endpoint: "/instagram/search" }],
      previousStages: {
        queries: { status: "complete" },
        instagram: { status: "complete" },
        tiktok: { status: "not_started" },
        enrichment: { status: "complete" },
        classification: { status: "complete" },
      },
      previousOrigin: "live",
    }, { fetchImpl, cache: new Map(), token: TOKEN, openaiKey: "sk-test-key" });
    expect(calls).toBe(0);
    expect(result.candidates.map((item) => item.handle)).toEqual(["harbourcloth"]);
    expect(result.ok).toBe(true);
  });

  it("probes EnsembleData with one request and OpenAI without a key", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({ data: { users: [{ user: { username: "cafe" } }, { user: { username: "bar" } }] } }, 200, { units: "4" });
    };
    const ok = await probeEnsemble({ fetchImpl, token: TOKEN, now: NOW });
    expect(calls).toBe(1);
    expect(ok).toMatchObject({ configured: true, ok: true, accounts: 2, units: 4, message: "Connection successful" });
    expect(JSON.stringify(ok)).not.toContain(TOKEN);
    const denied = await probeEnsemble({
      fetchImpl: async () => jsonResponse({ detail: "Email not verified" }, 401),
      token: TOKEN,
      now: NOW,
    });
    expect(denied).toMatchObject({ configured: true, ok: false, httpStatus: 401, message: "Email not verified" });
    const missing = await probeOpenAI({ fetchImpl: async () => jsonResponse({}), apiKey: "" });
    expect(missing.configured).toBe(false);
    expect(missing.queriesParse).toBe(false);
  });

  it("parses a minimal OpenAI probe", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({
      output_text: JSON.stringify({
        queries: [{ query: "coffee", platform: "instagram", queryType: "category", rationale: "The offer." }],
        assessments: [{
          candidateId: "instagram:coffeeprobe",
          classification: "market_reference",
          relevance: "low",
          summary: "Coffee.",
          whyItMatters: "Adjacent.",
          offer: "",
          audience: "",
          geography: "",
          category: "coffee",
          evidenceLabels: [],
          uncertainty: "",
          recommendedAction: "consider",
        }],
      }),
    });
    const result = await probeOpenAI({ fetchImpl, apiKey: "sk-probe" });
    expect(result.configured).toBe(true);
    expect(result.queriesParse).toBe(true);
    expect(result.classificationParse).toBe(true);
    expect(JSON.stringify(result)).not.toContain("sk-probe");
  });

  it("names the stage when no search can be sent", async () => {
    let calls = 0;
    const result = await runMarketDiscovery({ context: context(), now: NOW }, {
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({});
      },
      cache: new Map(),
      token: "",
      openaiKey: "",
    });
    expect(calls).toBe(0);
    expect(result.failure).toBe("not_configured");
    expect(result.technical).toEqual([{ stage: "OpenAI", message: "Not configured" }]);
  });

  it("keeps production failure copy free of technical detail", () => {
    const source = readFileSync(new URL("../../screens/studio/ManagerBoards.tsx", import.meta.url), "utf8");
    expect(source).toContain("Market research couldn't finish.");
    expect(source).toContain("Try again");
    expect(source).toContain("devDetails");
    expect(source).not.toMatch(/ENSEMBLEDATA|OPENAI_API_KEY|window\.confirm/);
  });
});
