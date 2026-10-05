import type { DiscoveryUsagePurpose, ProviderUsageRecord, SocialPlatform } from "../src/types/marketDiscovery";
import { readEnsembleToken } from "./ensembleData";
import { reportedUnits } from "./ensembleParse";

const ROOT = "https://ensembledata.com/apis";

export interface EnsembleRequest {
  endpoint: "/instagram/search" | "/instagram/user/detailed-info" | "/tt/user/search" | "/tt/keyword/search" | "/tt/user/info" | "/tt/user/posts";
  platform: SocialPlatform;
  purpose: DiscoveryUsagePurpose;
  params: Record<string, string>;
}

export interface EnsembleCallResult {
  ok: boolean;
  failure: "not_configured" | "authentication_failed" | "rate_limited" | "unavailable" | null;
  data: unknown;
  usage: ProviderUsageRecord;
}

export type EnsembleCache = Map<string, { data: unknown; units?: number }>;

export function cacheKey(request: EnsembleRequest): string {
  const pairs = Object.entries(request.params).filter(([key]) => key !== "token").sort(([a], [b]) => a.localeCompare(b));
  return `${request.endpoint}?${pairs.map(([key, value]) => `${key}=${value}`).join("&")}`;
}

export async function callEnsemble(
  request: EnsembleRequest,
  options: { fetchImpl: typeof fetch; now: string; refresh: boolean; cache: EnsembleCache; token?: string },
): Promise<EnsembleCallResult> {
  const token = options.token ?? readEnsembleToken();
  const key = cacheKey(request);
  const base = {
    provider: "ensembledata" as const,
    endpoint: request.endpoint,
    platform: request.platform,
    requestedAt: options.now,
    purpose: request.purpose,
  };
  if (!token) {
    return { ok: false, failure: "not_configured", data: null, usage: { ...base, success: false, cached: false } };
  }
  if (!options.refresh && options.cache.has(key)) {
    const cached = options.cache.get(key);
    return {
      ok: true,
      failure: null,
      data: cached?.data ?? null,
      usage: { ...base, success: true, cached: true, ...(cached?.units !== undefined ? { units: cached.units } : {}) },
    };
  }
  const url = new URL(ROOT + request.endpoint);
  for (const [name, value] of Object.entries(request.params)) url.searchParams.set(name, value);
  url.searchParams.set("token", token);
  try {
    const response = await options.fetchImpl(url);
    const textBody = await response.text();
    let data: unknown = null;
    try {
      data = textBody ? JSON.parse(textBody) : null;
    } catch {
      data = null;
    }
    const units = reportedUnits(data, response.headers);
    if (response.status === 401 || response.status === 403) {
      return { ok: false, failure: "authentication_failed", data: null, usage: { ...base, success: false, cached: false, ...(units !== undefined ? { units } : {}) } };
    }
    if (response.status === 429 || response.status === 495) {
      return { ok: false, failure: "rate_limited", data: null, usage: { ...base, success: false, cached: false, ...(units !== undefined ? { units } : {}) } };
    }
    if (!response.ok) {
      return { ok: false, failure: "unavailable", data: null, usage: { ...base, success: false, cached: false, ...(units !== undefined ? { units } : {}) } };
    }
    options.cache.set(key, { data, ...(units !== undefined ? { units } : {}) });
    return { ok: true, failure: null, data, usage: { ...base, success: true, cached: false, ...(units !== undefined ? { units } : {}) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes(token)) {
      console.error("EnsembleData request failed");
    } else {
      console.error("EnsembleData request failed", message.slice(0, 180));
    }
    return { ok: false, failure: "unavailable", data: null, usage: { ...base, success: false, cached: false } };
  }
}

export function redactToken(value: string, token: string): string {
  if (!token || token.length < 6) return value;
  return value.split(token).join("[redacted]");
}
