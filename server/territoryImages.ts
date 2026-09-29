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
 * Credentials never reach the client.
 * When TERRITORY_IMAGE_PROVIDER is unset, or generation fails, fallback assets remain.
 * Set TERRITORY_IMAGE_PROVIDER=openai to generate one frame per prompt.
 */
export async function resolveTerritoryImages(request: TerritoryImageRequest): Promise<TerritoryImageResult> {
  const prompts = Array.isArray(request.prompts) ? request.prompts : [];
  const providerName = process.env.TERRITORY_IMAGE_PROVIDER?.trim() || null;
  const fallbackAssets = prompts.map((item) => ({
    role: item.role || "hero",
    source: "fallback" as const,
    status: "fallback" as const,
    url: null as string | null,
    prompt: item.prompt || "",
  }));

  if (!providerName) {
    return { status: "fallback", provider: null, model: null, assets: fallbackAssets };
  }

  if (providerName !== "openai") {
    const result: TerritoryImageResult = {
      status: "fallback",
      provider: providerName,
      model: process.env.TERRITORY_IMAGE_MODEL?.trim() || null,
      assets: fallbackAssets,
    };
    if (process.env.NODE_ENV !== "production") result.failureReason = "provider_not_implemented";
    return result;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.TERRITORY_IMAGE_MODEL?.trim() || "dall-e-3";
  if (!apiKey) {
    const result: TerritoryImageResult = { status: "fallback", provider: "openai", model, assets: fallbackAssets };
    if (process.env.NODE_ENV !== "production") result.failureReason = "not_configured";
    return result;
  }

  const assets = [];
  for (const item of fallbackAssets) {
    const url = await generateFrame(apiKey, model, item.prompt);
    assets.push(
      url
        ? { role: item.role, source: "generated" as const, status: "ready" as const, url, prompt: item.prompt }
        : item,
    );
  }
  const ready = assets.some((asset) => asset.status === "ready");
  return { status: ready ? "ready" : "fallback", provider: "openai", model, assets };
}

async function generateFrame(apiKey: string, model: string, prompt: string): Promise<string | null> {
  if (!prompt.trim()) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(imageBody(model, prompt)),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const frame = payload.data?.[0];
    if (frame?.b64_json) return `data:image/png;base64,${frame.b64_json}`;
    return frame?.url ?? null;
  } catch {
    return null;
  }
}

function imageBody(model: string, prompt: string): Record<string, unknown> {
  if (model.startsWith("gpt-image")) {
    return { model, prompt: prompt.slice(0, 32000), size: "1024x1024" };
  }
  return { model, prompt: prompt.slice(0, 3900), n: 1, size: "1024x1024", response_format: "b64_json" };
}
