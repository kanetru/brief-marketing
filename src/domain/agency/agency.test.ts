import { describe, expect, it } from "vitest";
import { POWERED_BY, appliedFont, contrastRatio, correctTheme, initialsMark } from "./theme";
import { brandForProject, brandForWorkspace, demoAgencyBrand, ensureDemoBrand, loadBrands, saveBrands } from "./brand";
import { createLocalBrandAssetStorage, type KeyValueStore } from "./storage";
import { createProject } from "../../state/projectStore";

function memory(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("agency branding", () => {
  it("stores a workspace theme and resolves the discovery workspace", () => {
    const store = memory();
    const jane = demoAgencyBrand();
    const other = { ...demoAgencyBrand(), workspaceId: "other-studio", name: "Other Studio" };
    saveBrands(store, { [jane.workspaceId]: jane, [other.workspaceId]: other });
    const loaded = loadBrands(store);
    expect(brandForWorkspace(loaded, jane.workspaceId)?.name).toBe("Jane Smith Marketing");
    expect(brandForWorkspace(loaded, other.workspaceId)?.name).toBe("Other Studio");
    const project = createProject({ clientName: "North", businessName: "North Workshop" });
    expect(project.workspaceId).toBe(jane.workspaceId);
    expect(brandForProject(loaded, project)?.name).toBe("Jane Smith Marketing");
    expect(brandForProject(loaded, { workspaceId: "other-studio" })?.name).not.toBe("Jane Smith Marketing");
    expect(ensureDemoBrand({})["jane-smith-marketing"]?.name).toBe("Jane Smith Marketing");
  });

  it("corrects unreadable colours, falls back without a logo, and keeps the attribution", () => {
    const corrected = correctTheme({
      ...demoAgencyBrand().theme,
      colourBackground: "#ffffff",
      colourText: "#f7f7f7",
      headingFont: "Comic Sans",
    });
    expect(contrastRatio(corrected.colourText, corrected.colourBackground)).toBeGreaterThanOrEqual(4.5);
    expect(appliedFont("Comic Sans")).toContain("Satoshi");
    expect(corrected.headingFont).toContain("Satoshi");
    const blank = { ...demoAgencyBrand(), theme: { ...demoAgencyBrand().theme, logo: "", mark: "" } };
    expect(blank.theme.logo).toBe("");
    expect(initialsMark(blank.name, blank.theme.colourPrimary)).toContain("data:image/svg+xml");
    expect(POWERED_BY).toBe("Powered by Brief by Lover Lover");
    const assets = createLocalBrandAssetStorage(memory());
    const stored = assets.put({
      id: "logo-1",
      workspaceId: "jane-smith-marketing",
      kind: "logo",
      url: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
      createdAt: "2026-10-02T00:00:00.000Z",
    });
    expect(assets.get(stored.id)?.workspaceId).toBe("jane-smith-marketing");
    expect(assets.list("other-studio")).toHaveLength(0);
  });
});
