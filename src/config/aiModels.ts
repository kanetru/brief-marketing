/**
 * One place for which model each server task calls.
 * OPENAI_MODEL overrides the client strategist and brand-intelligence interpretation.
 * It does not change extraction or classification. Interpretation is never scheduled.
 * Cheaper tasks have their own variables, so they stay cheap when the strategist changes.
 */

export type AiTaskId =
  | "clientStrategist"
  | "brandIntelligence"
  | "creativeStrategist"
  | "discoveryAnalysis"
  | "discoveryProfile"
  | "researchExtraction"
  | "territoryImages";

export type ModelApi = "responses" | "chat_completions" | "images" | "none";

export interface AiTaskSpec {
  id: AiTaskId;
  /** What this task is for. */
  task: string;
  /** HTTP routes that use this choice. */
  endpoints: readonly string[];
  provider: "openai" | "local";
  api: ModelApi;
  /** Model used when the task calls a provider and its env var is unset. */
  defaultModel: string | null;
  /** Responses API reasoning effort. Null on tasks that do not reason. */
  reasoningEffort: "high" | "medium" | "low" | null;
  /** Env var that overrides defaultModel. Null when the task does not call a model. */
  env: string | null;
  /** False when the route is local and must not inherit a model. */
  callsModel: boolean;
}

export const AI_TASKS: readonly AiTaskSpec[] = [
  {
    id: "clientStrategist",
    task: "Strategic reading of the whole client",
    endpoints: ["POST /api/client-strategist"],
    provider: "openai",
    api: "responses",
    defaultModel: "gpt-5.6-sol",
    reasoningEffort: "high",
    env: "OPENAI_MODEL",
    callsModel: true,
  },
  {
    id: "brandIntelligence",
    task: "Interpret meaningful signals against the brand brain. Never on a timer.",
    endpoints: ["No route. Reuse the client strategist only after the cheap filter says something changed."],
    provider: "openai",
    api: "responses",
    defaultModel: "gpt-5.6-sol",
    reasoningEffort: "high",
    env: "OPENAI_MODEL",
    callsModel: true,
  },
  {
    id: "creativeStrategist",
    task: "Creative territory reading",
    endpoints: ["POST /api/discovery/strategist"],
    provider: "openai",
    api: "chat_completions",
    defaultModel: "gpt-4o-mini",
    reasoningEffort: null,
    env: "OPENAI_MODEL_CREATIVE",
    callsModel: true,
  },
  {
    id: "discoveryAnalysis",
    task: "Clarification and observation classification",
    endpoints: ["POST /api/discovery/analyze"],
    provider: "openai",
    api: "chat_completions",
    defaultModel: "gpt-4o-mini",
    reasoningEffort: null,
    env: "OPENAI_MODEL_ANALYSIS",
    callsModel: true,
  },
  {
    id: "discoveryProfile",
    task: "Discovery profile draft and refinement",
    endpoints: ["POST /api/discovery/profile", "POST /api/discovery/profile/refine"],
    provider: "openai",
    api: "chat_completions",
    defaultModel: "gpt-4o-mini",
    reasoningEffort: null,
    env: "OPENAI_MODEL_PROFILE",
    callsModel: true,
  },
  {
    id: "researchExtraction",
    task: "Website and competitor page extraction",
    endpoints: ["POST /api/research/page", "POST /api/research/site"],
    provider: "local",
    api: "none",
    defaultModel: "gpt-4o-mini",
    reasoningEffort: null,
    env: "OPENAI_MODEL_RESEARCH",
    callsModel: false,
  },
  {
    id: "territoryImages",
    task: "Territory image generation",
    endpoints: ["POST /api/territory-images"],
    provider: "openai",
    api: "images",
    defaultModel: "dall-e-3",
    reasoningEffort: null,
    env: "TERRITORY_IMAGE_MODEL",
    callsModel: true,
  },
];

export interface ResolvedAiTask extends AiTaskSpec {
  /** The model this process will send. Null when the task does not call one. */
  model: string | null;
  /** Cheap-model slot for a task that is local today. Null when unused. */
  reservedModel: string | null;
}

export function aiTask(id: AiTaskId): AiTaskSpec {
  const found = AI_TASKS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown AI task: ${id}`);
  return found;
}

function envValue(name: string): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name]?.trim() ?? "";
}

export function resolveAiTask(id: AiTaskId): ResolvedAiTask {
  const spec = aiTask(id);
  const override = spec.env ? envValue(spec.env) : "";
  const chosen = override || spec.defaultModel;
  if (!spec.callsModel) {
    return { ...spec, model: null, reservedModel: chosen };
  }
  return { ...spec, model: chosen, reservedModel: null };
}

/** Model name sent to the provider for a task that calls one. */
export function modelFor(id: AiTaskId): string {
  const resolved = resolveAiTask(id);
  if (!resolved.model) throw new Error(`${id} does not call a model`);
  return resolved.model;
}
