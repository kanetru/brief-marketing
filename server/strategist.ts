import { STRATEGIST_PROMPT_VERSION, STRATEGIST_SYSTEM_PROMPT, buildStrategistPrompt } from "../src/agent/creativeStrategist.v1";
import { STRATEGIST_RESPONSE_SCHEMA } from "../src/domain/strategistSchema";
import { validateStrategistPayload, type StrategistContext } from "../src/domain/strategistValidate";
import type { CreativeReading } from "../src/types/creativeReading";
import { modelFor } from "../src/config/aiModels";

export interface StrategistRequest {
  brief?: string;
  context?: StrategistContext;
}

export interface StrategistServiceResult {
  ok: true;
  failureCode: string | null;
  promptVersion: string;
  provider: string | null;
  model: string | null;
  reading: CreativeReading | null;
}

export async function generateCreativeReading(body: StrategistRequest): Promise<StrategistServiceResult> {
  const context = body.context;
  const brief = typeof body.brief === "string" ? body.brief : "";
  if (!context || !context.name || !brief) {
    return empty("invalid_response");
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Creative strategist skipped: OPENAI_API_KEY is not set.");
    return empty("not_configured");
  }
  const modelName = modelFor("creativeStrategist");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.7,
        messages: [
          { role: "system", content: STRATEGIST_SYSTEM_PROMPT },
          { role: "user", content: buildStrategistPrompt(brief) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "creative_reading", strict: true, schema: STRATEGIST_RESPONSE_SCHEMA },
        },
      }),
    });
    if (!response.ok) {
      console.error("Creative strategist request failed", response.status);
      return empty("unavailable", modelName);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return empty("invalid_response", modelName);
    const parsed: unknown = JSON.parse(content);
    const reading = validateStrategistPayload(parsed, context);
    if (!reading) return empty("invalid_response", modelName);
    return {
      ok: true,
      failureCode: null,
      promptVersion: STRATEGIST_PROMPT_VERSION,
      provider: "openai",
      model: modelName,
      reading,
    };
  } catch (error) {
    console.error("Creative strategist failed", error instanceof Error ? error.message : "request");
    return empty("unavailable", modelName);
  }
}

function empty(failureCode: string, model: string | null = null): StrategistServiceResult {
  return {
    ok: true,
    failureCode,
    promptVersion: STRATEGIST_PROMPT_VERSION,
    provider: model ? "openai" : null,
    model,
    reading: null,
  };
}
