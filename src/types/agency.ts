export type ButtonTreatment = "solid" | "outline";

export interface AgencyTheme {
  logo: string;
  /** Used on dark surfaces when the primary logo would disappear. */
  logoDark?: string;
  mark: string;
  colourPrimary: string;
  colourAccent: string;
  /** Decorative only. Never used as body text. */
  colourExtra?: string;
  colourBackground: string;
  colourSurface: string;
  colourText: string;
  colourMuted: string;
  headingFont: string;
  bodyFont: string;
  radiusCharacter: string;
  welcomeLine: string;
  buttonStyle?: ButtonTreatment;
  optionalThemeMetadata: Record<string, string>;
}

export interface ChapterCopy {
  eyebrow?: string;
  heading?: string;
  supporting?: string;
}

/** Optional client-facing copy. Missing fields keep the Brief defaults. */
export interface ClientExperience {
  openingEyebrow?: string;
  openingHeading?: string;
  openingSupport?: string;
  openingButton?: string;
  expectationEnabled?: boolean;
  expectationHeading?: string;
  expectationBody?: string;
  chapters?: Partial<Record<string, ChapterCopy>>;
  introEnabled?: boolean;
  managerName?: string;
  managerPhoto?: string;
  introMessage?: string;
  completionHeading?: string;
  completionBody?: string;
  completionNext?: string;
  signature?: string;
  helpEnabled?: boolean;
  helpHeading?: string;
  helpName?: string;
  helpEmail?: string;
  helpPhone?: string;
  helpText?: string;
  terms?: Partial<Record<"client" | "brand" | "business" | "project", string>>;
}

export interface WorkspaceBrand {
  workspaceId: string;
  name: string;
  website: string;
  contactName: string;
  contactDetails: string;
  theme: AgencyTheme;
  experience?: ClientExperience;
  updatedAt: string;
}

export interface StoredBrandAsset {
  id: string;
  workspaceId: string;
  kind: "logo" | "logoDark" | "mark";
  url: string;
  createdAt: string;
}
