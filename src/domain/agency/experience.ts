import { actFor, type ActLine } from "../../design/acts";
import type { ClientExperience, WorkspaceBrand } from "../../types/agency";
import type { SectionId } from "../../types/discovery";

export const CHAPTER_IDS = ["business", "audience", "goals", "reality", "personality", "colour", "clarify"] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface ResolvedChapter {
  eyebrow: string;
  heading: string;
  supporting: string;
}

export interface Terms {
  client: string;
  brand: string;
  business: string;
  project: string;
}

export interface ResolvedExperience {
  openingEyebrow: string;
  openingHeading: string;
  openingSupport: string;
  openingButton: string;
  expectationEnabled: boolean;
  expectationHeading: string;
  expectationBody: string;
  chapters: Record<ChapterId, ResolvedChapter>;
  introEnabled: boolean;
  managerName: string;
  managerPhoto: string;
  introMessage: string;
  completionHeading: string;
  completionBody: string;
  completionNext: string;
  signature: string;
  helpEnabled: boolean;
  helpHeading: string;
  helpName: string;
  helpEmail: string;
  helpPhone: string;
  helpText: string;
  terms: Terms;
}

export const DEFAULT_OPENING_HEADING = "Let's understand your business.";
export const DEFAULT_OPENING_SUPPORT = "We'll ask a few questions about what you do, who matters, and where you're trying to go.";
export const DEFAULT_OPENING_BUTTON = "Begin";
export const DEFAULT_EXPECTATION_HEADING = "What happens next";
export const DEFAULT_EXPECTATION_BODY = "Take your time. There are no perfect answers. We're interested in how you see the business.";
export const DEFAULT_COMPLETION_HEADING = "Thanks — you're done.";

const DEFAULT_TERMS: Terms = {
  client: "client",
  brand: "brand",
  business: "business",
  project: "project",
};

export function defaultChapter(id: ChapterId): ResolvedChapter {
  if (id === "business") {
    return {
      eyebrow: "Business",
      heading: "First, the business.",
      supporting: "What do you actually do — and what do you want more of?",
    };
  }
  if (id === "audience") {
    return {
      eyebrow: "Audience",
      heading: "Now, the people.",
      supporting: "Who does this need to matter to?",
    };
  }
  const act = actFor(id);
  return {
    eyebrow: act?.kicker ?? id,
    heading: act?.title ?? id,
    supporting: act?.line ?? "",
  };
}

function substituteTerms(text: string, terms: Terms): string {
  return text.replace(/\b(client|brand|business|project)\b/gi, (match) => {
    const key = match.toLowerCase() as keyof Terms;
    const next = terms[key]?.trim();
    if (!next || next.toLowerCase() === key) return match;
    return match[0] === match[0]?.toUpperCase() ? next.charAt(0).toUpperCase() + next.slice(1) : next;
  });
}

function resolveLine(custom: string | undefined, fallback: string, terms: Terms): string {
  const trimmed = custom?.trim() ?? "";
  if (!trimmed || trimmed === fallback) return substituteTerms(fallback, terms);
  return trimmed;
}

function completionBody(name: string): string {
  const who = name.trim() || "your manager";
  return `Thanks — ${who} has everything they need for now.`;
}

export function defaultExperience(brand?: { name?: string; contactName?: string; theme?: { welcomeLine?: string } } | null): ResolvedExperience {
  const name = brand?.name?.trim() || "";
  const manager = brand?.contactName?.trim() || "";
  const support = brand?.theme?.welcomeLine?.trim() || DEFAULT_OPENING_SUPPORT;
  const chapters = Object.fromEntries(CHAPTER_IDS.map((id) => [id, defaultChapter(id)])) as Record<ChapterId, ResolvedChapter>;
  return {
    openingEyebrow: name,
    openingHeading: DEFAULT_OPENING_HEADING,
    openingSupport: support,
    openingButton: DEFAULT_OPENING_BUTTON,
    expectationEnabled: false,
    expectationHeading: DEFAULT_EXPECTATION_HEADING,
    expectationBody: DEFAULT_EXPECTATION_BODY,
    chapters,
    introEnabled: false,
    managerName: manager,
    managerPhoto: "",
    introMessage: "",
    completionHeading: DEFAULT_COMPLETION_HEADING,
    completionBody: completionBody(manager || name),
    completionNext: "",
    signature: "",
    helpEnabled: false,
    helpHeading: "Questions?",
    helpName: manager,
    helpEmail: "",
    helpPhone: "",
    helpText: "",
    terms: { ...DEFAULT_TERMS },
  };
}

export function resolveExperience(brand: Pick<WorkspaceBrand, "name" | "contactName" | "theme" | "experience"> | null): ResolvedExperience {
  const base = defaultExperience(brand);
  const custom: ClientExperience = brand?.experience ?? {};
  const terms: Terms = {
    client: custom.terms?.client?.trim() || DEFAULT_TERMS.client,
    brand: custom.terms?.brand?.trim() || DEFAULT_TERMS.brand,
    business: custom.terms?.business?.trim() || DEFAULT_TERMS.business,
    project: custom.terms?.project?.trim() || DEFAULT_TERMS.project,
  };
  const chapters = Object.fromEntries(CHAPTER_IDS.map((id) => {
    const fallback = base.chapters[id];
    const chapter = custom.chapters?.[id];
    return [id, {
      eyebrow: resolveLine(chapter?.eyebrow, fallback.eyebrow, terms),
      heading: resolveLine(chapter?.heading, fallback.heading, terms),
      supporting: resolveLine(chapter?.supporting, fallback.supporting, terms),
    }];
  })) as Record<ChapterId, ResolvedChapter>;
  return {
    openingEyebrow: resolveLine(custom.openingEyebrow, base.openingEyebrow, terms),
    openingHeading: resolveLine(custom.openingHeading, base.openingHeading, terms),
    openingSupport: resolveLine(custom.openingSupport, base.openingSupport, terms),
    openingButton: resolveLine(custom.openingButton, base.openingButton, terms),
    expectationEnabled: custom.expectationEnabled ?? false,
    expectationHeading: resolveLine(custom.expectationHeading, base.expectationHeading, terms),
    expectationBody: resolveLine(custom.expectationBody, base.expectationBody, terms),
    chapters,
    introEnabled: custom.introEnabled ?? false,
    managerName: custom.managerName?.trim() || base.managerName,
    managerPhoto: custom.managerPhoto?.trim() || "",
    introMessage: custom.introMessage?.trim() || "",
    completionHeading: resolveLine(custom.completionHeading, base.completionHeading, terms),
    completionBody: resolveLine(custom.completionBody, base.completionBody, terms),
    completionNext: custom.completionNext?.trim() || "",
    signature: custom.signature?.trim() || "",
    helpEnabled: custom.helpEnabled ?? false,
    helpHeading: resolveLine(custom.helpHeading, base.helpHeading, terms),
    helpName: custom.helpName?.trim() || base.helpName,
    helpEmail: custom.helpEmail?.trim() || "",
    helpPhone: custom.helpPhone?.trim() || "",
    helpText: custom.helpText?.trim() || "",
    terms,
  };
}

export function chapterAct(experience: ResolvedExperience, section: SectionId): ActLine | null {
  if (!CHAPTER_IDS.includes(section as ChapterId)) return actFor(section);
  const chapter = experience.chapters[section as ChapterId];
  if (!chapter.heading.trim()) return null;
  return { kicker: chapter.eyebrow, title: chapter.heading, line: chapter.supporting };
}

export function helpVisible(experience: ResolvedExperience): boolean {
  return experience.helpEnabled && Boolean(experience.helpEmail || experience.helpPhone || experience.helpText || experience.helpName);
}

/** What the live preview is showing. Same values the client route will use. */
export function previewExperience(brand: Pick<WorkspaceBrand, "name" | "contactName" | "theme" | "experience"> | null): ResolvedExperience {
  return resolveExperience(brand);
}
