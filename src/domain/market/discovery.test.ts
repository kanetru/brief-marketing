import { afterEach, describe, expect, it } from "vitest";
import { createSession } from "../../state/createSession";
import { createProject, submitDiscovery } from "../../state/projectStore";
import { buildProjectIntelligence } from "../project/assemble";
import { capabilityFor } from "../intelligence/providers";
import { discoveryContext, acceptQueries, namedQueries, selectLiveQueries, splitNames } from "./context";
import { chooseEnrichment, dedupeCandidates, preRank, proposeIdentities, publicProfileUrl } from "./rank";
import { acceptAssessment, approveAccount, dismissAccount, emptyMarketDiscovery, groupedReview, reclassifyAccount, storeRun } from "./review";
import { parseInstagramDetailed, parseInstagramSearch, parseTikTokPosts, parseTikTokUserSearch } from "../../../server/ensembleParse";
import { runMarketDiscovery } from "../../../server/marketRun";
import type { EnsembleCache } from "../../../server/ensembleClient";
import type { CompetitorDiscoveryContext, MarketAccountAssessment, SocialAccountCandidate, SocialDiscoveryQuery } from "../../types/marketDiscovery";

const NOW = "2026-10-05T12:00:00.000Z";
const TOKEN = "test-ensemble";

function context(partial: Partial<CompetitorDiscoveryContext> = {}): CompetitorDiscoveryContext {
  return {
    clientId: "client-1",
    clientName: "Harbour Linen",
    whatTheyDo: "Makes linen aprons for small restaurants.",
    category: "workwear",
    offers: "linen aprons",
    highValueOffers: "custom restaurant aprons",
    audience: "independent restaurants",
    customerProblems: "aprons that look like costumes",
    customerLanguage: "service that feels considered",
    geography: "",
    positioning: "quiet workwear",
    differentiation: "cloth that lasts a service",
    contentThemes: "cloth, service",
    knownCompetitors: [],
    knownMarketReferences: [],
    websiteResearch: "",
    discoveryEvidence: [],
    managerNotes: "",
    brandBrainVersion: "client-1:1",
    ...partial,
  };
}

function query(partial: Partial<SocialDiscoveryQuery> & Pick<SocialDiscoveryQuery, "id" | "query" | "platform">): SocialDiscoveryQuery {
  return { queryType: "category", rationale: "From the client's own offer.", ...partial };
}

function candidate(partial: Partial<SocialAccountCandidate> & Pick<SocialAccountCandidate, "platform" | "handle">): SocialAccountCandidate {
  return {
    id: `${partial.platform}:${partial.handle}`,
    displayName: partial.displayName ?? partial.handle,
    bio: "",
    profileUrl: publicProfileUrl(partial.platform, partial.handle),
    website: "",
    followers: null,
    following: null,
    recentPosts: [],
    sourceQueries: partial.sourceQueries ?? ["q1"],
    discoveryFrequency: partial.sourceQueries?.length ?? 1,
    providerStatus: "live",
    retrievedAt: NOW,
    clientClaim: "",
    enriched: false,
    ...partial,
  };
}

function assessment(candidateId: string, classification: MarketAccountAssessment["classification"]): MarketAccountAssessment {
  return {
    candidateId,
    classification,
    machineClassification: classification,
    relevance: "moderate",
    summary: "A possible overlap.",
    whyItMatters: "The offer sits near the client's.",
    overlap: { offer: "aprons", audience: "restaurants", geography: "", category: "workwear" },
    evidence: [{ id: "e1", kind: "profile", label: "Bio mentions aprons" }],
    uncertainty: "Geography is unknown.",
    recommendedAction: classification === "irrelevant" ? "ignore" : "consider",
    source: "social_discovery",
    epistemicStatus: "inference",
    decisionStatus: "unreviewed",
    clientClaim: "",
  };
}

function jsonResponse(body: unknown, status = 200, units?: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: units === undefined ? undefined : { units: String(units) },
  });
}

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ENSEMBLEDATA_API_TOKEN;
});

describe("market discovery context", () => {
  it("treats zero, one, and several client names as optional", () => {
    expect(namedQueries(context(), NOW)).toEqual([]);
    expect(splitNames("ABC Studio")).toEqual(["ABC Studio"]);
    expect(splitNames("ABC Studio, North Table and Late Cloth")).toEqual(["ABC Studio", "North Table", "Late Cloth"]);
    const many = namedQueries(context({ knownCompetitors: ["ABC Studio", "North Table"] }), NOW);
    expect(many.filter((item) => item.platform === "instagram")).toHaveLength(2);
    expect(many.every((item) => item.queryType === "client_named")).toBe(true);
    expect(many.some((item) => /north workshop/i.test(item.query))).toBe(false);
  });

  it("keeps client-named searches when the model also returns phrases", () => {
    const accepted = acceptQueries([
      query({ id: "m1", query: "linen aprons", platform: "instagram" }),
    ], context({ knownCompetitors: ["ABC Studio"] }));
    expect(accepted.some((item) => item.query === "ABC Studio" && item.platform === "instagram")).toBe(true);
    expect(accepted.some((item) => item.query === "linen aprons")).toBe(true);
  });

  it("reads named neighbours from a real project and still completes onboarding if discovery failed", () => {
    const session = createSession(NOW);
    session.strategyInputs.neighbours = { state: "evidence", evidence: { raw: "ABC Studio", capturedAt: NOW } };
    const project = createProject({ businessName: "Harbour Linen", discovery: session, now: NOW, discoveryStatus: "in_progress" });
    const brain = discoveryContext(project, buildProjectIntelligence(project));
    expect(brain.knownCompetitors).toContain("ABC Studio");
    expect(brain.whatTheyDo.length).toBeGreaterThan(0);
    const failed = { ...project, marketDiscovery: { ...emptyMarketDiscovery(NOW), origin: "unavailable" as const, message: "Discovery unavailable" } };
    expect(submitDiscovery(failed, NOW).discoveryStatus).toBe("submitted");
  });
});

describe("candidate ranking and identity", () => {
  it("dedupes an account that appears in several searches", () => {
    const merged = dedupeCandidates([
      candidate({ platform: "instagram", handle: "harbourcloth", sourceQueries: ["q1"] }),
      candidate({ platform: "instagram", handle: "@harbourcloth", sourceQueries: ["q2"], displayName: "Harbour Cloth" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.discoveryFrequency).toBe(2);
    expect(merged[0]?.sourceQueries).toEqual(["q1", "q2"]);
  });

  it("ranks a repeated and client-named account ahead of a one-off", () => {
    const queries = [
      query({ id: "q1", query: "linen aprons", platform: "instagram", queryType: "offer" }),
      query({ id: "q2", query: "restaurant aprons", platform: "instagram", queryType: "category" }),
    ];
    const ranked = preRank([
      candidate({ platform: "instagram", handle: "once", sourceQueries: ["q1"] }),
      candidate({ platform: "instagram", handle: "often", sourceQueries: ["q1", "q2"], clientClaim: "Client says this is a competitor." }),
    ], queries, ["linen", "apron"]);
    expect(ranked[0]?.candidate.handle).toBe("often");
    expect(chooseEnrichment(ranked).some((item) => item.handle === "often")).toBe(true);
  });

  it("does not merge the same handle across platforms without a second signal", () => {
    const proposals = proposeIdentities([
      candidate({ platform: "instagram", handle: "harbourcloth", displayName: "Harbour Cloth" }),
      candidate({ platform: "tiktok", handle: "harbourcloth", displayName: "Someone else" }),
    ]);
    expect(proposals).toEqual([]);
  });

  it("proposes a match from display name plus website, and leaves it unconfirmed", () => {
    const proposals = proposeIdentities([
      candidate({ platform: "instagram", handle: "harbourcloth", displayName: "Harbour Cloth", website: "https://harbourcloth.example" }),
      candidate({ platform: "tiktok", handle: "harbour.cloth", displayName: "Harbour Cloth", website: "https://www.harbourcloth.example/about" }),
    ]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.confidence).toBe("proposed");
  });
});

describe("manager review", () => {
  it("keeps an inference as an inference after approval, reclassification, and dismissal", () => {
    const base = emptyMarketDiscovery(NOW);
    const record = {
      ...base,
      set: { clientId: "client-1", queries: [], executedQueryIds: [], generatedAt: NOW, brandBrainVersion: "client-1:1", approvedByManager: false },
      candidates: [candidate({ platform: "instagram", handle: "abcstudio", displayName: "ABC Studio", clientClaim: "Client says this is a competitor." })],
      assessments: [{ ...assessment("instagram:abcstudio", "direct_competitor"), clientClaim: "Client says this is a competitor." }],
    };
    const approved = approveAccount(record, "instagram:abcstudio", NOW);
    expect(approved.assessments[0]?.epistemicStatus).toBe("inference");
    expect(approved.assessments[0]?.decisionStatus).toBe("approved");
    expect(approved.entities[0]?.epistemicStatus).toBe("inference");
    expect(approved.entities[0]?.monitoringStatus).toBe("active");
    const moved = reclassifyAccount(approved, "instagram:abcstudio", "market_reference", NOW);
    expect(moved.assessments[0]?.classification).toBe("market_reference");
    expect(moved.assessments[0]?.machineClassification).toBe("direct_competitor");
    expect(moved.assessments[0]?.epistemicStatus).toBe("inference");
    expect(moved.entities[0]?.classification).toBe("market_reference");
    const dismissed = dismissAccount(moved, "instagram:abcstudio", NOW);
    expect(dismissed.assessments[0]?.decisionStatus).toBe("rejected");
    expect(dismissed.entities).toEqual([]);
    expect(groupedReview(dismissed)).toEqual([]);
  });

  it("hides irrelevant accounts from the review groups", () => {
    const record = {
      ...emptyMarketDiscovery(NOW),
      assessments: [
        assessment("instagram:fit", "direct_competitor"),
        assessment("instagram:noise", "irrelevant"),
        assessment("instagram:near", "indirect_competitor"),
        assessment("instagram:ref", "market_reference"),
      ],
    };
    const groups = groupedReview(record).map((group) => group.type);
    expect(groups).toEqual(["direct_competitor", "indirect_competitor", "market_reference"]);
    expect(acceptAssessment(assessment("missing", "direct_competitor"), undefined)).toBeNull();
  });

  it("does not let a failed or demo payload replace a saved live result", () => {
    const saved = {
      ...emptyMarketDiscovery(NOW),
      origin: "live" as const,
      candidates: [candidate({ platform: "instagram", handle: "kept" })],
    };
    const failed = storeRun(saved, {
      ok: false,
      failure: "unavailable",
      message: "Discovery unavailable",
      set: null,
      candidates: [],
      assessments: [],
      proposals: [],
      usage: [],
      origin: "unavailable",
    }, "replace", NOW);
    expect(failed.candidates).toHaveLength(1);
    expect(failed.message).toBe("Discovery unavailable");
    const demo = storeRun(saved, {
      ok: true,
      failure: null,
      message: "",
      set: null,
      candidates: [candidate({ platform: "instagram", handle: "fake", providerStatus: "demo" })],
      assessments: [],
      proposals: [],
      usage: [],
      origin: "demo",
    }, "replace", NOW);
    expect(demo.candidates.map((item) => item.handle)).toEqual(["kept"]);
    expect(demo.origin).toBe("live");
  });
});

describe("ensemble provider", () => {
  it("parses instagram and tiktok fields and leaves missing metrics null", () => {
    const instagram = parseInstagramSearch({ data: { users: [{ user: { username: "harbourcloth", full_name: "Harbour Cloth", pk: "9" } }] } });
    expect(instagram[0]?.handle).toBe("harbourcloth");
    expect(instagram[0]?.followers).toBeNull();
    const detail = parseInstagramDetailed({
      data: {
        username: "harbourcloth",
        biography: "Linen aprons",
        edge_followed_by: { count: 1200 },
        edge_follow: { count: 20 },
        edge_owner_to_timeline_media: { edges: [{ node: { id: "p1", shortcode: "abc", taken_at_timestamp: 1700000000, is_video: false, __typename: "GraphImage", edge_media_to_caption: { edges: [{ node: { text: "Service #linen" } }] }, edge_liked_by: { count: 4 }, edge_media_to_comment: { count: 1 } } }] },
      },
    }, NOW);
    expect(detail.followers).toBe(1200);
    expect(detail.posts[0]?.views).toBeNull();
    expect(detail.posts[0]?.shares).toBeNull();
    expect(detail.posts[0]?.hashtags).toEqual(["linen"]);
    const tiktok = parseTikTokUserSearch({ data: { users: [{ user_info: { unique_id: "harbourcloth", nickname: "Harbour Cloth", signature: "Aprons", follower_count: 80 } }] } });
    expect(tiktok[0]?.followers).toBe(80);
    expect(tiktok[0]?.following).toBeNull();
    const posts = parseTikTokPosts({ data: { data: [{ aweme_id: "v1", desc: "Cloth #linen", create_time: 1700000000, statistics: { digg_count: 3, comment_count: 1, play_count: 50, share_count: 2 } }] } }, "harbourcloth", NOW);
    expect(posts[0]?.views).toBe(50);
    expect(posts[0]?.shares).toBe(2);
    expect(posts[0]?.likes).toBe(3);
  });

  it("searches both platforms, enriches, classifies, and never returns the token", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("api.openai.com")) {
        return jsonResponse({ output_text: JSON.stringify({ assessments: [{
          candidateId: "instagram:harbourcloth",
          classification: "direct_competitor",
          relevance: "high",
          summary: "Similar aprons for restaurants.",
          whyItMatters: "The offer and the customer overlap.",
          offer: "aprons",
          audience: "restaurants",
          geography: "",
          category: "workwear",
          evidenceLabels: ["Bio mentions linen aprons"],
          uncertainty: "",
          recommendedAction: "monitor",
        }, {
          candidateId: "tiktok:noisemaker",
          classification: "irrelevant",
          relevance: "low",
          summary: "Unrelated.",
          whyItMatters: "",
          offer: "",
          audience: "",
          geography: "",
          category: "",
          evidenceLabels: [],
          uncertainty: "No overlap.",
          recommendedAction: "ignore",
        }] }) });
      }
      if (url.includes("/instagram/search")) return jsonResponse({ data: { users: [{ user: { username: "harbourcloth", full_name: "Harbour Cloth", pk: "1" } }] } });
      if (url.includes("/instagram/user/detailed-info")) return jsonResponse({ units: 10, data: { username: "harbourcloth", full_name: "Harbour Cloth", biography: "Linen aprons for restaurants", edge_followed_by: { count: 100 }, edge_follow: { count: 2 }, edge_owner_to_timeline_media: { edges: [] } } });
      if (url.includes("/tt/user/search")) return jsonResponse({ data: { users: [{ user_info: { unique_id: "noisemaker", nickname: "Noise" } }] } });
      if (url.includes("/tt/user/info")) return jsonResponse({ data: { user: { uniqueId: "noisemaker", nickname: "Noise", signature: "Sounds" }, stats: { followerCount: 10, followingCount: 1 } } });
      if (url.includes("/tt/user/posts")) return jsonResponse({ data: { data: [] } });
      return jsonResponse({}, 404);
    };
    const cache: EnsembleCache = new Map();
    const deps = { fetchImpl, cache, token: TOKEN, openaiKey: "test-openai" };
    const queries = [
      query({ id: "ig1", query: "linen aprons", platform: "instagram", queryType: "offer" }),
      query({ id: "tt1", query: "restaurant aprons", platform: "tiktok", queryType: "category" }),
    ];
    const first = await runMarketDiscovery({ context: context(), queries, now: NOW }, deps);
    expect(first.ok).toBe(true);
    expect(first.origin).toBe("live");
    expect(first.candidates.map((item) => item.platform).sort()).toEqual(["instagram", "tiktok"]);
    expect(first.assessments.find((item) => item.candidateId === "instagram:harbourcloth")?.classification).toBe("direct_competitor");
    expect(first.assessments.find((item) => item.candidateId === "instagram:harbourcloth")?.epistemicStatus).toBe("inference");
    expect(groupedReview({ ...emptyMarketDiscovery(NOW), assessments: first.assessments }).some((group) => group.type === "irrelevant")).toBe(false);
    expect(first.usage.some((item) => item.endpoint === "/instagram/user/detailed-info" && item.units === 10)).toBe(true);
    expect(JSON.stringify(first)).not.toContain(TOKEN);
    expect(first.candidates.some((item) => item.providerStatus === "demo")).toBe(false);
    expect(capabilityFor("demo-social")?.mode).toBe("demo");
    const ensembleCalls = seen.filter((url) => url.includes("ensembledata.com")).length;
    const second = await runMarketDiscovery({ context: context(), queries, now: NOW }, deps);
    expect(second.origin).toBe("cached");
    expect(seen.filter((url) => url.includes("ensembledata.com"))).toHaveLength(ensembleCalls);
    await runMarketDiscovery({ context: context(), queries, refresh: true, now: NOW }, deps);
    expect(seen.filter((url) => url.includes("ensembledata.com")).length).toBeGreaterThan(ensembleCalls);
  });

  it("stops when EnsembleData is missing, unauthenticated, or OpenAI cannot classify", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input);
      if (url.includes("ensembledata.com")) return jsonResponse({}, 401);
      return jsonResponse({ output_text: "{}" });
    };
    const missing = await runMarketDiscovery({ context: context(), queries: [query({ id: "ig1", query: "linen aprons", platform: "instagram" })], now: NOW }, { fetchImpl, cache: new Map(), token: "", openaiKey: "" });
    expect(missing.ok).toBe(false);
    expect(missing.failure).toBe("not_configured");
    expect(missing.candidates).toEqual([]);
    expect(missing.message).toBe("Discovery unavailable");
    expect(calls).toBe(0);
    const denied = await runMarketDiscovery({ context: context(), queries: [query({ id: "ig1", query: "linen aprons", platform: "instagram" })], now: NOW }, { fetchImpl, cache: new Map(), token: TOKEN, openaiKey: "test-openai" });
    expect(denied.failure).toBe("authentication_failed");
    expect(denied.candidates).toEqual([]);
    expect(JSON.stringify(denied)).not.toContain(TOKEN);
    const unclassified = await runMarketDiscovery({
      context: context(),
      queries: [query({ id: "ig1", query: "linen aprons", platform: "instagram" })],
      now: NOW,
    }, {
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/instagram/search")) return jsonResponse({ data: { users: [{ user: { username: "harbourcloth", full_name: "Harbour Cloth" } }] } });
        if (url.includes("detailed-info")) return jsonResponse({ data: { username: "harbourcloth", biography: "Aprons" } });
        return jsonResponse({}, 404);
      },
      cache: new Map(),
      token: TOKEN,
      openaiKey: "",
    });
    expect(unclassified.ok).toBe(true);
    expect(unclassified.assessments).toEqual([]);
    expect(unclassified.candidates[0]?.providerStatus).not.toBe("demo");
  });

  it("caps the live search set", () => {
    const queries = Array.from({ length: 10 }, (_, index) => query({ id: `ig-${index}`, query: `phrase ${index}`, platform: "instagram", queryType: index % 2 ? "offer" : "category" }));
    expect(selectLiveQueries(queries, 3).filter((item) => item.platform === "instagram")).toHaveLength(3);
  });
});
