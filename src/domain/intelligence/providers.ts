import type { ProviderCapability, RefreshCadence, Signal } from "../../types/intelligence";

/**
 * Providers hand Brief normalised signals.
 * Brief does not talk to a vendor's shape.
 * Demo providers must set origin to "demo". They must not invent a live count.
 */

export interface ProviderFetch {
  brandId: string;
  now: string;
}

export interface ProviderBatch {
  signals: Signal[];
  error: string;
}

export interface IntelligenceProvider {
  id: string;
  sourceType: string;
  capability: ProviderCapability;
  fetch: (input: ProviderFetch) => ProviderBatch;
}

function capability(
  provider: string,
  sourceType: string,
  mode: ProviderCapability["mode"],
  cadence: RefreshCadence,
  flags: Partial<Omit<ProviderCapability, "provider" | "sourceType" | "mode" | "minimumRefreshInterval" | "typicalFreshness">>,
  freshness: string,
): ProviderCapability {
  return {
    provider,
    sourceType,
    supportsHistorical: false,
    supportsRealtime: false,
    supportsFollowerCounts: false,
    supportsEngagement: false,
    supportsComments: false,
    supportsKeywords: false,
    supportsContent: false,
    supportsSearchVolume: false,
    supportsNews: false,
    supportsPricing: false,
    ...flags,
    minimumRefreshInterval: cadence,
    typicalFreshness: freshness,
    mode,
  };
}

export const PROVIDER_CAPABILITIES: readonly ProviderCapability[] = [
  capability("website-html", "website", "live", "manual", { supportsContent: true, supportsHistorical: true }, "When the manager asks. The page reader already blocks private hosts."),
  capability("demo-social", "social", "demo", "daily", { supportsFollowerCounts: true, supportsEngagement: true, supportsComments: true, supportsContent: true, supportsHistorical: true }, "Demo sample. Not a live social account."),
  capability("demo-search", "search", "demo", "daily", { supportsKeywords: true, supportsSearchVolume: true, supportsHistorical: true }, "Demo sample. Not live search volume."),
  capability("demo-news", "news", "demo", "hourly", { supportsNews: true }, "Demo sample. Not a live news wire."),
  capability("demo-market", "market", "demo", "weekly", { supportsPricing: true, supportsHistorical: true }, "Demo sample. Not a live price feed."),
  capability("brand-performance", "performance", "unavailable", "weekly", {}, "No provider connected."),
  capability("analytics", "analytics", "unavailable", "weekly", {}, "No provider connected."),
  capability("ad-intelligence", "ads", "unavailable", "weekly", {}, "No provider connected."),
  capability("review-intelligence", "reviews", "unavailable", "weekly", {}, "No provider connected."),
];

export function capabilityFor(provider: string): ProviderCapability | null {
  return PROVIDER_CAPABILITIES.find((item) => item.provider === provider) ?? null;
}

export function emptyBatch(): ProviderBatch {
  return { signals: [], error: "" };
}

/**
 * Live social configuration.
 * The token is read on the server from ENSEMBLEDATA_API_TOKEN.
 * It must never be a VITE_ variable or sent to the browser.
 * Live account discovery calls EnsembleData only from the server, and only when a manager runs it.
 */
export const SOCIAL_INTELLIGENCE_PROVIDER = {
  id: "ensembledata",
  tokenEnv: "ENSEMBLEDATA_API_TOKEN",
} as const;
