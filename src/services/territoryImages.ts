import type { TerritoryImageAsset, TerritoryVisualSpec } from "../types/brandIntelligence";

interface ImageryResponse {
  status: "fallback" | "ready" | "failed";
  provider: string | null;
  model: string | null;
  failureReason?: string;
  assets: Array<{
    role: TerritoryImageAsset["role"];
    source: TerritoryImageAsset["source"];
    status: TerritoryImageAsset["status"];
    url: string | null;
    prompt: string;
  }>;
}

/** Asks the server adapter for imagery. Falls back locally if generation is not configured. */
export async function requestTerritoryImages(spec: TerritoryVisualSpec): Promise<TerritoryImageAsset[]> {
  try {
    const response = await fetch("/api/territory-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionKey: spec.versionKey,
        prompts: spec.imageAssets.map((asset) => ({ role: asset.role, prompt: asset.prompt, treatment: asset.treatment })),
      }),
    });
    if (!response.ok) return spec.imageAssets;
    const body = (await response.json()) as ImageryResponse;
    if (!Array.isArray(body.assets) || body.assets.length === 0) return spec.imageAssets;
    if (body.failureReason && import.meta.env.DEV) {
      console.info("Territory imagery stayed on fallback", body.failureReason);
    }
    return spec.imageAssets.map((asset) => {
      const match = body.assets.find((item) => item.role === asset.role);
      if (!match) return asset;
      return {
        ...asset,
        source: match.source ?? "fallback",
        status: match.status ?? "fallback",
        url: match.url ?? null,
        provider: body.provider,
        model: body.model,
        prompt: match.prompt || asset.prompt,
      };
    });
  } catch {
    return spec.imageAssets;
  }
}
