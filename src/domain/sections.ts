import type { SectionId } from "../types/discovery";
import { MAX_CLARIFICATION_QUESTIONS } from "./questionSelection";
import { SPECTRUM_DIMENSIONS } from "./spectrum";
import { VISUAL_COMPARISON_PAIRS } from "./visualDirections";
import { VOICE_ROUNDS } from "./voice";

/**
 * Steps are internal to a route. They are never shown as "question N of M".
 *
 * welcome:      0 intro
 * business:     0 name, 1 description, 2 peopleComeFor, 3 differentiation
 * audience:     0 current, 1 desired
 * goals:        0 outcomes, 1 twelve-month marker, 2 adaptive follow-up
 * reality:      0 channels, 1 what works, 2 capability, 3 journey, 4 proof, 5 neighbours
 * personality:  0 attract, 1 avoid
 * spectrum:     0 intro, then one step per dimension
 * visual:       0 intro, then one step per comparison pair
 * colour:       0 preferred, 1 push, 2 avoided, 3 existing relationship, 4 existing colours
 * type:         0 worlds, 1 refinement, 2 avoided
 * imagery:      0 preferred, 1 avoided
 * voice:        0 intro, then one step per round, then preferred language, then avoided language
 * inspiration:  0 admired, 1 avoid
 * clarify:      0 transition, then one step per selected question (unused slots stay empty)
 * profile:      0 the client review
 * complete:     0 handover
 */
export const SECTIONS = [
  { id: "welcome", label: "Intro", path: "/demo/start", steps: 1 },
  { id: "business", label: "Business", path: "/demo/business", steps: 8 },
  { id: "audience", label: "Audience", path: "/demo/audience", steps: 5 },
  { id: "goals", label: "Goals", path: "/demo/goals", steps: 3 },
  { id: "reality", label: "Conditions", path: "/demo/reality", steps: 6 },
  { id: "personality", label: "Personality", path: "/demo/personality", steps: 2 },
  { id: "spectrum", label: "Spectrum", path: "/demo/spectrum", steps: 1 + SPECTRUM_DIMENSIONS.length },
  { id: "visual", label: "Visual", path: "/demo/visual", steps: 1 + VISUAL_COMPARISON_PAIRS.length },
  { id: "colour", label: "Colour", path: "/demo/colour", steps: 5 },
  { id: "type", label: "Type", path: "/demo/type", steps: 3 },
  { id: "imagery", label: "Imagery", path: "/demo/imagery", steps: 2 },
  { id: "voice", label: "Voice", path: "/demo/voice", steps: 1 + VOICE_ROUNDS.length + 2 },
  { id: "inspiration", label: "Inspiration", path: "/demo/inspiration", steps: 2 },
  { id: "clarify", label: "Clarify", path: "/demo/clarify", steps: 1 + MAX_CLARIFICATION_QUESTIONS + 1 },
  { id: "profile", label: "Profile", path: "/demo/profile", steps: 1 },
  { id: "complete", label: "Done", path: "/demo/complete", steps: 1 },
] as const satisfies ReadonlyArray<{
  id: SectionId;
  label: string;
  path: string;
  steps: number;
}>;

export function sectionIndex(section: SectionId): number {
  return SECTIONS.findIndex((item) => item.id === section);
}

export function sectionById(section: SectionId) {
  const found = SECTIONS.find((item) => item.id === section);
  if (!found) {
    throw new Error(`Unknown section: ${section}`);
  }
  return found;
}

export function pathFor(section: SectionId): string {
  return sectionById(section).path;
}

export function stepCount(section: SectionId): number {
  return sectionById(section).steps;
}

export function adjacentSection(section: SectionId, direction: -1 | 1): SectionId | null {
  const next = SECTIONS[sectionIndex(section) + direction];
  return next ? next.id : null;
}

export function laterSection(a: SectionId, b: SectionId): SectionId {
  return sectionIndex(a) >= sectionIndex(b) ? a : b;
}

export function sectionReached(furthest: SectionId, section: SectionId): boolean {
  return sectionIndex(section) <= sectionIndex(furthest);
}
