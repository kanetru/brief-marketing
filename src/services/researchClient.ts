import type { StoredResearch } from "../types/project";

export async function requestPageResearch(url: string): Promise<StoredResearch> {
  const retrievedAt = new Date().toISOString();
  try {
    const response = await fetch("/api/research/page", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = (await response.json()) as StoredResearch;
    if (!body || typeof body.url !== "string") {
      return { url, retrievedAt, observation: null, unavailableReason: "Research is unavailable." };
    }
    return body;
  } catch {
    return { url, retrievedAt, observation: null, unavailableReason: "Research is unavailable." };
  }
}
