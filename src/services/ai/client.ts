import type { AnalysisResult } from "../../domain/analysis";
import type { DiscoveryEvidence } from "../../domain/evidence";

/** Calls our own server. The provider key never lives in this module. */
export async function requestAnalysis(evidence: DiscoveryEvidence): Promise<AnalysisResult> {
  try {
    const response = await fetch("/api/discovery/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence }),
    });
    const body: unknown = await response.json();
    if (!isResult(body)) return { ok: false, error: "unavailable" };
    if (!body.ok && import.meta.env.DEV) console.error("Discovery analysis failed", body.error);
    return body;
  } catch (error) {
    if (import.meta.env.DEV) console.error(error);
    return { ok: false, error: "unavailable" };
  }
}

function isResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const record = value as { ok?: unknown; error?: unknown };
  if (record.ok === true) return true;
  return record.ok === false && (record.error === "not_configured" || record.error === "unavailable" || record.error === "invalid_response");
}
