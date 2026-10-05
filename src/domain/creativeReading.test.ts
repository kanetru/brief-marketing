import { describe, expect, it } from "vitest";
import { organicFixture, chooseVisual, chooseVoice } from "../fixtures/brandFixtures";
import { createSession } from "../state/createSession";
import { buildBrandIntelligence } from "./brandIntelligence";
import { catalogueCategories, TYPEFACE_CATALOGUE } from "./typefaceCatalogue";
import { textsContainFiller } from "./languageGuard";
import { validateStrategistPayload } from "./strategistValidate";
import type { DiscoverySession } from "../types/discovery";

const AT = "2026-01-15T10:00:00.000Z";

function said(raw: string) {
  return { state: "evidence" as const, evidence: { raw, capturedAt: AT } };
}

function styledBusiness(name: string, description: string, audience: string, goal: string): DiscoverySession {
  const session = createSession(AT);
  session.business.name = said(name);
  session.business.description = said(description);
  session.business.peopleComeFor = said("People come because the work is specific.");
  session.business.differentiation = said("They stay close to the material and the person using it.");
  session.audience.bestCustomers = said(audience);
  session.audience.desiredCustomers = { state: "same_as_current", capturedAt: AT };
  session.goals.outcomes = { state: "selected", selected: ["build_trust"], capturedAt: AT };
  session.goals.twelveMonthSuccess = said(goal);
  session.personality.attract = { state: "selected", selected: ["natural", "human", "calm"], custom: [], capturedAt: AT };
  session.personality.avoid = { state: "selected", selected: ["premium"], custom: [], capturedAt: AT };
  chooseVisual(session, ["organic", "raw", "warm"]);
  chooseVoice(session, (traits) => traits.human + traits.conversational + traits.understated);
  session.colourPreferences.preferredPaletteIds = ["warm-earth", "soft-editorial"];
  session.typographyPreferences.preferredDirectionIds = ["editorial_serif"];
  session.imageryPreferences.preferredDirectionIds = ["documentary", "editorial"];
  session.voicePreferences.preferredLanguage = said("plain and specific");
  return session;
}

function readingText(session: DiscoverySession): string {
  const reading = buildBrandIntelligence(session).reading;
  return [
    reading.hypothesis.centralIdea,
    reading.hypothesis.strategicOpportunity,
    ...reading.territories.flatMap((chapter) => [chapter.name, chapter.idea, chapter.whyThisBusiness, chapter.risk, ...chapter.voice.examples, chapter.imagePrompts.map((item) => item.prompt).join(" ")]),
  ].join("\n");
}

describe("creative reading", () => {
  it("changes the territory when the business changes and the style choices stay the same", () => {
    const ceramic = styledBusiness(
      "Kiln & Co",
      "A ceramic studio making tableware on a small wheel.",
      "People who want a bowl they will actually eat from.",
      "Enough orders to keep the kiln firing without a shop voice.",
    );
    const architecture = styledBusiness(
      "North Room",
      "A small architecture practice drawing houses for households.",
      "Households deciding how a room will actually be used.",
      "A year of site visits without sounding like a developer.",
    );
    const clay = buildBrandIntelligence(ceramic).reading;
    const rooms = buildBrandIntelligence(architecture).reading;
    expect(clay.source).toBe("fallback");
    expect(rooms.source).toBe("fallback");
    expect(clay.hypothesis.centralIdea).not.toBe(rooms.hypothesis.centralIdea);
    expect(clay.territories[0]?.name).not.toBe(rooms.territories[0]?.name);
    expect(clay.territories[0]?.voice.examples.join(" ")).not.toBe(rooms.territories[0]?.voice.examples.join(" "));
    expect(clay.territories[0]?.references.map((item) => item.world).join()).not.toBe(rooms.territories[0]?.references.map((item) => item.world).join());
    expect(clay.territories[0]?.colour.colours.map((colour) => colour.hex).join()).not.toBe(rooms.territories[0]?.colour.colours.map((colour) => colour.hex).join());
    expect(readingText(ceramic)).toMatch(/clay|kiln|ceramic|tableware|bowl/i);
    expect(readingText(architecture)).toMatch(/plan|drawing|site|room|house/i);
    expect(textsContainFiller([readingText(ceramic), readingText(architecture)])).toBeNull();
    expect(clay.territories[0]?.pairings[0]?.reason.length).toBeGreaterThan(40);
    expect(clay.territories[0]?.risk.length).toBeGreaterThan(20);
    expect(clay.tomorrow.photography.length).toBeGreaterThanOrEqual(4);
    const prompts = clay.territories[0]?.imagePrompts ?? [];
    expect(new Set(prompts.map((item) => item.role)).size).toBe(4);
    expect(prompts.map((item) => item.prompt).join("\n")).toMatch(/AVOID/);
    expect(prompts[0]?.prompt).not.toBe(prompts[1]?.prompt);
  });

  it("keeps two similar studios apart by the actual description", () => {
    const one = styledBusiness("East Kiln", "A ceramic studio making soup bowls for weeknight tables.", "Households.", "Stay small.");
    const two = styledBusiness("West Kiln", "A ceramic studio making large serving platters for restaurants.", "Restaurant kitchens.", "A second wheel.");
    const first = buildBrandIntelligence(one).reading.territories[0]?.idea ?? "";
    const second = buildBrandIntelligence(two).reading.territories[0]?.idea ?? "";
    expect(first).not.toBe(second);
    expect(first).toMatch(/bowl/i);
    expect(second).toMatch(/platter|restaurant/i);
  });

  it("does not rename the deterministic territories", () => {
    const intelligence = buildBrandIntelligence(organicFixture());
    expect(intelligence.territories.map((territory) => territory.name).join(" ")).toMatch(/Grounded Editorial|Raw Humanism|Precise Structure/);
    expect(intelligence.reading.territories[0]?.name).not.toBe(intelligence.territories[0]?.name);
    expect(intelligence.reading.hypothesis.centralIdea).toMatch(/joint|timber|workshop/i);
    expect(intelligence.territories[0]?.generatedMoodboardAssets).toEqual([]);
  });

  it("holds a broad, licensed type catalogue", () => {
    expect(TYPEFACE_CATALOGUE.length).toBeGreaterThanOrEqual(80);
    expect(TYPEFACE_CATALOGUE.length).toBeLessThanOrEqual(120);
    expect(new Set(TYPEFACE_CATALOGUE.map((entry) => entry.id)).size).toBe(TYPEFACE_CATALOGUE.length);
    expect(TYPEFACE_CATALOGUE.every((entry) => entry.license.includes("Open Font"))).toBe(true);
    const voices = catalogueCategories();
    expect(voices["old-style"]).toBeGreaterThan(3);
    expect(voices.slab).toBeGreaterThan(2);
    expect(voices.monospace).toBeGreaterThan(2);
    expect(voices.geometric).toBeGreaterThan(2);
  });

  it("rejects generic strategist copy and accepts a specific one", () => {
    const context = { name: "Kiln & Co", description: "A ceramic studio making tableware.", archetypeIds: ["grounded-editorial", "raw-humanism"] };
    expect(validateStrategistPayload({ hypothesis: { centralIdea: "modern yet timeless" } }, context)).toBeNull();
    const good = validateStrategistPayload(
      {
        hypothesis: {
          centralIdea: "Useful bowls, written about like a workshop note.",
          strategicOpportunity: "Kiln & Co can show the clay instead of a styled table.",
          desiredFeeling: "close and exact",
          culturalTerritory: "studio pottery diaries",
          visualOpportunity: "Borrow the scale of the hand from Japanese tableware photography.",
          verbalOpportunity: "Speak from the wheel.",
          tensionsToUse: ["clay versus gift shop"],
          conventionsToAvoid: ["rustic lifestyle"],
          evidence: ["A ceramic studio making tableware."],
        },
        territories: [chapter("grounded-editorial", "editorial", "The Kiln Journal"), chapter("raw-humanism", "raw", "Wet Clay")],
        tomorrow: {
          type: "Fraunces + IBM Plex Sans",
          colour: "Bone, kiln black, clay.",
          photography: ["The wheel", "The rim", "The kiln", "The bowl in a hand"],
          design: ["Captions outside the frame"],
          voice: ["Start with the bowl"],
          avoid: ["Gift-shop rustic"],
          questions: ["How much of the firing should stay visible?"],
        },
      },
      context,
    );
    expect(good?.source).toBe("strategist");
    expect(good?.territories[0]?.imagePrompts).toHaveLength(4);
    expect(good?.territories[0]?.pairings[0]?.heading).toBe("Fraunces");
  });

  it("does not turn a long description into a branded instruction", () => {
    const session = styledBusiness(
      "Field Signal",
      "We provide the most careful soil reading to small farms for a low cost through a membership. They can look back across a season and change how they work the way a local paper would explain a town.",
      "Farmers who already keep records.",
      "A year of useful history.",
    );
    const reading = buildBrandIntelligence(session).reading;
    const blob = readingText(session);
    expect(blob.toLowerCase()).not.toContain("provide mark");
    expect(blob.toLowerCase()).not.toContain("visible in the work itself");
    expect(blob.toLowerCase()).not.toMatch(/\btreat\b[\s\S]{0,160}\bthe way\b/);
    expect(reading.hypothesis.evidence[0]).toMatch(/soil reading/);
    expect(reading.territories[0]?.idea).not.toMatch(/Th…/);
  });
});

function chapter(archetypeId: string, posture: string, name: string) {
  return {
    archetypeId,
    posture,
    name,
    idea: `For Kiln & Co, ${name} keeps the clay in the sentence.`,
    whyThisBusiness: "Kiln & Co makes tableware, and the bowl is the point.",
    borrowedWorld: "Studio pottery diaries",
    distinctive: "The firing stays visible.",
    feel: ["close", "exact"],
    pairings: [{ headingId: "fraunces", bodyId: "ibm-plex-sans", reason: "Fraunces carries the editorial warmth Kiln & Co responded to; IBM Plex Sans keeps the clay notes practical." }],
    colour: {
      name: "Kiln",
      colours: [
        { name: "Bone", hex: "#F3E6D8", possibleRole: "Background" },
        { name: "Kiln black", hex: "#241C19", possibleRole: "Primary type" },
        { name: "Clay", hex: "#8C4A32", possibleRole: "Accent" },
      ],
      why: "Bone, ink and clay keep the tableware from turning into a gift shop.",
      contrast: "Ink on bone.",
      accent: "Clay, once.",
    },
    imageNotes: ["The wheel", "The rim"],
    layout: ["Captions outside the frame"],
    graphicLanguage: ["Number the firings"],
    voice: {
      idea: "Speak like the person at the wheel.",
      behaviours: ["Start with the bowl", "Name the clay", "Skip the claim"],
      wordsThatBelong: ["clay", "kiln", "bowl"],
      wordsThatDont: ["premium", "elevate"],
      examples: ["The bowl is for soup.", "The rim is uneven.", "We fire in small batches."],
    },
    mustNotBecome: "a rustic gift shop",
    risk: "This drifts into rustic lifestyle branding if the photographs become styled tables.",
    references: [
      { world: "Studio pottery diaries", take: "Keep the firing note." },
      { world: "Workshop catalogues", take: "Show the sequence." },
      { world: "Japanese tableware photography", take: "Hand scale." },
    ],
  };
}
