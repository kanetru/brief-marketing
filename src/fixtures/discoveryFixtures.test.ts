import { describe, expect, it } from "vitest";
import { selectClarificationQuestions } from "../domain/questionSelection";
import { MANAGER_HELP_ID } from "../domain/questionSelection";
import { sessionReducer } from "../state/sessionReducer";
import { buildFixtureReport, citedPaths, discoveryFixtures, fixtureById } from "./discoveryFixtures";

describe("discovery fixtures", () => {
  it("builds every fixture through the evidence builder and the filter", () => {
    for (const fixture of discoveryFixtures) {
      const report = buildFixtureReport(fixture);
      expect(report.selectedQuestions).toEqual(
        selectClarificationQuestions(report.candidateQuestions, report.filteredObservations, {
          ...report.keyEvidence,
          derivedSignals: report.derivedSignals,
        }),
      );
    }
  });

  it("does not force questions on the clear client", () => {
    const report = buildFixtureReport(fixtureById("clear-consistent"));
    expect(report.selectedQuestions.length).toBeLessThanOrEqual(2);
    expect(report.selectedQuestions).toHaveLength(0);
    expect(report.decisions.find((item) => item.id === "clear-invented-q")?.reason).toMatch(/no related observation/);
    expect(report.decisions.find((item) => item.id === "clear-why-colour")?.reason).toMatch(/why a preference/);
    expect(report.filteredObservations.map((item) => item.id)).not.toContain("clear-invented");
  });

  it("ranks the vague audience ahead of the minor visual split", () => {
    const report = buildFixtureReport(fixtureById("unclear-audience"));
    const ids = report.selectedQuestions.map((item) => item.id);
    expect(ids[0]).toBe("audience-who");
    expect(ids.indexOf("audience-who")).toBeLessThan(ids.indexOf("audience-visual-q"));
    expect(ids).not.toContain("audience-why-colour");
  });

  it("keeps at most five questions when the model over-asks", () => {
    const report = buildFixtureReport(fixtureById("conflicting-marketing"));
    expect(report.candidateQuestions.length).toBeGreaterThan(5);
    expect(report.selectedQuestions).toHaveLength(5);
    expect(report.selectedQuestions.map((item) => item.id)).toContain("marketing-feel");
    expect(report.selectedQuestions.map((item) => item.id)).toContain("marketing-prescribe");
    expect(report.languageFlags.some((flag) => flag.includes("marketing-prescribe"))).toBe(true);
    const capped = report.decisions.filter((item) => item.reason.includes("maximum of 5"));
    expect(capped.length).toBeGreaterThan(0);
  });

  it("stores explicit uncertainty as unresolved", () => {
    const fixture = fixtureById("explicit-uncertainty");
    const question = fixture.modelResponse.candidateQuestions[0];
    if (!question) throw new Error("missing uncertainty question");
    const session = {
      ...fixture.session,
      agentQuestions: {
        status: "ready" as const,
        candidates: fixture.modelResponse.candidateQuestions,
        selected: [{ ...question, options: [...question.options, { id: MANAGER_HELP_ID, label: "help" }], response: { state: "unanswered" as const } }],
        generatedAt: null,
      },
    };
    const answered = sessionReducer(session, { type: "answer-clarification", questionId: question.id, optionId: MANAGER_HELP_ID });
    expect(answered.agentQuestions.selected[0]?.response).toMatchObject({ state: "uncertain", reason: "manager_help" });
    expect(answered.business.differentiation).toEqual({ state: "uncertain", reason: "not_sure", capturedAt: "2026-01-15T10:00:00.000Z" });
    expect(answered.audience.desiredCustomers.state).toBe("uncertain");
  });

  it("drops observations that cite nothing in the payload", () => {
    for (const fixture of discoveryFixtures) {
      const report = buildFixtureReport(fixture);
      const paths = new Set([
        ...Object.keys(report.keyEvidence.clientSaid),
        ...Object.keys(report.keyEvidence.clientSelected),
        ...Object.keys(report.keyEvidence.clientRejected),
        ...report.keyEvidence.clientMarkedUnknown,
        ...report.derivedSignals.map((signal) => `derived.${signal.source}.${signal.trait}`),
      ]);
      for (const observation of report.filteredObservations) {
        expect(observation.evidenceReferences.some((path) => paths.has(path))).toBe(true);
      }
    }
    const tension = buildFixtureReport(fixtureById("verbal-visual-tension"));
    expect(tension.rawObservations.map((item) => item.id)).toContain("tension-missing-path");
    expect(tension.filteredObservations.map((item) => item.id)).not.toContain("tension-missing-path");
  });

  it("only cites missing paths on purpose", () => {
    const missing = discoveryFixtures.flatMap((fixture) => citedPaths(fixture).missing);
    expect(missing.sort()).toEqual([
      "clear-invented:brand.essence",
      "tension-missing-path:visual.secret_board",
      "uncertainty-ghost:future.brand_platform",
    ]);
  });

  it("flags a brand-fact statement without removing it", () => {
    const report = buildFixtureReport(fixtureById("verbal-visual-tension"));
    expect(report.languageFlags.some((flag) => flag.includes("tension-brand-fact"))).toBe(true);
    expect(report.filteredObservations.map((item) => item.id)).toContain("tension-brand-fact");
    expect(report.selectedQuestions[0]?.question).not.toMatch(/your brand is/i);
    expect(report.selectedQuestions[0]?.options.some((option) => option.id === MANAGER_HELP_ID)).toBe(true);
  });
});
