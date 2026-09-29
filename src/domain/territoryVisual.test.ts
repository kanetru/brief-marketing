import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TerritoryStage } from "../components/TerritoryStage";
import { geometricFixture, organicFixture } from "../fixtures/brandFixtures";
import { sessionReducer } from "../state/sessionReducer";
import { textsContainFiller } from "./languageGuard";
import { territoryPlainText } from "./creativeTerritories";
import { buildBrandIntelligence } from "./brandIntelligence";
import { differingAxes, visualForkIsClear } from "./territoryVisual";

function decode(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("territory visual specs", () => {
  it("renders organic and geometric choices as different boards", () => {
    const organic = buildBrandIntelligence(organicFixture());
    const geometric = buildBrandIntelligence(geometricFixture());

    expect(visualForkIsClear(organic.visualSpecs)).toBe(true);
    expect(visualForkIsClear(geometric.visualSpecs)).toBe(true);
    expect(differingAxes(organic.visualSpecs[0]!, geometric.visualSpecs.find((spec) => spec.compositionStyle === "grid") ?? geometric.visualSpecs[0]!).length).toBeGreaterThanOrEqual(3);

    expect(organic.visualSpecs.some((spec) => spec.compositionStyle === "editorial" || spec.compositionStyle === "raw")).toBe(true);
    expect(organic.visualSpecs.some((spec) => spec.imageTreatment === "documentary" || spec.imageTreatment === "raw")).toBe(true);
    expect(organic.visualSpecs.some((spec) => spec.temperature === "warm")).toBe(true);
    expect(organic.visualSpecs.some((spec) => spec.axes.typography === "serif" || spec.axes.typography === "display")).toBe(true);

    const grid = geometric.visualSpecs.find((spec) => spec.compositionStyle === "grid");
    expect(grid?.imageTreatment).toBe("precise");
    expect(grid?.axes.typography).toBe("sans");
    expect(grid?.temperature === "cool" || grid?.paletteId === "cool-structured" || grid?.spacingCharacter === "measured").toBe(true);

    for (const intelligence of [organic, geometric]) {
      expect(textsContainFiller(intelligence.territories.flatMap((territory) => territoryPlainText(territory)))).toBeNull();
      for (const territory of intelligence.territories) {
        expect(territory.generatedMoodboardAssets).toEqual([]);
        expect(territory.rationale).not.toMatch(/Selected personality|Visual board |Preferred palette:/);
        expect(territory.generatedImagePrompts).toHaveLength(4);
        const prompt = territory.generatedImagePrompts.join("\n");
        expect(prompt).toMatch(/North Workshop/i);
        expect(prompt).toMatch(/furniture/i);
        expect(prompt).toMatch(/Avoid /);
        expect(prompt).toMatch(/light/i);
        expect(prompt).not.toMatch(/brand moodboard/i);
      }
      for (const spec of intelligence.visualSpecs) {
        expect(spec.palette.some((role) => role.possibleRole === "Background")).toBe(true);
        expect(spec.palette.some((role) => role.possibleRole === "Primary type")).toBe(true);
        expect(spec.businessName).toBe("North Workshop");
        expect(spec.examplePhrase.length).toBeGreaterThan(0);
      }
    }
  });

  it("shows type, colour, and the business in the rendered board", () => {
    const intelligence = buildBrandIntelligence(organicFixture());
    const spec = intelligence.visualSpecs[0];
    const territory = intelligence.territories[0];
    if (!spec || !territory) throw new Error("missing territory");
    const html = decode(renderToStaticMarkup(createElement(TerritoryStage, { spec, index: 0, label: territory.name })));
    expect(html).toContain("North Workshop");
    expect(html).toContain(spec.examplePhrase);
    expect(html).toContain(spec.headingTypeface.name);
    expect(html).toContain(spec.headingTypeface.fontFamily);
    expect(html).toContain("Possible role");
    expect(html).toContain("Potential type direction");
    expect(html).toContain(`data-composition="${spec.compositionStyle}"`);
    expect(html).toContain(`data-treatment="${spec.imageTreatment}"`);
    expect(html).toContain("SIL Open Font License");
    const other = intelligence.visualSpecs[1];
    if (!other) throw new Error("missing second territory");
    const otherHtml = decode(renderToStaticMarkup(createElement(TerritoryStage, { spec: other, index: 1, label: intelligence.territories[1]?.name })));
    expect(otherHtml).toContain(`data-composition="${other.compositionStyle}"`);
    expect(other.compositionStyle).not.toBe(spec.compositionStyle);
  });

  it("keeps the pre-reaction model and records a neither preference", () => {
    const reacted = sessionReducer(organicFixture(), {
      type: "set-territory-reaction",
      territoryId: "grounded-editorial",
      response: "very_close",
      note: "The serif feels right",
    });
    const preferred = sessionReducer(reacted, { type: "set-territory-preference", preference: "neither" });
    const intelligence = buildBrandIntelligence(preferred);
    expect(intelligence.draftModel).not.toBe(intelligence.model);
    expect(intelligence.draftTerritories.length).toBeGreaterThan(0);
    expect(intelligence.workingBrief.headline).toMatch(/neither territory felt right/i);
    expect(intelligence.workingBrief.headline).not.toMatch(/^use /i);
    expect(intelligence.startingPoint.why.type.join(" ")).toMatch(/very close/i);
    expect(intelligence.startingPoint.typeToExplore.length).toBeGreaterThan(0);
    expect(intelligence.startingPoint.colourToExplore.length).toBeGreaterThan(0);
    expect(intelligence.startingPoint.stillOpen.join(" ")).toMatch(/missing|expressive|available/i);
  });
});
