export interface TerritoryImageRequest {
  versionKey?: string;
  prompts?: Array<{ role?: string; prompt?: string; treatment?: string }>;
}

export interface TerritoryImageResult {
  status: "fallback" | "ready" | "failed";
  provider: string | null;
  model: string | null;
  failureReason?: string;
  assets: Array<{
    role: string;
    source: "generated" | "curated" | "fallback";
    status: "ready" | "fallback" | "failed";
    url: string | null;
    prompt: string;
  }>;
}

/**
 * Server-side imagery boundary.
 * No provider is wired in this version. Credentials never reach the client.
 * When TERRITORY_IMAGE_PROVIDER is unset, curated fallback assets are the result.
 */
export function resolveTerritoryImages(request: TerritoryImageRequest): TerritoryImageResult {
  const prompts = Array.isArray(request.prompts) ? request.prompts : [];
  const providerName = process.env.TERRITORY_IMAGE_PROVIDER?.trim() || null;
  const assets = prompts.map((item) => ({
    role: item.role || "hero",
    source: "fallback" as const,
    status: "fallback" as const,
    url: null,
    prompt: item.prompt || "",
  }));

  if (!providerName) {
    return { status: "fallback", provider: null, model: null, assets };
  }

  const result: TerritoryImageResult = {
    status: "fallback",
    provider: providerName,
    model: process.env.TERRITORY_IMAGE_MODEL?.trim() || null,
    assets,
  };
  if (process.env.NODE_ENV !== "production") {
    result.failureReason = "provider_not_implemented";
  }
  return result;
}
