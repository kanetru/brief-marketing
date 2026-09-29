import {
  PROFILE_PROMPT_VERSION,
  PROFILE_SYSTEM_PROMPT,
  buildProfilePrompt,
  buildRefinementPrompt,
} from "../src/agent/discoveryProfile.v1";
import { compileProfile } from "../src/domain/compileProfile";
import type { DiscoveryEvidence } from "../src/domain/evidence";
import { PROFILE_RESPONSE_SCHEMA } from "../src/domain/profileSchema";
import type { ProfileGenerationRequest, ProfileRefinementRequest } from "../src/domain/profileRequest";
import type { AgentObservation, AnalysisFailureCode, DiscoveryProfileVersion, ProfileClarification, ProfileContent } from "../src/types/discovery";

const DEFAULT_MODEL = "gpt-4o-mini";

export interface ProfileServiceResult {
  ok: true;
  failureCode: AnalysisFailureCode | null;
  version: DiscoveryProfileVersion;
}

export async function generateDiscoveryProfile(body: ProfileGenerationRequest): Promise<ProfileServiceResult> {
  return runProfile(body, null, null);
}

export async function refineDiscoveryProfile(body: ProfileRefinementRequest): Promise<ProfileServiceResult> {
  return runProfile(body, body.previous, body.feedbackNote);
}

async function runProfile(
  body: ProfileGenerationRequest,
  previous: ProfileContent | null,
  feedbackNote: string | null,
): Promise<ProfileServiceResult> {
  const evidence = isEvidence(body.evidence) ? body.evidence : null;
  const observations = Array.isArray(body.observations) ? body.observations.filter(isObservation) : [];
  const clarifications = Array.isArray(body.clarifications) ? body.clarifications.filter(isClarification) : [];
  const generatedAt = new Date().toISOString();

  if (!evidence) {
    return {
      ok: true,
      failureCode: "invalid_response",
      version: compileProfile({
        evidence: emptyEvidence(),
        observations: [],
        clarifications: [],
        model: null,
        meta: meta(generatedAt, previous ? "refinement" : "fallback", null, null, feedbackNote),
      }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Discovery profile skipped: OPENAI_API_KEY is not set.");
    return ready(evidence, observations, clarifications, null, "not_configured", generatedAt, previous, feedbackNote, null, null);
  }

  const modelName = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const user =
    previous && feedbackNote
      ? buildRefinementPrompt(evidence, observations, clarifications, previous, feedbackNote)
      : buildProfilePrompt(evidence, observations, clarifications);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        messages: [
          { role: "system", content: PROFILE_SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "discovery_profile",
            strict: true,
            schema: PROFILE_RESPONSE_SCHEMA,
          },
        },
      }),
    });
  } catch (error) {
    console.error("Discovery profile request failed", error instanceof Error ? error.message : "network");
    return ready(evidence, observations, clarifications, null, "unavailable", generatedAt, previous, feedbackNote, null, null);
  }

  if (!response.ok) {
    const detail = redact(await response.text(), apiKey).slice(0, 500);
    console.error(`Discovery profile provider status ${response.status}`, detail);
    return ready(evidence, observations, clarifications, null, "unavailable", generatedAt, previous, feedbackNote, null, null);
  }

  try {
    const payload: unknown = await response.json();
    const parsed: unknown = JSON.parse(readContent(payload));
    return ready(evidence, observations, clarifications, parsed, null, generatedAt, previous, feedbackNote, "openai", modelName);
  } catch (error) {
    console.error("Discovery profile response was not usable", error instanceof Error ? error.message : "parse");
    return ready(evidence, observations, clarifications, null, "invalid_response", generatedAt, previous, feedbackNote, null, null);
  }
}

function ready(
  evidence: DiscoveryEvidence,
  observations: AgentObservation[],
  clarifications: ProfileClarification[],
  model: unknown | null,
  failureCode: AnalysisFailureCode | null,
  generatedAt: string,
  previous: ProfileContent | null,
  feedbackNote: string | null,
  provider: string | null,
  modelName: string | null,
): ProfileServiceResult {
  const source = previous ? "refinement" : model ? "model" : "fallback";
  return {
    ok: true,
    failureCode,
    version: compileProfile({
      evidence,
      observations,
      clarifications,
      model,
      previousContent: model ? null : previous,
      meta: meta(generatedAt, source, provider, modelName, feedbackNote),
    }),
  };
}

function meta(
  generatedAt: string,
  source: "model" | "fallback" | "refinement",
  provider: string | null,
  modelName: string | null,
  feedbackNote: string | null,
) {
  return {
    generatedAt,
    version: 1,
    source,
    promptVersion: PROFILE_PROMPT_VERSION,
    provider,
    modelName,
    feedback: feedbackNote
      ? { response: "mostly" as const, note: feedbackNote, capturedAt: generatedAt }
      : null,
    failureCode: null,
  };
}

function emptyEvidence(): DiscoveryEvidence {
  return { clientSaid: {}, clientSelected: {}, clientRejected: {}, clientMarkedUnknown: [], derivedSignals: [] };
}

function isEvidence(value: unknown): value is DiscoveryEvidence {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DiscoveryEvidence>;
  return !!record.clientSaid && !!record.clientSelected && !!record.clientRejected && Array.isArray(record.clientMarkedUnknown) && Array.isArray(record.derivedSignals);
}

function isObservation(value: unknown): value is AgentObservation {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AgentObservation>;
  return typeof record.id === "string" && typeof record.statement === "string" && Array.isArray(record.evidenceReferences);
}

function isClarification(value: unknown): value is ProfileClarification {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ProfileClarification>;
  return typeof record.id === "string" && typeof record.question === "string" && typeof record.response === "string";
}

function readContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("empty payload");
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") throw new Error("no choices");
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  if (!message || typeof message.content !== "string") throw new Error("no content");
  return message.content;
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[redacted]") : text;
}
