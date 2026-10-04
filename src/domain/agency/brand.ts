import { initialsMark } from "./theme";
import type { WorkspaceBrand } from "../../types/agency";
import type { BriefProject } from "../../types/project";
import type { KeyValueStore } from "./storage";

export const AGENCY_KEY = "lover-lover.agency-brands.v1";

export function demoAgencyBrand(now = "2026-10-02T09:00:00.000Z"): WorkspaceBrand {
  const colour = "#1F3A34";
  return {
    workspaceId: "jane-smith-marketing",
    name: "Jane Smith Marketing",
    website: "https://janesmith.example",
    contactName: "Jane Smith",
    contactDetails: "jane@janesmith.example",
    updatedAt: now,
    theme: {
      logo: initialsMark("Jane Smith Marketing", colour),
      mark: initialsMark("JSM", colour),
      colourPrimary: colour,
      colourAccent: "#A68456",
      colourBackground: "#F4F1EA",
      colourSurface: "#FBF9F4",
      colourText: "#1C1A17",
      colourMuted: "#5C564C",
      headingFont: "Fraunces",
      bodyFont: "Satoshi",
      radiusCharacter: "0px",
      welcomeLine: "A few questions, so the work starts from how you actually see the business.",
      optionalThemeMetadata: {},
    },
  };
}

export function loadBrands(store: KeyValueStore): Record<string, WorkspaceBrand> {
  try {
    const raw = store.getItem(AGENCY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, WorkspaceBrand>;
  } catch {
    return {};
  }
}

export function saveBrands(store: KeyValueStore, brands: Record<string, WorkspaceBrand>): void {
  store.setItem(AGENCY_KEY, JSON.stringify(brands));
}

export function brandForWorkspace(brands: Record<string, WorkspaceBrand>, workspaceId: string): WorkspaceBrand | null {
  return brands[workspaceId] ?? null;
}

export function brandForProject(brands: Record<string, WorkspaceBrand>, project: Pick<BriefProject, "workspaceId"> | null): WorkspaceBrand | null {
  if (!project) return null;
  return brandForWorkspace(brands, project.workspaceId);
}

export function ensureDemoBrand(brands: Record<string, WorkspaceBrand>, now?: string): Record<string, WorkspaceBrand> {
  if (brands["jane-smith-marketing"]) return brands;
  return { ...brands, "jane-smith-marketing": demoAgencyBrand(now) };
}
