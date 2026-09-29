import { describe, expect, it } from "vitest";
import { buildDiscoveryEvidence } from "./evidence";
import { validateDiscoveryLanguage } from "./languageContract";
import { MIN_QUESTION_SCORE, questionUsefulness } from "./qualityGate";
import { selectClarificationQuestions, traceQuestionSelection } from "./questionSelection";
import { createSession } from "../state/createSession";
import type { AgentObservation, CandidateQuestion, DiscoveryEvidence } from "../types/discovery";

describe("discovery language contract", () => {
  it("rejects brand facts, prescriptions, and directives", () => {
    expect(validateDiscoveryLanguage("Your brand is premium.").code).toBe("brand_truth_assertion");
    expect(validateDiscoveryLanguage("Your brand should feel sophisticated.").code).toBe("brand_truth_assertion");
    expect(validateDiscoveryLanguage("Your identity is editorial.").code).toBe("brand_truth_assertion");
    expect(validateDiscoveryLanguage("This means your brand is premium.").code).toBe("unsupported_certainty");
    expect(validateDiscoveryLanguage("You should use serif typography.").code).toBe("creative_prescription");
    expect(validateDiscoveryLanguage("You should sound more promotional.").code).toBe("creative_prescription");
    expect(validateDiscoveryLanguage("The correct direction is editorial.").code).toBe("creative_prescription");
    expect(validateDiscoveryLanguage("You need to pick a lane.").code).toBe("directive_language");
    expect(validateDiscoveryLanguage("You should hurry.").code).toBe("directive_language");
    expect(validateDiscoveryLanguage("The confidence score is high.").code).toBe("internal_scoring_language");
  });

  it("accepts evidence, pattern, and media-manager wording", () => {
    for (const text of [
      "You selected Warm, Human and Accessible.",
      "You've said approachability matters.",
      "You've consistently leaned toward more polished visual references.",
      "Several visual selections lean toward more polished references.",
      "There may be a tension between the approachability language and the more polished references.",
      "The desired audience is still broad.",
      "The client explicitly marked differentiation as uncertain.",
      "You may want your media manager to explore how polished this should feel.",
    ]) {
      expect(validateDiscoveryLanguage(text).outcome, text).toBe("accepted");
    }
  });
});

describe("question value", () => {
  it("keeps one question per observation and drops a weak follow-up", () => {
    const evidence: DiscoveryEvidence = {
      clientSaid: { "audience.bestCustomers": "Everyone, really.", "colour.existingHexes": "#112233" },
      clientSelected: { "goals.outcomes": ["Generate enquiries"], "colour.preferred": ["Quiet neutral"] },
      clientRejected: {},
      clientMarkedUnknown: ["business.differentiation"],
      derivedSignals: [],
    };
    const audience = obs("audience", ["audience.bestCustomers", "goals.outcomes"], "missing_information", "high");
    const colour = obs("colour", ["colour.preferred"], "possible_follow_up", "low");
    const questions = [
      q("audience-a", "Who is a good enquiry actually from?", [audience.id], "audience.bestCustomers"),
      q("audience-b", "Could you name one more kind of enquiry?", [audience.id], "audience.bestCustomers"),
      q("colour-q", "Can you describe the earth colours more precisely?", [colour.id], "colour.preferred"),
    ];
    const trace = traceQuestionSelection(questions, [audience, colour], evidence);
    expect(trace.selected.map((item) => item.id)).toEqual(["audience-a"]);
    expect(trace.decisions.find((item) => item.id === "audience-b")?.reason).toMatch(/already selected/);
    expect(trace.decisions.find((item) => item.id === "colour-q")?.score ?? 0).toBeLessThan(MIN_QUESTION_SCORE);
  });

  it("ranks an unclear audience above a minor aesthetic difference", () => {
    const audience = obs("audience", ["audience.bestCustomers", "goals.outcomes"], "missing_information", "high");
    const look = obs("look", ["visual.pair-02", "visual.pair-03"], "tension", "low");
    const audienceScore = questionUsefulness(
      q("who", "Who is a good enquiry actually from?", [audience.id], "audience.bestCustomers"),
      audience,
    );
    const lookScore = questionUsefulness(
      q("look", "When the playful reference and the polished reference compete, which is closer?", [look.id], "visual.pair-02"),
      look,
    );
    expect(audienceScore.topic).toBe("audience_gap");
    expect(lookScore.topic).toBe("aesthetic_difference");
    expect(audienceScore.score).toBeGreaterThan(lookScore.score);
    expect(lookScore.score).toBeLessThan(MIN_QUESTION_SCORE);
  });

  it("does not ask a client who already deferred uncertainty to confirm that", () => {
    const session = createSession("2026-01-15T10:00:00.000Z");
    session.business.differentiation = { state: "uncertain", reason: "not_sure", capturedAt: session.createdAt };
    const evidence = buildDiscoveryEvidence(session);
    const observation = obs("open", ["business.differentiation"], "explicit_uncertainty", "high");
    const selected = selectClarificationQuestions(
      [q("confirm", "Is that something you want to leave with your media manager?", [observation.id], "business.differentiation")],
      [observation],
      evidence,
    );
    expect(selected).toEqual([]);
  });
});

function obs(
  id: string,
  evidenceReferences: string[],
  observationType: AgentObservation["observationType"],
  importance: AgentObservation["importance"],
): AgentObservation {
  return {
    id,
    category: id,
    statement: "The evidence still leaves a useful distinction open.",
    evidenceReferences,
    confidence: "high",
    importance,
    observationType,
  };
}

function q(id: string, text: string, relatedObservationIds: string[], targetEvidenceGap: string): CandidateQuestion {
  return {
    id,
    question: text,
    reason: "It would change the handover.",
    targetEvidenceGap,
    relatedObservationIds,
    answerMode: "free_text",
    options: [],
    priority: 1,
  };
}
