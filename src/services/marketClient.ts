import type { CompetitorDiscoveryContext, CompletedSearch, MarketRetry, MarketRunResult, ResearchStages, SocialAccountCandidate, SocialDiscoveryQuery, TechnicalDetail } from "../types/marketDiscovery";
import { sanitiseLog } from "../domain/market/sanitise";

export async function requestMarketDiscovery(body: {
  context: CompetitorDiscoveryContext;
  queries?: SocialDiscoveryQuery[];
  executeQueryIds?: string[];
  refresh?: boolean;
  retry?: MarketRetry;
  previousCandidates?: SocialAccountCandidate[];
  completedSearches?: CompletedSearch[];
  previousStages?: ResearchStages;
  previousOrigin?: "live" | "cached";
}): Promise<MarketRunResult> {
  try {
    const response = await fetch("/api/market/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = await response.json() as Partial<MarketRunResult>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.ok !== "boolean") return unavailable();
    return {
      ok: parsed.ok,
      failure: parsed.failure ?? null,
      message: parsed.ok ? "" : "Discovery unavailable",
      set: parsed.set ?? null,
      candidates: parsed.candidates ?? [],
      assessments: parsed.assessments ?? [],
      proposals: parsed.proposals ?? [],
      usage: parsed.usage ?? [],
      origin: parsed.origin === "live" || parsed.origin === "cached" ? parsed.origin : "unavailable",
      stages: cleanStages(parsed.stages),
      technical: cleanTechnical(parsed.technical),
      completedSearches: cleanSearches(parsed.completedSearches),
    };
  } catch {
    return unavailable();
  }
}

function unavailable(): MarketRunResult {
  return {
    ok: false,
    failure: "unavailable",
    message: "Discovery unavailable",
    set: null,
    candidates: [],
    assessments: [],
    proposals: [],
    usage: [],
    origin: "unavailable",
    technical: [{ stage: "Market research", message: "The research request didn't complete" }],
  };
}

function cleanTechnical(value: unknown): TechnicalDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { stage?: unknown; message?: unknown; httpStatus?: unknown };
    const stage = typeof record.stage === "string" ? sanitiseLog(record.stage).slice(0, 80) : "";
    const message = typeof record.message === "string" ? sanitiseLog(record.message).slice(0, 200) : "";
    if (!stage || !message) return [];
    const httpStatus = typeof record.httpStatus === "number" && record.httpStatus > 0 ? record.httpStatus : undefined;
    return [{ stage, message, ...(httpStatus ? { httpStatus } : {}) }];
  });
}

function cleanStages(value: unknown): ResearchStages | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const names = ["queries", "instagram", "tiktok", "enrichment", "classification"] as const;
  const stages = {} as ResearchStages;
  for (const name of names) {
    const item = record[name];
    if (!item || typeof item !== "object") return undefined;
    const status = (item as { status?: unknown }).status;
    if (status !== "not_started" && status !== "running" && status !== "partial" && status !== "complete" && status !== "failed") return undefined;
    const message = typeof (item as { message?: unknown }).message === "string" ? sanitiseLog((item as { message: string }).message).slice(0, 200) : "";
    const httpStatus = typeof (item as { httpStatus?: unknown }).httpStatus === "number" ? (item as { httpStatus: number }).httpStatus : undefined;
    stages[name] = { status, ...(message ? { message } : {}), ...(httpStatus ? { httpStatus } : {}) };
  }
  return stages;
}

function cleanSearches(value: unknown): CompletedSearch[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const searches = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { platform?: unknown; query?: unknown; endpoint?: unknown };
    if (record.platform !== "instagram" && record.platform !== "tiktok") return [];
    if (typeof record.query !== "string" || typeof record.endpoint !== "string") return [];
    if (!record.endpoint.startsWith("/")) return [];
    const platform: CompletedSearch["platform"] = record.platform;
    return [{ platform, query: sanitiseLog(record.query).slice(0, 120), endpoint: record.endpoint.slice(0, 80) }];
  });
  return searches;
}
