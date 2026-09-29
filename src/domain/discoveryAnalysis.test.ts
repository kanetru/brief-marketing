import { readFileSync } from "node:fs";
import { describe, expect, it, afterEach } from "vitest";
import { SYSTEM_PROMPT } from "../agent/discoveryInterviewer.v1";
import { analyzeDiscovery } from "../../server/analyze";
import { parseAgentResponse } from "./agentSchema";
import { buildDiscoveryEvidence } from "./evidence";
import {
  MANAGER_HELP_ID,
  MANAGER_HELP_LABEL,
  selectClarificationQuestions,
} from "./questionSelection";
import { deriveVisualSignal } from "./visualSignal";
import { deriveVoiceSignal } from "./voiceSignal";
import { createSession } from "../state/createSession";
import { migrateSession } from "../state/storage";
import type { AgentObservation, CandidateQuestion, DiscoverySession, VisualPreferences, VoicePreferences } from "../types/discovery";

describe("session migration", () => {
  it("keeps a v2 session and fills voice, inspiration, and the agent layers", () => {
    const current = createSession("2020-01-01T00:00:00.000Z");
    const stored = {
      ...current,
      version: 2,
      voicePreferences: { status: "not_started" },
      inspiration: { status: "not_started" },
      agentObservations: { status: "not_generated", items: [] },
      agentQuestions: { status: "not_generated", items: [] },
      progress: {
        section: "imagery",
        furthest: "imagery",
        steps: {
          welcome: 0,
          business: 2,
          audience: 0,
          goals: 0,
          personality: 0,
          spectrum: 0,
          visual: 0,
          colour: 0,
          type: 0,
          imagery: 1,
        },
      },
    };

    const migrated = migrateSession(stored);
    expect(migrated?.version).toBe(3);
    expect(migrated?.progress.steps.business).toBe(2);
    expect(migrated?.progress.steps.voice).toBe(0);
    expect(migrated?.progress.steps.clarify).toBe(0);
    expect(migrated?.voicePreferences.comparisons).toHaveLength(4);
    expect(migrated?.inspiration.positiveReferences).toEqual([]);
    expect(migrated?.agentObservations.status).toBe("not_generated");
    expect(migrated?.agentObservations.failureCode).toBeNull();
    expect(migrated?.business).toEqual(current.business);
  });

  it("accepts a v1 session that only has the early sections", () => {
    const current = createSession("2020-01-01T00:00:00.000Z");
    const migrated = migrateSession({
      version: 1,
      id: current.id,
      createdAt: current.createdAt,
      business: current.business,
      audience: current.audience,
      goals: current.goals,
      personality: current.personality,
      progress: { section: "goals", furthest: "goals", steps: { welcome: 0, business: 3, audience: 1, goals: 0, personality: 0 } },
    });
    expect(migrated?.version).toBe(3);
    expect(migrated?.visualPreferences.comparisons.length).toBeGreaterThan(0);
    expect(migrated?.voicePreferences.comparisons).toHaveLength(4);
    expect(migrated?.progress.steps.business).toBe(3);
  });
});

describe("evidence builder", () => {
  it("is deterministic and keeps derived numbers out of the selection records", () => {
    const session = answeredSession();
    const first = buildDiscoveryEvidence(session);
    const second = buildDiscoveryEvidence(session);
    expect(first).toEqual(second);
    expect(first.clientMarkedUnknown).toContain("business.differentiation");
    expect(first.clientSelected["personality.attract"]).toEqual(["Warm"]);
    expect(first.clientRejected["personality.avoid"]).toEqual(["Corporate"]);
    expect(JSON.stringify(first.clientSelected)).not.toMatch(/"strength"/);
    expect(first.derivedSignals.every((signal) => signal.type === "derived_signal")).toBe(true);
    expect(first.derivedSignals.some((signal) => signal.source === "visual_comparisons")).toBe(true);
    expect(first.clientSaid["voice.preferredLanguage"]).toBe("We say it straight.");
  });
});

describe("derived signals", () => {
  it("averages a chosen visual board and ignores neither", () => {
    const preferences: VisualPreferences = {
      comparisons: [
        {
          comparisonId: "pair",
          order: 1,
          a: { id: "a", traits: scores({ editorial: 0.8, polished: 0.2 }) },
          b: { id: "b", traits: scores({ editorial: 0, raw: 1 }) },
          choice: { state: "selected", value: "a", capturedAt: "2020-01-01T00:00:00.000Z" },
        },
        {
          comparisonId: "skip",
          order: 2,
          a: { id: "a", traits: scores({ raw: 1 }) },
          b: { id: "b", traits: scores({ raw: 1 }) },
          choice: { state: "selected", value: "neither", capturedAt: "2020-01-01T00:00:00.000Z" },
        },
      ],
    };
    expect(deriveVisualSignal(preferences)?.editorial).toBe(0.8);
    expect(deriveVisualSignal(preferences)?.raw).toBe(0);
  });

  it("averages the chosen voice line and ignores none", () => {
    const preferences = {
      comparisons: [
        {
          roundId: "one",
          order: 1,
          situation: "Introducing the work",
          options: [
            { id: "formal", text: "Quite formal.", traits: voiceScores({ formal: 1, human: 0 }) },
            { id: "human", text: "Quite human.", traits: voiceScores({ formal: 0, human: 1 }) },
          ],
          choice: { state: "selected" as const, optionId: "human", capturedAt: "2020-01-01T00:00:00.000Z" },
        },
        {
          roundId: "two",
          order: 2,
          situation: "Inviting someone",
          options: [{ id: "push", text: "Buy now.", traits: voiceScores({ promotional: 1 }) }],
          choice: { state: "none" as const, capturedAt: "2020-01-01T00:00:00.000Z" },
        },
      ],
      preferredLanguage: { state: "unanswered" as const },
      avoidedLanguage: { state: "unanswered" as const },
    } satisfies VoicePreferences;
    expect(deriveVoiceSignal(preferences)?.human).toBe(1);
    expect(deriveVoiceSignal(preferences)?.promotional).toBe(0);
  });
});

describe("agent schema", () => {
  it("rejects a payload that is not the agreed object", () => {
    expect(parseAgentResponse(null)).toBeNull();
    expect(parseAgentResponse({ observations: [] })).toBeNull();
    expect(parseAgentResponse({ observations: "no", candidateQuestions: [] })).toBeNull();
  });

  it("drops an observation with no evidence and a choice question with one option", () => {
    const parsed = parseAgentResponse({
      observations: [
        observation("bare", []),
        observation("kept", ["business.name"]),
      ],
      candidateQuestions: [
        question("thin", "single_choice", ["kept"], [{ id: "only", label: "Only one" }]),
        question("ok", "free_text", ["kept"], []),
      ],
    });
    expect(parsed?.observations.map((item) => item.id)).toEqual(["kept"]);
    expect(parsed?.candidateQuestions.map((item) => item.id)).toEqual(["ok"]);
  });
});

describe("question selection", () => {
  it("caps at five, prefers four, and keeps the right to stay uncertain", () => {
    const evidence = buildDiscoveryEvidence(answeredSession());
    const observations = [observation("gap", ["business.name"], "missing_information", "high", "high")];
    const many = Array.from({ length: 8 }, (_, index) =>
      question(`q-${index}`, "single_choice", ["gap"], [
        { id: "a", label: "Approachable first" },
        { id: "b", label: "More refined first" },
      ], 1),
    );
    const selected = selectClarificationQuestions(many, observations, evidence);
    expect(selected.length).toBeLessThanOrEqual(5);
    expect(selected.length).toBe(5);
    expect(selected[0]?.options.at(-1)).toEqual({ id: MANAGER_HELP_ID, label: MANAGER_HELP_LABEL });
  });

  it("drops questions that are not grounded, already clear, or trivial", () => {
    const evidence = buildDiscoveryEvidence(answeredSession());
    const observations = [
      observation("clear", ["personality.attract"], "consistent_signal", "high", "medium"),
      observation("missing", ["not.a.real.path"], "missing_information", "high", "high"),
    ];
    const selected = selectClarificationQuestions(
      [
        question("why", "free_text", ["clear"], [], 1, "Why did you pick warm?"),
        question("orphan", "free_text", ["missing"], []),
      ],
      observations,
      evidence,
    );
    expect(selected).toEqual([]);
  });
});

const originalFetch = globalThis.fetch;

describe("provider boundary", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = originalFetch;
  });

  it("does not put the provider key in client source", () => {
    const client = readFileSync(new URL("../services/ai/client.ts", import.meta.url), "utf8");
    expect(client).not.toMatch(/OPENAI_API_KEY/);
    expect(client).not.toMatch(/api\.openai\.com/);
    expect(client).not.toMatch(/sk-/);
  });

  it("fails closed when the key is missing and when the model returns an unusable body", async () => {
    const evidence = buildDiscoveryEvidence(createSession("2020-01-01T00:00:00.000Z"));
    expect((await analyzeDiscovery(evidence)).ok).toBe(false);

    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = async () => new Response(JSON.stringify({ choices: [{ message: { content: "{" } }] }), { status: 200 });
    viFetch(fetchMock);
    const invalid = await analyzeDiscovery(evidence);
    expect(invalid).toEqual({ ok: false, error: "invalid_response" });
  });

  it("filters a valid structured response down to the question cap", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const evidence = buildDiscoveryEvidence(answeredSession());
    const model = {
      observations: [observation("gap", ["business.name"], "missing_information", "high", "high")],
      candidateQuestions: Array.from({ length: 6 }, (_, index) =>
        question(`q-${index}`, "free_text", ["gap"], [], 1, `What is still missing ${index}?`),
      ),
    };
    viFetch(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(model) } }] }), { status: 200 }),
    );
    const result = await analyzeDiscovery(evidence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.selected.length).toBeLessThanOrEqual(5);
      expect(result.analysisVersion).toBe("discovery-interviewer.v1");
      expect(result.provider).toBe("openai");
      expect(JSON.stringify(result)).not.toContain("test-key");
    }
  });
});

describe("prompt", () => {
  it("tells the interviewer not to define the brand", () => {
    expect(SYSTEM_PROMPT).toMatch(/do not define the client's brand/i);
    expect(SYSTEM_PROMPT).toMatch(/Never say "your brand is/);
    expect(SYSTEM_PROMPT).not.toMatch(/OPENAI_API_KEY/);
  });
});

function viFetch(impl: typeof fetch) {
  globalThis.fetch = impl;
}

function answeredSession(): DiscoverySession {
  const session = createSession("2020-01-01T00:00:00.000Z");
  session.business.name = { state: "evidence", evidence: { raw: "North Studio", capturedAt: session.createdAt } };
  session.business.differentiation = { state: "uncertain", reason: "not_sure", capturedAt: session.createdAt };
  session.personality.attract = { state: "selected", selected: ["warm"], custom: [], capturedAt: session.createdAt };
  session.personality.avoid = { state: "selected", selected: [], custom: ["Corporate"], capturedAt: session.createdAt };
  const first = session.visualPreferences.comparisons[0];
  if (first) first.choice = { state: "selected", value: "a", capturedAt: session.createdAt };
  session.voicePreferences.preferredLanguage = {
    state: "evidence",
    evidence: { raw: "We say it straight.", capturedAt: session.createdAt },
  };
  const voice = session.voicePreferences.comparisons[0];
  if (voice) voice.choice = { state: "selected", optionId: voice.options[0]?.id ?? "missing", capturedAt: session.createdAt };
  return session;
}

function observation(
  id: string,
  evidenceReferences: string[],
  observationType: AgentObservation["observationType"] = "missing_information",
  confidence: AgentObservation["confidence"] = "medium",
  importance: AgentObservation["importance"] = "medium",
): AgentObservation {
  return {
    id,
    category: "audience",
    statement: "Something is still open.",
    evidenceReferences,
    confidence,
    importance,
    observationType,
  };
}

function question(
  id: string,
  answerMode: CandidateQuestion["answerMode"],
  relatedObservationIds: string[],
  options: CandidateQuestion["options"],
  priority = 1,
  text = `Question ${id}?`,
): CandidateQuestion {
  return {
    id,
    question: text,
    reason: "It would change the handover.",
    targetEvidenceGap: "audience",
    relatedObservationIds,
    answerMode,
    options,
    priority,
  };
}

function scores(partial: Record<string, number>) {
  return {
    editorial: 0,
    organic: 0,
    minimal: 0,
    expressive: 0,
    playful: 0,
    technical: 0,
    warm: 0,
    cool: 0,
    polished: 0,
    raw: 0,
    bold: 0,
    restrained: 0,
    classic: 0,
    contemporary: 0,
    ...partial,
  };
}

function voiceScores(partial: Record<string, number>) {
  return {
    formal: 0,
    conversational: 0,
    reserved: 0,
    expressive: 0,
    technical: 0,
    simple: 0,
    confident: 0,
    humble: 0,
    polished: 0,
    human: 0,
    promotional: 0,
    understated: 0,
    ...partial,
  };
}
