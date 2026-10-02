import { CLIENT_STRATEGIST_SYSTEM_PROMPT, CLIENT_STRATEGIST_VERSION } from "../src/agent/clientStrategist.v1";
import { CLIENT_STRATEGIST_SCHEMA } from "../src/domain/project/strategist/schema";
import { validateClientStrategist } from "../src/domain/project/strategist/validate";
import type { ClientStrategistOutput } from "../src/types/clientRead";

const DEFAULT_MODEL = "gpt-4o";

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
  const modelName = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.4,
        messages: [
          { role: "system", content: CLIENT_STRATEGIST_SYSTEM_PROMPT },
          { role: "user", content: packet },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "client_reading", strict: true, schema: CLIENT_STRATEGIST_SCHEMA },
        },
      }),
    });
    if (!response.ok) {
      console.error("Client strategist request failed", response.status);
      return missed("unavailable", modelName);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
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
