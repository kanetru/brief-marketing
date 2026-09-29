import type {
  AgentObservation,
  AnswerMode,
  CandidateQuestion,
  ObservationType,
} from "../types/discovery";

const OBSERVATION_TYPES: readonly ObservationType[] = [
  "missing_information",
  "tension",
  "consistent_signal",
  "explicit_uncertainty",
  "possible_follow_up",
];

const LEVELS = ["low", "medium", "high"] as const;
const ANSWER_MODES: readonly AnswerMode[] = ["free_text", "single_choice"];

export interface ParsedAgentResponse {
  observations: AgentObservation[];
  candidateQuestions: CandidateQuestion[];
}

/**
 * OpenAI strict json_schema. Every field is required.
 * free_text questions use an empty options array.
 */
export const AGENT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["observations", "candidateQuestions"],
  properties: {
    observations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "category", "statement", "evidenceReferences", "confidence", "importance", "observationType"],
        properties: {
          id: { type: "string" },
          category: { type: "string" },
          statement: { type: "string" },
          evidenceReferences: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
          confidence: { type: "string", enum: LEVELS },
          importance: { type: "string", enum: LEVELS },
          observationType: { type: "string", enum: OBSERVATION_TYPES },
        },
      },
    },
    candidateQuestions: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "question", "reason", "targetEvidenceGap", "relatedObservationIds", "answerMode", "options", "priority"],
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          reason: { type: "string" },
          targetEvidenceGap: { type: "string" },
          relatedObservationIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          answerMode: { type: "string", enum: ANSWER_MODES },
          options: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "label"],
              properties: {
                id: { type: "string" },
                label: { type: "string" },
              },
            },
          },
          priority: { type: "integer", minimum: 1, maximum: 5 },
        },
      },
    },
  },
} as const;

export function parseAgentResponse(value: unknown): ParsedAgentResponse | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.observations) || !Array.isArray(value.candidateQuestions)) return null;

  const observations: AgentObservation[] = [];
  for (const item of value.observations) {
    const observation = parseObservation(item);
    if (observation) observations.push(observation);
  }

  const candidateQuestions: CandidateQuestion[] = [];
  for (const item of value.candidateQuestions) {
    const question = parseQuestion(item);
    if (question) candidateQuestions.push(question);
  }

  return { observations, candidateQuestions };
}

function parseObservation(value: unknown): AgentObservation | null {
  if (!isRecord(value)) return null;
  const { id, category, statement, confidence, importance, observationType } = value;
  if (!isShortId(id) || !isPhrase(category, 40) || !isPhrase(statement, 400)) return null;
  if (!isLevel(confidence) || !isLevel(importance) || !isObservationType(observationType)) return null;
  const evidenceReferences = stringList(value.evidenceReferences, 6);
  if (!evidenceReferences || evidenceReferences.length === 0) return null;
  return {
    id: id.trim(),
    category: category.trim(),
    statement: statement.trim(),
    evidenceReferences,
    confidence,
    importance,
    observationType,
  };
}

function parseQuestion(value: unknown): CandidateQuestion | null {
  if (!isRecord(value)) return null;
  const { id, question, reason, targetEvidenceGap, answerMode, priority } = value;
  if (!isShortId(id) || !isPhrase(question, 320) || !isPhrase(reason, 400)) return null;
  if (!isPhrase(targetEvidenceGap, 180) || !isAnswerMode(answerMode)) return null;
  if (typeof priority !== "number" || !Number.isInteger(priority) || priority < 1 || priority > 5) return null;
  const relatedObservationIds = stringList(value.relatedObservationIds, 4);
  if (!relatedObservationIds || relatedObservationIds.length === 0) return null;
  const options = parseOptions(value.options);
  if (!options) return null;
  if (answerMode === "single_choice" && options.length < 2) return null;
  if (answerMode === "free_text" && options.length > 0) return null;
  return {
    id: id.trim(),
    question: question.trim(),
    reason: reason.trim(),
    targetEvidenceGap: targetEvidenceGap.trim(),
    relatedObservationIds,
    answerMode,
    options,
    priority,
  };
}

function parseOptions(value: unknown): CandidateQuestion["options"] | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const options = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const { id, label } = item;
    if (!isShortId(id) || !isPhrase(label, 140)) return null;
    options.push({ id: id.trim(), label: label.trim() });
  }
  return options;
}

function stringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 120) return null;
    items.push(item.trim());
  }
  return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isShortId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

function isPhrase(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function isLevel(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high";
}

function isObservationType(value: unknown): value is ObservationType {
  return typeof value === "string" && OBSERVATION_TYPES.includes(value as ObservationType);
}

function isAnswerMode(value: unknown): value is AnswerMode {
  return value === "free_text" || value === "single_choice";
}
