import { describe, expect, it } from "vitest";
import { evidencePaths, buildDiscoveryEvidence } from "./evidence";
import { buildBrandIntelligence } from "./brandIntelligence";
import { buildBrandSignalModel } from "./brandSignals";
import { territoryPlainText } from "./creativeTerritories";
import { textsContainFiller } from "./languageGuard";
import { CREATIVE_FORK_ID, withCreativeFork } from "./creativeFork";
import { SIGNAL_WEIGHTS } from "./signalWeights";
import { TYPEFACE_CATALOGUE, typefaceById } from "./typefaceCatalogue";
import { syncAdaptiveComparisons } from "./visualDirections";
import {
  chooseVisual,
  formalVoiceFixture,
  geometricFixture,
  humanVoiceFixture,
  organicFixture,
  studioSession,
  territorySignature,
  voiceSignature,
} from "../fixtures/brandFixtures";
import { createSession } from "../state/createSession";
import { sessionReducer } from "../state/sessionReducer";
import type { CandidateQuestion } from "../types/discovery";

const AT = "2026-01-15T10:00:00.000Z";

describe("brand signal model", () => {
  it("weights an explicit rejection more heavily than an explicit desire", () => {
    expect(SIGNAL_WEIGHTS.explicitRejection).toBeGreaterThan(SIGNAL_WEIGHTS.explicitDesired);
    const desired = createSession(AT);
    desired.personality.attract = { state: "selected", selected: ["warm"], custom: [], capturedAt: AT };
    desired.personality.avoid = { state: "selected", selected: ["premium"], custom: [], capturedAt: AT };
    const model = buildBrandSignalModel(desired, { includeReaction: false });
    expect(Math.abs(model.nets.premium ?? 0)).toBeGreaterThan(model.nets.warm ?? 0);
    expect(model.hardAvoids.some((item) => item.dimension === "premium")).toBe(true);
  });

  it("reinforces a dimension when several modalities agree, beyond repeated visual clicks", () => {
    const visualOnly = createSession(AT);
    chooseVisual(visualOnly, ["organic", "raw", "warm"]);
    const cross = studioSession("cross");
    chooseVisual(cross, ["organic", "raw", "warm"]);
    const visualNet = buildBrandSignalModel(visualOnly, { includeReaction: false }).nets.organic ?? 0;
    const crossModel = buildBrandSignalModel(cross, { includeReaction: false });
    expect(crossModel.nets.organic ?? 0).toBeGreaterThan(visualNet);
    expect(crossModel.reinforcement.some((item) => item.dimension === "organic" && item.modalities.length >= 2)).toBe(true);
  });

  it("does not let a creative territory recommend a hard-avoided type direction", () => {
    const session = organicFixture();
    session.imageryPreferences.avoidedDirectionIds = ["polished"];
    session.typographyPreferences.avoidedDirectionIds = ["bold_grotesk", "expressive_display"];
    const intelligence = buildBrandIntelligence(session);
    for (const territory of intelligence.territories) {
      for (const candidate of territory.typeDirection.candidates) {
        const entry = typefaceById(candidate.id);
        expect(entry).toBeTruthy();
        expect(entry?.directions.some((direction) => session.typographyPreferences.avoidedDirectionIds.includes(direction))).toBe(false);
      }
      expect(territory.imageryDirection.avoid.join(" ").toLowerCase()).toMatch(/polished/);
      expect(textsContainFiller(territoryPlainText(territory))).toBeNull();
    }
  });

  it("changes colour territory and type shortlist when the evidence changes", () => {
    const warm = organicFixture();
    warm.colourPreferences.preferredPaletteIds = ["warm-earth"];
    warm.typographyPreferences.preferredDirectionIds = ["editorial_serif"];
    const cool = geometricFixture();
    cool.colourPreferences.preferredPaletteIds = ["cool-structured"];
    cool.colourPreferences.avoidedPaletteIds = ["warm-earth", "sun-washed"];
    cool.typographyPreferences.preferredDirectionIds = ["clean_sans"];
    cool.typographyPreferences.avoidedDirectionIds = ["editorial_serif", "classic_serif"];
    const warmIntel = buildBrandIntelligence(warm);
    const coolIntel = buildBrandIntelligence(cool);
    expect(warmIntel.territories[0]?.colourDirection.name).not.toBe(coolIntel.territories[0]?.colourDirection.name);
    const warmFaces = warmIntel.territories.flatMap((territory) => territory.typeDirection.candidates.map((candidate) => candidate.id));
    const coolFaces = coolIntel.territories.flatMap((territory) => territory.typeDirection.candidates.map((candidate) => candidate.id));
    expect(warmFaces.join(",")).not.toBe(coolFaces.join(","));
    for (const id of [...warmFaces, ...coolFaces]) {
      expect(TYPEFACE_CATALOGUE.some((entry) => entry.id === id)).toBe(true);
    }
  });

  it("keeps evidence references on real paths", () => {
    const session = organicFixture();
    const paths = evidencePaths(buildDiscoveryEvidence(session));
    const intelligence = buildBrandIntelligence(session);
    for (const territory of intelligence.territories) {
      for (const note of territory.supportingEvidence) {
        expect(paths.has(note.source) || note.source.startsWith("clarification.")).toBe(true);
      }
      for (const source of territory.colourDirection.evidenceSources) {
        expect(paths.has(source)).toBe(true);
      }
    }
  });

  it("returns distinct fallback territories without filler", () => {
    const intelligence = buildBrandIntelligence(createSession(AT));
    expect(intelligence.territories.length).toBeGreaterThanOrEqual(2);
    expect(intelligence.territories.length).toBeLessThanOrEqual(3);
    expect(new Set(intelligence.territories.map((territory) => territory.name)).size).toBe(intelligence.territories.length);
    expect(textsContainFiller(intelligence.territories.flatMap((territory) => territoryPlainText(territory)))).toBeNull();
    expect(intelligence.territories[0]?.generatedMoodboardAssets).toEqual([]);
  });
});

describe("counterfactual creative output", () => {
  it("materially changes territories when only the visual choices change", () => {
    const organic = buildBrandIntelligence(organicFixture());
    const geometric = buildBrandIntelligence(geometricFixture());
    expect(territorySignature(organic)).not.toBe(territorySignature(geometric));
    expect(organic.territories.map((territory) => territory.name).join("|")).not.toBe(
      geometric.territories.map((territory) => territory.name).join("|"),
    );
  });

  it("materially changes the verbal territory when only the voice choices change", () => {
    const human = buildBrandIntelligence(humanVoiceFixture());
    const formal = buildBrandIntelligence(formalVoiceFixture());
    expect(voiceSignature(human)).not.toBe(voiceSignature(formal));
    expect(human.territories[0]?.voiceDirection.cluster).not.toBe(formal.territories[0]?.voiceDirection.cluster);
  });
});

describe("adaptive visual discovery", () => {
  it("retargets later comparisons once a lean is clear", () => {
    const organic = createSession(AT);
    chooseVisual(organic, ["organic", "raw", "warm"]);
    for (const comparison of organic.visualPreferences.comparisons) {
      if (comparison.comparisonId === "pair-09" || comparison.comparisonId === "pair-10") {
        comparison.choice = { state: "unanswered" };
      }
    }
    const organicPlan = syncAdaptiveComparisons(organic.visualPreferences.comparisons);
    expect(organicPlan.find((item) => item.comparisonId === "pair-09")?.a.id).toBe("quiet-craft");
    expect(organicPlan.find((item) => item.comparisonId === "pair-10")?.a.id).toBe("warm-editorial");

    const geometric = createSession(AT);
    chooseVisual(geometric, ["technical", "minimal", "polished", "cool"]);
    for (const comparison of geometric.visualPreferences.comparisons) {
      if (comparison.comparisonId === "pair-09" || comparison.comparisonId === "pair-10") {
        comparison.choice = { state: "unanswered" };
      }
    }
    const geometricPlan = syncAdaptiveComparisons(geometric.visualPreferences.comparisons);
    expect(geometricPlan.find((item) => item.comparisonId === "pair-09")?.a.id).toBe("quiet-grid");
    expect(geometricPlan.find((item) => item.comparisonId === "pair-10")?.a.id).toBe("art-directed");
  });
});

describe("creative fork clarification", () => {
  it("adds at most one fork question", () => {
    const session = organicFixture();
    session.typographyPreferences.preferredDirectionIds = ["classic_serif", "bold_grotesk"];
    session.colourPreferences.preferredPaletteIds = ["warm-earth", "cool-structured"];
    const blank: CandidateQuestion[] = [];
    const once = withCreativeFork(blank, session);
    const twice = withCreativeFork(once, session);
    const forks = twice.filter((question) => question.id === CREATIVE_FORK_ID);
    expect(forks.length).toBeLessThanOrEqual(1);
    expect(twice.filter((question) => question.id === CREATIVE_FORK_ID)).toEqual(
      once.filter((question) => question.id === CREATIVE_FORK_ID),
    );
    const padded = Array.from({ length: 5 }, (_, index) => ({
      id: `q-${index}`,
      question: "Which is closer?",
      reason: "A real gap.",
      targetEvidenceGap: "audience.bestCustomers",
      relatedObservationIds: [],
      answerMode: "free_text" as const,
      options: [],
      priority: index + 1,
    }));
    expect(withCreativeFork(padded, session).length).toBeLessThanOrEqual(6);
  });
});

describe("territory reaction", () => {
  it("stores a reaction without rewriting earlier answers", () => {
    const start = organicFixture();
    const name = start.business.name;
    const next = sessionReducer(start, {
      type: "set-territory-reaction",
      territoryId: "grounded-editorial",
      response: "very_close",
      note: "The warmth",
    });
    expect(next.territoryFeedback.reactions).toEqual([
      { territoryId: "grounded-editorial", response: "very_close", note: "The warmth" },
    ]);
    expect(next.business.name).toEqual(name);
    const preferred = sessionReducer(next, { type: "set-territory-preference", preference: "grounded-editorial" });
    expect(preferred.territoryFeedback.preference).toBe("grounded-editorial");
    const intelligence = buildBrandIntelligence(preferred);
    expect(intelligence.workingBrief.headline).toMatch(/received the strongest response/i);
    expect(intelligence.workingBrief.headline).not.toMatch(/^use /i);
  });
});
