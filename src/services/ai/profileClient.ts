import { compileProfile } from "../../domain/compileProfile";
import type { ProfileGenerationRequest, ProfileRefinementRequest } from "../../domain/profileRequest";
import type { AnalysisFailureCode, DiscoveryProfileVersion, ProfileContent } from "../../types/discovery";

export interface ProfileClientResult {
  ok: true;
  failureCode: AnalysisFailureCode | null;
  version: DiscoveryProfileVersion;
}

/** Calls our own server. If that fails, the profile is assembled from the answers on this device. */
export async function requestProfile(request: ProfileGenerationRequest, previous?: ProfileContent, feedbackNote?: string): Promise<ProfileClientResult> {
  const path = previous ? "/api/discovery/profile/refine" : "/api/discovery/profile";
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(previous ? ({ ...request, previous, feedbackNote: feedbackNote ?? "" } satisfies ProfileRefinementRequest) : request),
    });
    const body: unknown = await response.json();
    if (isProfileResult(body)) return body;
  } catch (error) {
    if (import.meta.env.DEV) console.error(error);
  }
  return localFallback(request, previous ? "refinement" : "fallback", feedbackNote ?? null, previous ?? null);
}

export function localFallback(
  request: ProfileGenerationRequest,
  source: "fallback" | "refinement",
  feedbackNote: string | null,
  previousContent: ProfileContent | null = null,
): ProfileClientResult {
  return {
    ok: true,
    failureCode: "unavailable",
    version: compileProfile({
      evidence: request.evidence,
      observations: request.observations,
      clarifications: request.clarifications,
      model: null,
      previousContent,
      meta: {
        generatedAt: new Date().toISOString(),
        version: 1,
        source,
        promptVersion: null,
        provider: null,
        modelName: null,
        feedback: feedbackNote ? { response: "mostly", note: feedbackNote, capturedAt: new Date().toISOString() } : null,
        failureCode: "unavailable",
      },
    }),
  };
}

function isProfileResult(value: unknown): value is ProfileClientResult {
  if (!value || typeof value !== "object") return false;
  const record = value as { ok?: unknown; version?: { content?: unknown } };
  return record.ok === true && !!record.version && typeof record.version === "object" && !!record.version.content;
}
