import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { parseEntries } from "./multiEntry";
import { colourPreferenceProfile, nuanceBoards, paletteById } from "./palettes";
import { colourProfile } from "./colourProfile";
import { clientFacingCopy } from "./languageGuard";
import { isEditingTarget, shouldIgnoreNavigationKey } from "./editingKeys";
import { imageryProfile } from "./imagery";
import { typographyProfile } from "./typeWorlds";
import { buildBrandIntelligence } from "./brandIntelligence";
import { canAdvance } from "../state/guards";
import { createSession } from "../state/createSession";
import { sessionReducer } from "../state/sessionReducer";
import { createProject } from "../state/projectStore";
import { clientCardModel } from "./workspace/clientCard";
import { IntelligenceDesk } from "../screens/studio/IntelligenceDesk";
import { buildProjectIntelligence } from "./project/assemble";
import type { SelectedQuestion } from "../types/discovery";

const AT = "2026-10-05T12:00:00.000Z";

describe("onboarding experience", () => {
  it("splits natural lists without breaking spaces inside a name", () => {
    expect(parseEntries("FarmLab, AgriWebb, MaiaGrazing, Pasture.io")).toEqual(["FarmLab", "AgriWebb", "MaiaGrazing", "Pasture.io"]);
    expect(parseEntries("North & Sons\nLate Timber")).toEqual(["North & Sons", "Late Timber"]);
    expect(parseEntries("One; Two; One")).toEqual(["One", "Two"]);
    expect(parseEntries("   ")).toEqual([]);
  });

  it("keeps spaces while a clarify answer is being typed", () => {
    const session = createSession(AT);
    const question: SelectedQuestion = {
      id: "q1",
      question: "Say a bit more about the work.",
      reason: "The description is still thin.",
      targetEvidenceGap: "offer",
      relatedObservationIds: [],
      answerMode: "free_text",
      options: [],
      priority: 1,
      response: { state: "unanswered" },
    };
    session.agentQuestions.selected = [question];
    const withSpace = sessionReducer(session, { type: "answer-clarification", questionId: "q1", text: "soil test " });
    const stored = withSpace.agentQuestions.selected[0]?.response;
    expect(stored?.state).toBe("evidence");
    if (stored?.state === "evidence") expect(stored.text).toBe("soil test ");
    const withWord = sessionReducer(withSpace, { type: "answer-clarification", questionId: "q1", text: "soil test results" });
    const next = withWord.agentQuestions.selected[0]?.response;
    if (next?.state === "evidence") expect(next.text).toBe("soil test results");
  });

  it("does not require a name, a price, or a personality adjective to move", () => {
    const session = createSession(AT);
    session.business.description = { state: "evidence", evidence: { raw: "We read soil for small farms.", capturedAt: AT } };
    expect(canAdvance(session, "business", 0)).toBe(true);
    expect(canAdvance(session, "business", 1)).toBe(true);
    expect(canAdvance(session, "personality", 0)).toBe(true);
    expect(canAdvance(session, "personality", 1)).toBe(true);
  });

  it("builds preference profiles from visual choices", () => {
    const type = typographyProfile({ worldIds: ["editorial-serif"], refinementIds: ["fraunces"], avoidedDirectionIds: [] });
    expect(type.summary).toMatch(/Editorial serif/);
    expect(type.summary).toMatch(/Not a chosen font/);
    const colour = colourPreferenceProfile(["warm-earth"], ["warmer"]);
    expect(colour.summary).toMatch(/Not a finished palette/);
    const imagery = imageryProfile({
      preferredDirectionIds: ["documentary"],
      interestIds: ["editorial"],
      avoidedDirectionIds: ["polished"],
      closerStillIds: [],
      closerInterestIds: [],
      closerRejectedIds: [],
      preferredCapturedAt: AT,
      avoidedCapturedAt: null,
    });
    expect(imagery.loved).toContain("Documentary");
    expect(imagery.summary).toMatch(/Documentary/);
  });

  it("shows a completed client as ready, with mentioned names, and a market next step that does not call a provider", () => {
    const discovery = createSession(AT);
    discovery.business.name = { state: "evidence", evidence: { raw: "Field Signal", capturedAt: AT } };
    discovery.business.description = { state: "evidence", evidence: { raw: "Soil history for farms.", capturedAt: AT } };
    discovery.strategyInputs.neighbours = { state: "evidence", evidence: { raw: "FarmLab, AgriWebb", capturedAt: AT } };
    const project = createProject({
      clientName: "Field Signal",
      businessName: "Field Signal",
      category: "Agriculture",
      discovery,
      discoveryStatus: "submitted",
      now: AT,
    });
    const card = clientCardModel(project, new Date(AT));
    expect(card.competitors).toMatch(/named/);
    expect(card.updated).toBe("Updated today");
    const intelligence = buildProjectIntelligence(project);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <IntelligenceDesk project={project} intelligence={intelligence} onReact={() => undefined} onFindCompetitors={() => undefined} />
      </MemoryRouter>,
    );
    expect(html).toContain("Discovery complete.");
    expect(html).toContain("Find competitors");
    expect(html).not.toContain("ensembledata");
    expect(html).not.toContain("Provide Mark");
    const reading = buildBrandIntelligence(discovery).reading.hypothesis.evidence.join(" ");
    expect(reading).toContain("Soil history for farms.");
  });

  it("pushes colour as pictures and keeps a fine type cut", () => {
    const base = paletteById("warm-earth");
    expect(base).toBeTruthy();
    const boards = nuanceBoards(base!);
    expect(boards.map((board) => board.id)).toContain("warmer");
    expect(boards[0]?.swatches.join(",")).not.toBe(base?.swatches.join(","));
    const session = sessionReducer(createSession(AT), { type: "set-colour-nuance", nuanceId: "warmer", reaction: "love" });
    const again = sessionReducer(session, { type: "set-colour-nuance", nuanceId: "softer", reaction: "interesting" });
    expect(again.colourPreferences.nuanceIds).toEqual(["love:warmer", "interesting:softer"]);
    const profile = colourProfile(again.colourPreferences);
    expect(profile.warmth).toBe("warm");
    expect(profile.softness).toBe("soft");
    const leaning = colourPreferenceProfile(["warm-earth"], again.colourPreferences.nuanceIds);
    expect(leaning.summary).toMatch(/Not a finished palette/);
    expect(leaning.summary).toMatch(/Warmer/);
    const typed = sessionReducer(again, { type: "toggle-type-refinement", faceId: "fine-quieter" });
    const type = typographyProfile(typed.typographyPreferences);
    expect(type.closer).toContain("Quieter");
  });

  it("keeps internal strategist language off the client screen", () => {
    const leaked = "The Provide Mark: treat We provide soil history the way community newspapers would, so that the line is visible in the work itself.";
    expect(clientFacingCopy(leaked)).toBe("What they wrote is kept as they wrote it.");
    expect(clientFacingCopy("The work, explained by the person doing it.")).toMatch(/person doing it/);
  });

  it("leaves space and arrows to the field while someone is typing", () => {
    const field = { nodeName: "TEXTAREA" } as unknown as EventTarget;
    expect(isEditingTarget(field)).toBe(true);
    expect(shouldIgnoreNavigationKey({ key: " ", target: field })).toBe(true);
    expect(shouldIgnoreNavigationKey({ key: "ArrowRight", target: field })).toBe(true);
    const button = { nodeName: "BUTTON" } as unknown as EventTarget;
    expect(shouldIgnoreNavigationKey({ key: " ", target: button })).toBe(false);
    const nested = { nodeName: "SPAN", closest: () => ({}) } as unknown as EventTarget;
    expect(isEditingTarget(nested)).toBe(true);
  });
});
