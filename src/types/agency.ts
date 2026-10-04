export interface AgencyTheme {
  logo: string;
  mark: string;
  colourPrimary: string;
  colourAccent: string;
  colourBackground: string;
  colourSurface: string;
  colourText: string;
  colourMuted: string;
  headingFont: string;
  bodyFont: string;
  radiusCharacter: string;
  welcomeLine: string;
  optionalThemeMetadata: Record<string, string>;
}

export interface WorkspaceBrand {
  workspaceId: string;
  name: string;
  website: string;
  contactName: string;
  contactDetails: string;
  theme: AgencyTheme;
  updatedAt: string;
}

export interface StoredBrandAsset {
  id: string;
  workspaceId: string;
  kind: "logo" | "mark";
  url: string;
  createdAt: string;
}
