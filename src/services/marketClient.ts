import type { CompetitorDiscoveryContext, MarketRunResult, SocialDiscoveryQuery } from "../types/marketDiscovery";

export async function requestMarketDiscovery(body: {
  context: CompetitorDiscoveryContext;
  queries?: SocialDiscoveryQuery[];
  executeQueryIds?: string[];
  refresh?: boolean;
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
  };
}
