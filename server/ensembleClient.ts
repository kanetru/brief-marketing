import type { DiscoveryUsagePurpose, ProviderUsageRecord, SocialPlatform } from "../src/types/marketDiscovery";
import { readEnsembleToken } from "./ensembleData";
import { reportedUnits } from "./ensembleParse";
import { marketLog, sanitiseLog } from "./marketLog";

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
  httpStatus?: number;
  safeMessage: string;
}

const KNOWN_PROVIDER_MESSAGES: Record<string, { failure: NonNullable<EnsembleCallResult["failure"]>; message: string }> = {
  "token not found": { failure: "authentication_failed", message: "Authentication failed" },
  "email not verified": { failure: "authentication_failed", message: "Email not verified" },
  "subscription expired": { failure: "rate_limited", message: "Subscription expired" },
  "all daily units used": { failure: "rate_limited", message: "All daily units used" },
  "invalid username": { failure: "unavailable", message: "Invalid username" },
  "something went wrong": { failure: "unavailable", message: "Provider request failed" },
  "profile not available in region": { failure: "unavailable", message: "Profile not available in this region" },
  "validation error": { failure: "unavailable", message: "Provider rejected the request" },
  "invalid country code": { failure: "unavailable", message: "Provider rejected the request" },
};

export function safeProviderMessage(status: number, payload: unknown): { failure: NonNullable<EnsembleCallResult["failure"]>; message: string } {
  const known = KNOWN_PROVIDER_MESSAGES[providerErrorText(payload)];
  if (known) return known;
  if (status === 401 || status === 403) return { failure: "authentication_failed", message: "Authentication failed" };
  if (status === 429 || status === 495 || status === 493) return { failure: "rate_limited", message: "Rate or unit limit reached" };
  if (status === 422) return { failure: "unavailable", message: "Provider rejected the request" };
  return { failure: "unavailable", message: "Provider request failed" };
}

function providerErrorText(payload: unknown): string {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const error = body.error;
  const nested = error && typeof error === "object" ? (error as { message?: unknown }).message : error;
  const raw = [body.detail, body.message, nested].find((item) => typeof item === "string") as string | undefined;
  return (raw ?? "").toLowerCase().replace(/[.!]+$/g, "").trim();
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
    return { ok: false, failure: "not_configured", data: null, safeMessage: "Not configured", usage: { ...base, success: false, cached: false } };
  }
  if (!options.refresh && options.cache.has(key)) {
    const cached = options.cache.get(key);
    return {
      ok: true,
      failure: null,
      data: cached?.data ?? null,
      safeMessage: "",
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
    const usage = { ...base, success: response.ok, cached: false, ...(units !== undefined ? { units } : {}) };
    if (!response.ok) {
      const judged = safeProviderMessage(response.status, data);
      return { ok: false, failure: judged.failure, data: null, httpStatus: response.status, safeMessage: judged.message, usage: { ...usage, success: false } };
    }
    options.cache.set(key, { data, ...(units !== undefined ? { units } : {}) });
    return { ok: true, failure: null, data, httpStatus: response.status, safeMessage: "", usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    marketLog(`[market-discovery] FAILED\nstage: provider\nmessage: ${sanitiseLog(message, [token]).slice(0, 180) || "Provider request failed"}`, { secrets: [token] });
    return { ok: false, failure: "unavailable", data: null, safeMessage: "Provider request failed", usage: { ...base, success: false, cached: false } };
  }
}

export function redactToken(value: string, token: string): string {
  if (!token || token.length < 6) return value;
  return value.split(token).join("[redacted]");
}
