import { resolveAiTask } from "../src/config/aiModels";
import { readResponsesText } from "./clientStrategist";
import type { CompetitorDiscoveryContext, MarketAccountAssessment, SocialAccountCandidate, SocialDiscoveryQuery } from "../src/types/marketDiscovery";
import { acceptQueries } from "../src/domain/market/context";
import { acceptAssessment } from "../src/domain/market/review";

const QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["queries"],
  properties: {
    queries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["query", "platform", "queryType", "rationale"],
        properties: {
          query: { type: "string" },
          platform: { type: "string", enum: ["instagram", "tiktok"] },
          queryType: { type: "string", enum: ["category", "offer", "customer_problem", "customer_language", "geography", "hashtag", "adjacent_category"] },
          rationale: { type: "string" },
        },
      },
    },
  },
} as const;

const CLASS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["assessments"],
  properties: {
    assessments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["candidateId", "classification", "relevance", "summary", "whyItMatters", "offer", "audience", "geography", "category", "evidenceLabels", "uncertainty", "recommendedAction"],
        properties: {
          candidateId: { type: "string" },
          classification: { type: "string", enum: ["direct_competitor", "indirect_competitor", "market_reference", "watch_account", "emerging_account", "irrelevant"] },
          relevance: { type: "string", enum: ["high", "moderate", "low"] },
          summary: { type: "string" },
          whyItMatters: { type: "string" },
          offer: { type: "string" },
          audience: { type: "string" },
          geography: { type: "string" },
          category: { type: "string" },
          evidenceLabels: { type: "array", items: { type: "string" } },
          uncertainty: { type: "string" },
          recommendedAction: { type: "string", enum: ["monitor", "consider", "ignore"] },
        },
      },
    },
  },
} as const;

export async function generateDiscoveryQueries(
  context: CompetitorDiscoveryContext,
  fetchImpl: typeof fetch,
  apiKey: string,
): Promise<SocialDiscoveryQuery[] | null> {
  const packet = [
    "Write social searches for this client only. Do not import an example from another business.",
    "Return between 5 and 8 short search phrases for Instagram and the same for TikTok.",
    "A phrase is what a person would type. It is not a sentence and not a competitor you invented.",
    "Cover the offer, the customer, the problem, the words they use, place if one is in the context, a hashtag, and an adjacent category.",
    "If the client named someone, include that name as its own search.",
    JSON.stringify(context),
  ].join("\n\n");
  const parsed = await respond(packet, QUERY_SCHEMA, "market_queries", "marketQueries", fetchImpl, apiKey);
  if (!parsed || !Array.isArray((parsed as { queries?: unknown }).queries)) return null;
  const queries = ((parsed as { queries: Array<Partial<SocialDiscoveryQuery>> }).queries).map((item, index) => ({
    id: `model-${item.platform ?? "instagram"}-${index + 1}`,
    query: typeof item.query === "string" ? item.query : "",
    platform: item.platform === "tiktok" ? "tiktok" as const : "instagram" as const,
    queryType: item.queryType ?? "category",
    rationale: typeof item.rationale === "string" ? item.rationale : "",
  }));
  return acceptQueries(queries, context);
}

export async function classifyCandidates(
  context: CompetitorDiscoveryContext,
  candidates: readonly SocialAccountCandidate[],
  fetchImpl: typeof fetch,
  apiKey: string,
): Promise<MarketAccountAssessment[] | null> {
  if (candidates.length === 0) return [];
  const packet = [
    "Classify each account for a marketing manager.",
    "Search appearance is not proof of competition.",
    "Direct competitor: similar offer, similar customer, and meaningful commercial overlap.",
    "Indirect competitor: a different offer competing for the same need, budget, or attention.",
    "Market reference: shapes category expectations, language, aesthetics, or attention, without necessarily competing.",
    "Watch account: adjacent and useful to observe.",
    "Emerging account: relevant, with signs it may matter.",
    "Irrelevant: does not help understand this client's market.",
    "If clientClaim is set, keep that the client said it. You may still classify it differently. Do not erase the client's statement.",
    "Use only the profile and posts given. Leave a field empty rather than inventing a metric.",
    "This is an inference, not a fact.",
    JSON.stringify({
      context,
      accounts: candidates.map((item) => ({
        id: item.id,
        platform: item.platform,
        handle: item.handle,
        displayName: item.displayName,
        bio: item.bio,
        website: item.website,
        followers: item.followers,
        following: item.following,
        sourceQueries: item.sourceQueries,
        discoveryFrequency: item.discoveryFrequency,
        clientClaim: item.clientClaim,
        posts: item.recentPosts.slice(0, 6).map((post) => ({
          id: post.postId,
          caption: post.caption,
          hashtags: post.hashtags,
          likes: post.likes,
          comments: post.comments,
          views: post.views,
        })),
      })),
    }),
  ].join("\n\n");
  const parsed = await respond(packet, CLASS_SCHEMA, "market_accounts", "marketClassification", fetchImpl, apiKey);
  if (!parsed || !Array.isArray((parsed as { assessments?: unknown }).assessments)) return null;
  const byId = new Map(candidates.map((item) => [item.id, item]));
  const assessments = ((parsed as { assessments: Array<Record<string, unknown>> }).assessments).flatMap((item) => {
    const candidate = byId.get(typeof item.candidateId === "string" ? item.candidateId : "");
    const accepted = acceptAssessment({
      candidateId: typeof item.candidateId === "string" ? item.candidateId : "",
      classification: item.classification as MarketAccountAssessment["classification"],
      machineClassification: item.classification as MarketAccountAssessment["classification"],
      relevance: item.relevance as MarketAccountAssessment["relevance"],
      summary: typeof item.summary === "string" ? item.summary : "",
      whyItMatters: typeof item.whyItMatters === "string" ? item.whyItMatters : "",
      overlap: {
        offer: typeof item.offer === "string" ? item.offer : "",
        audience: typeof item.audience === "string" ? item.audience : "",
        geography: typeof item.geography === "string" ? item.geography : "",
        category: typeof item.category === "string" ? item.category : "",
      },
      evidence: Array.isArray(item.evidenceLabels)
        ? item.evidenceLabels.filter((label): label is string => typeof label === "string").map((label, index) => ({ id: `evidence-${index}`, kind: "profile" as const, label }))
        : [],
      uncertainty: typeof item.uncertainty === "string" ? item.uncertainty : "",
      recommendedAction: item.recommendedAction as MarketAccountAssessment["recommendedAction"],
      source: "social_discovery",
      epistemicStatus: "inference",
      decisionStatus: "unreviewed",
      clientClaim: candidate?.clientClaim ?? "",
    }, candidate);
    return accepted ? [accepted] : [];
  });
  return assessments;
}

async function respond(
  input: string,
  schema: object,
  name: string,
  taskId: "marketQueries" | "marketClassification",
  fetchImpl: typeof fetch,
  apiKey: string,
): Promise<unknown | null> {
  if (!apiKey.trim()) return null;
  const task = resolveAiTask(taskId);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: task.model,
        reasoning: task.reasoningEffort ? { effort: task.reasoningEffort } : undefined,
        max_output_tokens: 8000,
        instructions: "Return only the structured object. Do not name an API, a token, or a vendor.",
        input,
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });
    if (!response.ok) {
      console.error("Market discovery model failed", response.status);
      return null;
    }
    const content = readResponsesText(await response.json());
    if (!content) return null;
    return JSON.parse(content) as unknown;
  } catch (error) {
    console.error("Market discovery model failed", error instanceof Error ? error.message : "request");
    return null;
  }
}
