import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "../src/agent/discoveryInterviewer.v1";
import type { AnalysisResult } from "../src/domain/analysis";
import { AGENT_RESPONSE_SCHEMA, parseAgentResponse } from "../src/domain/agentSchema";
import type { DiscoveryEvidence } from "../src/domain/evidence";
import { selectClarificationQuestions, supportedObservations } from "../src/domain/questionSelection";

const DEFAULT_MODEL = "gpt-4o-mini";

export async function analyzeDiscovery(evidence: DiscoveryEvidence): Promise<AnalysisResult> {
  if (!isEvidence(evidence)) return { ok: false, error: "invalid_response" };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Discovery analysis skipped: OPENAI_API_KEY is not set.");
    return { ok: false, error: "not_configured" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(evidence) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "discovery_analysis",
            strict: true,
            schema: AGENT_RESPONSE_SCHEMA,
          },
        },
      }),
    });
  } catch (error) {
    console.error("Discovery analysis request failed", error instanceof Error ? error.message : "network");
    return { ok: false, error: "unavailable" };
  }

  if (!response.ok) {
    const detail = redact(await response.text(), apiKey).slice(0, 500);
    console.error(`Discovery analysis provider status ${response.status}`, detail);
    return { ok: false, error: "unavailable" };
  }

  let content = "";
  try {
    const payload: unknown = await response.json();
    content = readContent(payload);
    const parsed: unknown = JSON.parse(content);
    const validated = parseAgentResponse(parsed);
    if (!validated) return { ok: false, error: "invalid_response" };
    const observations = supportedObservations(validated.observations, evidence);
    const selected = selectClarificationQuestions(validated.candidateQuestions, observations, evidence);
    return {
      ok: true,
      analysisVersion: PROMPT_VERSION,
      provider: "openai",
      model,
      observations,
      candidates: validated.candidateQuestions,
      selected,
      rawModelResponse: parsed,
    };
  } catch (error) {
    console.error("Discovery analysis response was not usable", error instanceof Error ? error.message : "parse");
    return { ok: false, error: "invalid_response" };
  }
}

function isEvidence(value: unknown): value is DiscoveryEvidence {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DiscoveryEvidence>;
  return !!record.clientSaid && !!record.clientSelected && !!record.clientRejected && Array.isArray(record.clientMarkedUnknown) && Array.isArray(record.derivedSignals);
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
