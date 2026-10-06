import type { CompletedSearch, MarketDiscoveryRecord, MarketRetry, ResearchStage, ResearchStages } from "../../types/marketDiscovery";

export function emptyStages(): ResearchStages {
  return {
    queries: { status: "not_started" },
    instagram: { status: "not_started" },
    tiktok: { status: "not_started" },
    enrichment: { status: "not_started" },
    classification: { status: "not_started" },
  };
}

export function searchKey(search: Pick<CompletedSearch, "platform" | "query" | "endpoint">): string {
  return `${search.platform}|${search.query}|${search.endpoint}`;
}

export function mergeCompleted(previous: readonly CompletedSearch[] | undefined, next: readonly CompletedSearch[] | undefined): CompletedSearch[] {
  const seen = new Set<string>();
  const merged: CompletedSearch[] = [];
  for (const item of [...(previous ?? []), ...(next ?? [])]) {
    const key = searchKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export function stageOf(status: ResearchStage["status"], message?: string, httpStatus?: number): ResearchStage {
  return {
    status,
    ...(message ? { message } : {}),
    ...(httpStatus ? { httpStatus } : {}),
  };
}

/** A later click should repeat the failed stage, not a search that already succeeded. */
export function researchRetry(record: MarketDiscoveryRecord | undefined): MarketRetry | undefined {
  const stages = record?.stages;
  if (!stages || (record?.candidates.length ?? 0) === 0) return undefined;
  const instagramFailed = stages.instagram.status === "failed";
  const tiktokFailed = stages.tiktok.status === "failed";
  if (instagramFailed && !tiktokFailed) return "instagram";
  if (tiktokFailed && !instagramFailed) return "tiktok";
  if (stages.classification.status === "failed") return "classification";
  if (stages.enrichment.status === "failed" || stages.enrichment.status === "partial") return "enrichment";
  return undefined;
}
