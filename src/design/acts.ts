import type { SectionId } from "../types/discovery";

export interface ActLine {
  kicker: string;
  title: string;
  line: string;
}

/** Short pauses between chapters. Welcome and the ending are their own screens. */
export function actFor(section: SectionId): ActLine | null {
  switch (section) {
    case "goals":
      return {
        kicker: "A year from today",
        title: "What would have to be true?",
        line: "Not a plan. The result you would be willing to call success.",
      };
    case "reality":
      return {
        kicker: "The conditions",
        title: "What can actually happen.",
        line: "A channel you cannot feed is not a strategy.",
      };
    case "audience":
      return {
        kicker: "The people",
        title: "We know what you do.",
        line: "Now: who does it need to matter to?",
      };
    case "personality":
      return {
        kicker: "Character",
        title: "The work has a temperament.",
        line: "How should it feel, and what should it never become?",
      };
    case "colour":
      return {
        kicker: "The world",
        title: "Colour, type, pictures.",
        line: "This is where the business starts to look like itself.",
      };
    case "clarify":
      return {
        kicker: "Brief thinks",
        title: "A few things are still unresolved.",
        line: "Only the questions that would change the work.",
      };
    default:
      return null;
  }
}

const SEEN_KEY = "lover-lover.acts.v1";

export function actAlreadySeen(section: SectionId): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return (sessionStorage.getItem(SEEN_KEY) ?? "").split(",").includes(section);
}

export function markActSeen(section: SectionId): void {
  if (typeof sessionStorage === "undefined") return;
  const seen = new Set((sessionStorage.getItem(SEEN_KEY) ?? "").split(",").filter(Boolean));
  seen.add(section);
  sessionStorage.setItem(SEEN_KEY, [...seen].join(","));
}
