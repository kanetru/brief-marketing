import { describe, expect, it } from "vitest";
import { validateDiscoveryLanguage } from "../domain/languageContract";
import { profileFixture } from "./profileFixtures";

describe("profile fixtures", () => {
  it("keeps the clear client concise and does not invent a tension", () => {
    const report = profileFixture("clear-consistent");
    const content = report.version.content;
    expect(content.mixedSignals).toEqual([]);
    expect(content.discussionPoints).toEqual([]);
    expect(content.unresolvedQuestions).toEqual([]);
    expect(content.strongSignals.length).toBeGreaterThan(0);
    expect(content.strongSignals.some((item) => /premium/i.test(item.statement))).toBe(false);
    expect(report.version.rejectedStatements.some((item) => item.code === "brand_truth_assertion")).toBe(true);
    expect(JSON.stringify(content)).not.toMatch(/your brand is/i);
  });

  it("shows the approachability tension without calling the brand premium", () => {
    const report = profileFixture("verbal-visual-tension");
    const content = report.version.content;
    expect(content.mixedSignals.map((item) => item.id)).toEqual(["tension-polish"]);
    expect(content.mixedSignals[0]?.status).toBe("tension");
    expect(content.discussionPoints.map((item) => item.id)).toEqual(["tension-discuss"]);
    expect(JSON.stringify(content)).not.toMatch(/your brand is premium/i);
    expect(report.version.rejectedStatements.some((item) => item.statement === "Your brand is premium.")).toBe(true);
    expect(content.hardAvoids.some((item) => item.label === "Colour")).toBe(true);
  });

  it("keeps the unclear audience in front of a minor visual split", () => {
    const report = profileFixture("unclear-audience");
    const content = report.version.content;
    expect(content.audienceSummary.summary).toMatch(/everyone/i);
    expect(content.mixedSignals).toEqual([]);
    expect(content.discussionPoints.map((item) => item.prompt).join(" ")).toMatch(/good enquiry/i);
    expect(report.version.rejectedStatements.some((item) => item.code === "weak_tension")).toBe(true);
  });

  it("preserves explicit uncertainty and manager help", () => {
    const report = profileFixture("explicit-uncertainty");
    const open = report.version.content.unresolvedQuestions.map((item) => item.statement).join(" ");
    expect(open).toMatch(/not sure/i);
    expect(open).toMatch(/media manager/i);
    expect(report.version.content.discussionPoints).toEqual([]);
    expect(open).not.toMatch(/\bresolved\b/i);
  });

  it("keeps the marketing tension as a discussion and drops the prescription", () => {
    const report = profileFixture("conflicting-marketing");
    const prompts = report.version.content.discussionPoints.map((item) => item.prompt);
    expect(prompts).toEqual(["How should that commercial intent feel alongside the understated language they chose?"]);
    expect(report.version.rejectedStatements.some((item) => item.code === "creative_prescription")).toBe(true);
    expect(prompts.join(" ")).not.toMatch(/more promotional/i);
    expect(report.version.content.mixedSignals[0]?.status).toBe("tension");
  });

  it("builds a usable fallback when there is no model payload", () => {
    const report = profileFixture("clear-consistent");
    expect(report.fallback.usedFallback).toBe(true);
    expect(report.fallback.content.businessSummary.summary).toMatch(/June Table/);
    expect(report.fallback.content.discussionPoints).toEqual([]);
    for (const text of collectedCopy(report.fallback.content)) {
      expect(validateDiscoveryLanguage(text).outcome, text).toBe("accepted");
    }
  });
});

function collectedCopy(content: ReturnType<typeof profileFixture>["fallback"]["content"]): string[] {
  return [
    content.businessSummary.summary,
    content.audienceSummary.summary,
    content.marketingGoals.summary,
    content.personalitySummary.summary,
    content.visualPreferences.summary,
    content.voicePreferences.summary,
    ...content.strongSignals.map((item) => item.statement),
    ...content.mixedSignals.map((item) => item.statement),
    ...content.unresolvedQuestions.map((item) => item.statement),
    ...content.discussionPoints.map((item) => item.prompt),
  ].filter((text) => text.trim().length > 0);
}
