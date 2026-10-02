import { describe, expect, it } from "vitest";
import { loverAsset } from "./brandAssets";

describe("lover lover assets", () => {
  it("points chrome at the supplied svg lockups", () => {
    expect(loverAsset("secondary", "pearl")).toContain("LOVER-SECONDARY-LOGO-PEARL.svg");
    expect(loverAsset("secondary", "choc")).toContain("LOVER-SECONDARY-LOGO-CHOC.svg");
    expect(loverAsset("icon", "orange")).toContain("LOVER-ICON-ORANGE.svg");
    expect(loverAsset("primary", "choc")).toContain("Logo%20Suite/SVG/");
  });

  it("falls back when a colourway has no svg", () => {
    expect(loverAsset("secondary", "white")).toContain("LOVER-SECONDARY-LOGO-PEARL.svg");
    expect(loverAsset("icon", "white")).toContain("LOVER-ICON-PEARL.svg");
  });
});
