import type { AgentConfidence, NarrativeSection, ProfileStatement, ProfileStatementStatus } from "../types/discovery";

const STATUSES: readonly ProfileStatementStatus[] = [
  "direct",
  "strong_pattern",
  "possible_pattern",
  "tension",
  "explicit_uncertainty",
];

const LEVELS: readonly AgentConfidence[] = ["low", "medium", "high"];

const NARRATIVE_KEYS = [
  "businessSummary",
  "audienceSummary",
  "marketingGoals",
  "personalitySummary",
  "visualPreferences",
  "colourPreferences",
  "typographyPreferences",
  "imageryPreferences",
  "voicePreferences",
  "inspirationSummary",
] as const;

export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];

export interface ParsedProfile {
  businessSummary: NarrativeSection;
  audienceSummary: NarrativeSection;
  marketingGoals: NarrativeSection;
  personalitySummary: NarrativeSection;
  visualPreferences: NarrativeSection;
  colourPreferences: NarrativeSection;
  typographyPreferences: NarrativeSection;
  imageryPreferences: NarrativeSection;
  voicePreferences: NarrativeSection;
  inspirationSummary: NarrativeSection;
  strongSignals: ProfileStatement[];
  mixedSignals: ProfileStatement[];
  unresolvedQuestions: ProfileStatement[];
  discussionPoints: Array<{ id: string; prompt: string; evidenceReferences: string[] }>;
}

const statementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "statement", "evidenceReferences", "confidence", "status"],
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    statement: { type: "string" },
    evidenceReferences: { type: "array", items: { type: "string" }, maxItems: 6 },
    confidence: { type: "string", enum: LEVELS },
    status: { type: "string", enum: STATUSES },
  },
} as const;

const narrativeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "statements"],
  properties: {
    summary: { type: "string" },
    statements: { type: "array", maxItems: 4, items: statementSchema },
  },
} as const;

export const PROFILE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...NARRATIVE_KEYS, "strongSignals", "mixedSignals", "unresolvedQuestions", "discussionPoints"],
  properties: {
    businessSummary: narrativeSchema,
    audienceSummary: narrativeSchema,
    marketingGoals: narrativeSchema,
    personalitySummary: narrativeSchema,
    visualPreferences: narrativeSchema,
    colourPreferences: narrativeSchema,
    typographyPreferences: narrativeSchema,
    imageryPreferences: narrativeSchema,
    voicePreferences: narrativeSchema,
    inspirationSummary: narrativeSchema,
    strongSignals: { type: "array", maxItems: 6, items: statementSchema },
    mixedSignals: { type: "array", maxItems: 4, items: statementSchema },
    unresolvedQuestions: { type: "array", maxItems: 6, items: statementSchema },
    discussionPoints: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "prompt", "evidenceReferences"],
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          evidenceReferences: { type: "array", items: { type: "string" }, maxItems: 6 },
        },
      },
    },
  },
} as const;

export function parseProfileResponse(value: unknown): ParsedProfile | null {
  if (!isRecord(value)) return null;
  const parsed = {} as ParsedProfile;
  for (const key of NARRATIVE_KEYS) {
    const section = parseNarrative(value[key], key);
    if (!section) return null;
    parsed[key] = section;
  }
  const strongSignals = parseStatements(value.strongSignals, 6, "signal");
  const mixedSignals = parseStatements(value.mixedSignals, 4, "tension");
  const unresolvedQuestions = parseStatements(value.unresolvedQuestions, 6, "open");
  const discussionPoints = parseDiscussion(value.discussionPoints);
  if (!strongSignals || !mixedSignals || !unresolvedQuestions || !discussionPoints) return null;
  return { ...parsed, strongSignals, mixedSignals, unresolvedQuestions, discussionPoints };
}

function parseNarrative(value: unknown, key: string): NarrativeSection | null {
  if (!isRecord(value)) return null;
  if (typeof value.summary !== "string" || value.summary.trim().length > 700) return null;
  const statements = parseStatements(value.statements, 4, key);
  if (!statements) return null;
  return { summary: value.summary.trim(), statements };
}

function parseStatements(value: unknown, max: number, typeFallback: string): ProfileStatement[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const items: ProfileStatement[] = [];
  for (const entry of value) {
    const statement = parseStatement(entry, typeFallback);
    if (!statement) return null;
    items.push(statement);
  }
  return items;
}

function parseStatement(value: unknown, typeFallback: string): ProfileStatement | null {
  if (!isRecord(value)) return null;
  if (!isId(value.id) || typeof value.statement !== "string") return null;
  const statement = value.statement.trim();
  if (!statement || statement.length > 500) return null;
  if (!isLevel(value.confidence) || !isStatus(value.status)) return null;
  const evidenceReferences = stringList(value.evidenceReferences, 6);
  if (!evidenceReferences) return null;
  const type = typeof value.type === "string" && value.type.trim() ? value.type.trim().slice(0, 40) : typeFallback;
  return {
    id: value.id.trim(),
    type,
    statement,
    evidenceReferences,
    confidence: value.confidence,
    status: value.status,
  };
}

function parseDiscussion(value: unknown): ParsedProfile["discussionPoints"] | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const items: ParsedProfile["discussionPoints"] = [];
  for (const entry of value) {
    if (!isRecord(entry) || !isId(entry.id) || typeof entry.prompt !== "string") return null;
    const prompt = entry.prompt.trim();
    if (!prompt || prompt.length > 400) return null;
    const evidenceReferences = stringList(entry.evidenceReferences, 6);
    if (!evidenceReferences) return null;
    items.push({ id: entry.id.trim(), prompt, evidenceReferences });
  }
  return items;
}

function stringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 140) return null;
    items.push(item.trim());
  }
  return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

function isLevel(value: unknown): value is AgentConfidence {
  return value === "low" || value === "medium" || value === "high";
}

function isStatus(value: unknown): value is ProfileStatementStatus {
  return typeof value === "string" && STATUSES.includes(value as ProfileStatementStatus);
}
