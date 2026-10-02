import { afterEach, describe, expect, it } from "vitest";
import { AI_TASKS, resolveAiTask } from "./aiModels";
import { generateClientReading, readResponsesText } from "../../server/clientStrategist";
import { analyzeDiscovery } from "../../server/analyze";
import type { DiscoveryEvidence } from "../domain/evidence";

const KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_MODEL_ANALYSIS",
  "OPENAI_MODEL_PROFILE",
  "OPENAI_MODEL_CREATIVE",
  "OPENAI_MODEL_RESEARCH",
  "TERRITORY_IMAGE_MODEL",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  globalThis.fetch = originalFetch;
});

const prose = "The workshop is already near capacity, and the work they want is architectural joinery that architects meet months before procurement. More enquiries would mostly bring the work they are trying not to grow. The useful job is to make that joinery legible early enough that the wrong projects step aside.";

const reading = {
  clientRead: prose,
  clientReadEvidenceIds: ["e1", "missing"],
  observations: [{ title: "The right work", body: prose, evidenceIds: ["e1"], confidence: "high" }],
  tensions: [],
  hypotheses: [{ statement: "Knowledgeable making may be more ownable than craftsmanship.", evidenceIds: ["e1"], confidence: "medium" }],
  unknowns: [],
  positioning: "The workshop for details an architect can specify.",
  channels: [],
  territories: [],
  roadmap: [],
  assetNeeds: [],
};

describe("model configuration", () => {
  it("keeps each task on its own model", () => {
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_MODEL_ANALYSIS;
    delete process.env.OPENAI_MODEL_RESEARCH;
    expect(resolveAiTask("clientStrategist")).toMatchObject({
      model: "gpt-5.6-sol",
      api: "responses",
      reasoningEffort: "high",
    });
    expect(resolveAiTask("discoveryAnalysis").model).toBe("gpt-4o-mini");
    expect(resolveAiTask("discoveryProfile").model).toBe("gpt-4o-mini");
    expect(resolveAiTask("creativeStrategist").model).toBe("gpt-4o-mini");
    expect(resolveAiTask("territoryImages").model).toBe("dall-e-3");
    expect(resolveAiTask("researchExtraction").model).toBeNull();
    expect(resolveAiTask("researchExtraction").reservedModel).toBe("gpt-4o-mini");

    process.env.OPENAI_MODEL = "gpt-5.6-sol-custom";
    process.env.OPENAI_MODEL_ANALYSIS = "gpt-4.1-mini";
    expect(resolveAiTask("clientStrategist").model).toBe("gpt-5.6-sol-custom");
    expect(resolveAiTask("discoveryAnalysis").model).toBe("gpt-4.1-mini");
    expect(resolveAiTask("discoveryProfile").model).toBe("gpt-4o-mini");
    expect(resolveAiTask("researchExtraction").reservedModel).toBe("gpt-4o-mini");
    expect(AI_TASKS.map((item) => item.endpoints.join(" ")).join("\n")).toContain("POST /api/client-strategist");
  });
});

describe("client strategist responses api", () => {
  it("stays a local fallback when no key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const result = await generateClientReading({ packet: "A client.", evidenceIds: ["e1"] });
    expect(called).toBe(false);
    expect(result).toMatchObject({ source: "local_fallback", failureCode: "not_configured", output: null, model: null });
  });

  it("asks the responses api for a structured reading and keeps only known evidence", async () => {
    delete process.env.OPENAI_MODEL;
    process.env.OPENAI_API_KEY = "test-key";
    let url = "";
    let body: Record<string, unknown> = {};
    globalThis.fetch = async (input, init) => {
      url = String(input);
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        output: [
          { type: "reasoning", content: [{ type: "reasoning_text", text: "think" }] },
          { type: "message", content: [{ type: "output_text", text: JSON.stringify(reading) }] },
        ],
      }), { status: 200 });
    };
    const result = await generateClientReading({ packet: "North Workshop is full.", evidenceIds: ["e1"] });
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body.model).toBe("gpt-5.6-sol");
    expect(body.reasoning).toEqual({ effort: "high" });
    expect(body.temperature).toBeUndefined();
    expect(body.input).toBe("North Workshop is full.");
    expect(body.text).toMatchObject({ format: { type: "json_schema", name: "client_reading", strict: true } });
    expect(result.source).toBe("live_model");
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-5.6-sol");
    expect(result.output?.clientReadEvidenceIds).toEqual(["e1"]);
    expect(result.output?.hypotheses[0]?.epistemicStatus).toBe("hypothesis");
  });

  it("honours OPENAI_MODEL without moving classification onto that model", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-5.6-sol-preview";
    const seen: Array<{ url: string; model: string }> = [];
    globalThis.fetch = async (input, init) => {
      const parsed = JSON.parse(String(init?.body)) as { model: string };
      seen.push({ url: String(input), model: parsed.model });
      return new Response(JSON.stringify({ choices: [{ message: { content: "{" } }] }), { status: 200 });
    };
    await generateClientReading({ packet: "A client with enough text.", evidenceIds: [] });
    const evidence: DiscoveryEvidence = {
      clientSaid: {},
      clientSelected: {},
      clientRejected: {},
      clientMarkedUnknown: [],
      derivedSignals: [],
    };
    await analyzeDiscovery(evidence);
    expect(seen.map((item) => item.url)).toEqual([
      "https://api.openai.com/v1/responses",
      "https://api.openai.com/v1/chat/completions",
    ]);
    expect(seen.map((item) => item.model)).toEqual(["gpt-5.6-sol-preview", "gpt-4o-mini"]);
  });

  it("reads output_text and ignores a reasoning trace", () => {
    expect(readResponsesText({ output_text: "{\"clientRead\":\"ok\"}" })).toBe("{\"clientRead\":\"ok\"}");
    expect(readResponsesText({
      output: [
        { type: "reasoning", content: [{ text: "hidden" }] },
        { type: "message", content: [{ text: "shown" }] },
      ],
    })).toBe("shown");
  });
});
