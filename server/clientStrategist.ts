import { CLIENT_STRATEGIST_SYSTEM_PROMPT, CLIENT_STRATEGIST_VERSION } from "../src/agent/clientStrategist.v1";
import { resolveAiTask } from "../src/config/aiModels";
import { CLIENT_STRATEGIST_SCHEMA } from "../src/domain/project/strategist/schema";
import { validateClientStrategist } from "../src/domain/project/strategist/validate";
import type { ClientStrategistOutput } from "../src/types/clientRead";

export interface ClientStrategistRequest {
  packet?: string;
  evidenceIds?: string[];
}

export interface ClientStrategistServiceResult {
  ok: true;
  source: "live_model" | "local_fallback";
  failureCode: string | null;
  promptVersion: string;
  provider: string | null;
  model: string | null;
  output: ClientStrategistOutput | null;
}

export async function generateClientReading(body: ClientStrategistRequest): Promise<ClientStrategistServiceResult> {
  const packet = typeof body.packet === "string" ? body.packet.trim() : "";
  const evidenceIds = Array.isArray(body.evidenceIds) ? body.evidenceIds.filter((id) => typeof id === "string") : [];
  if (!packet) return missed("invalid_response");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Client strategist skipped: OPENAI_API_KEY is not set.");
    return missed("not_configured");
  }
  const task = resolveAiTask("clientStrategist");
  const modelName = task.model ?? task.defaultModel ?? "";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        reasoning: task.reasoningEffort ? { effort: task.reasoningEffort } : undefined,
        max_output_tokens: 32000,
        instructions: CLIENT_STRATEGIST_SYSTEM_PROMPT,
        input: packet,
        text: {
          format: {
            type: "json_schema",
            name: "client_reading",
            strict: true,
            schema: CLIENT_STRATEGIST_SCHEMA,
          },
        },
      }),
    });
    if (!response.ok) {
      console.error("Client strategist request failed", response.status);
      return missed("unavailable", modelName);
    }
    const payload: unknown = await response.json();
    const content = readResponsesText(payload);
    if (!content) return missed("invalid_response", modelName);
    const output = validateClientStrategist(JSON.parse(content), evidenceIds);
    if (!output) return missed("invalid_response", modelName);
    return {
      ok: true,
      source: "live_model",
      failureCode: null,
      promptVersion: CLIENT_STRATEGIST_VERSION,
      provider: "openai",
      model: modelName,
      output,
    };
  } catch (error) {
    console.error("Client strategist failed", error instanceof Error ? error.message : "request");
    return missed("unavailable", modelName);
  }
}

/** Text from a Responses API body. Reasoning items are skipped. */
export function readResponsesText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    if ((item as { type?: string }).type === "reasoning") continue;
    const content = (item as { content?: unknown }).content;
    if (typeof content === "string" && content.trim()) parts.push(content);
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) parts.push(text);
    }
  }
  return parts.join("");
}

function missed(failureCode: string, model: string | null = null): ClientStrategistServiceResult {
  return {
    ok: true,
    source: "local_fallback",
    failureCode,
    promptVersion: CLIENT_STRATEGIST_VERSION,
    provider: model ? "openai" : null,
    model,
    output: null,
  };
}
