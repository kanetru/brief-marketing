import { describe, expect, it } from "vitest";
import { createSession } from "../state/createSession";
import { compileProfile } from "./compileProfile";
import { buildDiscoveryEvidence } from "./evidence";
import type { ProfileStatement } from "../types/discovery";

describe("profile language gate", () => {
  it("rejects brand facts and prescriptions and keeps a neutral reading", () => {
    const session = createSession("2026-01-15T10:00:00.000Z");
    session.business.name = { state: "evidence", evidence: { raw: "North Studio", capturedAt: session.createdAt } };
    session.business.description = {
      state: "evidence",
      evidence: { raw: "A small practice making furniture for homes.", capturedAt: session.createdAt },
    };
    session.colourPreferences.preferredPaletteIds = ["quiet-neutral"];
    const evidence = buildDiscoveryEvidence(session);
    const version = compileProfile({
      evidence,
      observations: [],
      clarifications: [],
      model: {
        ...emptyModel(),
        businessSummary: {
          summary: "North Studio is a small practice making furniture for homes.",
          statements: [statement("ok", "They described a small practice making furniture for homes.", ["business.description"], "direct")],
        },
        strongSignals: [
          statement("bad-brand", "Your brand is premium.", ["colour.preferred"], "strong_pattern"),
          statement("bad-voice", "You should sound more promotional.", ["business.description"], "strong_pattern"),
          statement("good", "They preferred a quiet neutral palette.", ["colour.preferred"], "direct"),
        ],
      },
      meta: {
        generatedAt: session.createdAt,
        version: 1,
        source: "model",
        promptVersion: "discovery-profile.v1",
        provider: "mock",
        modelName: "fixture",
        feedback: null,
        failureCode: null,
      },
    });

    const strong = version.content.strongSignals.map((item) => item.statement);
    expect(strong).toEqual(["They preferred a quiet neutral palette."]);
    expect(version.rejectedStatements.map((item) => item.code)).toEqual(["brand_truth_assertion", "creative_prescription"]);
    expect(version.content.businessSummary.summary).toMatch(/North Studio/);
    expect(version.usedFallback).toBe(false);
  });

  it("does not treat manager help as a problem that has been solved", () => {
    const session = createSession("2026-01-15T10:00:00.000Z");
    session.business.differentiation = { state: "uncertain", reason: "not_sure", capturedAt: session.createdAt };
    const evidence = buildDiscoveryEvidence(session);
    const version = compileProfile({
      evidence,
      observations: [],
      clarifications: [
        {
          id: "help",
          question: "How polished should this feel?",
          response: "manager_help",
          detail: null,
        },
      ],
      model: emptyModel(),
      meta: {
        generatedAt: session.createdAt,
        version: 1,
        source: "model",
        promptVersion: "discovery-profile.v1",
        provider: "mock",
        modelName: "fixture",
        feedback: null,
        failureCode: null,
      },
    });
    const open = version.content.unresolvedQuestions.map((item) => item.statement).join(" ");
    expect(open).toMatch(/not sure/i);
    expect(open).toMatch(/media manager/i);
    expect(version.content.discussionPoints).toEqual([]);
  });
});

function emptyModel() {
  const section = { summary: "", statements: [] as ProfileStatement[] };
  return {
    businessSummary: section,
    audienceSummary: section,
    marketingGoals: section,
    personalitySummary: section,
    visualPreferences: section,
    colourPreferences: section,
    typographyPreferences: section,
    imageryPreferences: section,
    voicePreferences: section,
    inspirationSummary: section,
    strongSignals: [] as ProfileStatement[],
    mixedSignals: [] as ProfileStatement[],
    unresolvedQuestions: [] as ProfileStatement[],
    discussionPoints: [],
  };
}

function statement(id: string, text: string, evidenceReferences: string[], status: ProfileStatement["status"]): ProfileStatement {
  return { id, type: status, statement: text, evidenceReferences, confidence: "high", status };
}
