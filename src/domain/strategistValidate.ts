import { textsContainFiller } from "./languageGuard";
import { imagePromptsForChapter } from "./creativeReading";
import { practiceFromText } from "./creativePractices";
import { typefaceById } from "./typefaceCatalogue";
import type { CreativePosture, CreativeReading, ReadingTerritory, TypePairing } from "../types/creativeReading";

const POSTURES: readonly CreativePosture[] = ["editorial", "raw", "precise", "expressive", "classic", "warm"];

const BANNED = [
  "modern yet timeless",
  "bold yet approachable",
  "premium experience",
  "meaningful connection",
  "stand out",
  "purpose-driven",
  "captivate",
  "your brand is",
  "the correct direction",
];

const MATRIX_NAMES = ["grounded editorial", "raw humanism", "precise structure", "warm precision", "playful signal", "quiet authority"];

export interface StrategistContext {
  name: string;
  description: string;
  archetypeIds: string[];
}

/** Accept a model reading only when it is specific, licensed, and tied to this business. */
export function validateStrategistPayload(raw: unknown, context: StrategistContext): CreativeReading | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const hypothesis = record.hypothesis;
  const territories = record.territories;
  const tomorrow = record.tomorrow;
  if (!hypothesis || typeof hypothesis !== "object" || !Array.isArray(territories) || territories.length < 2) return null;
  if (!tomorrow || typeof tomorrow !== "object") return null;

  const chapters: ReadingTerritory[] = [];
  for (const item of territories.slice(0, 3)) {
    const chapter = territoryFrom(item, context);
    if (!chapter) return null;
    chapters.push(chapter);
  }

  const reading: CreativeReading = {
    source: "strategist",
    hypothesis: {
      centralIdea: text(hypothesis, "centralIdea"),
      strategicOpportunity: text(hypothesis, "strategicOpportunity"),
      desiredFeeling: text(hypothesis, "desiredFeeling"),
      culturalTerritory: text(hypothesis, "culturalTerritory"),
      visualOpportunity: text(hypothesis, "visualOpportunity"),
      verbalOpportunity: text(hypothesis, "verbalOpportunity"),
      tensionsToUse: strings(hypothesis, "tensionsToUse"),
      conventionsToAvoid: strings(hypothesis, "conventionsToAvoid"),
      evidence: strings(hypothesis, "evidence"),
    },
    territories: chapters,
    tomorrow: {
      type: text(tomorrow, "type"),
      colour: text(tomorrow, "colour"),
      photography: strings(tomorrow, "photography"),
      design: strings(tomorrow, "design"),
      voice: strings(tomorrow, "voice"),
      avoid: strings(tomorrow, "avoid"),
      questions: strings(tomorrow, "questions").slice(0, 3),
    },
  };

  const blob = readingText(reading);
  if (!specificToBusiness(blob, context)) return null;
  if (textsContainFiller([blob]) || banned(blob)) return null;
  if (!reading.hypothesis.centralIdea || !reading.tomorrow.type) return null;
  return reading;
}

function territoryFrom(value: unknown, context: StrategistContext): ReadingTerritory | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const posture = record.posture;
  if (typeof posture !== "string" || !POSTURES.includes(posture as CreativePosture)) return null;
  const archetypeId = typeof record.archetypeId === "string" ? record.archetypeId : "";
  if (context.archetypeIds.length > 0 && !context.archetypeIds.includes(archetypeId)) return null;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const idea = typeof record.idea === "string" ? record.idea.trim() : "";
  const why = typeof record.whyThisBusiness === "string" ? record.whyThisBusiness.trim() : "";
  const risk = typeof record.risk === "string" ? record.risk.trim() : "";
  if (!name || !idea || !why || !risk) return null;
  if (MATRIX_NAMES.includes(name.toLowerCase())) return null;
  const pairings = pairingsFrom(record.pairings);
  if (pairings.length === 0) return null;
  const colours = coloursFrom(record.colour);
  if (!colours) return null;
  const voice = voiceFrom(record.voice);
  if (!voice) return null;
  const practice = practiceFromText(`${context.name} ${context.description}`, context.description);
  const shots = imagePromptsForChapter(context.name, context.description, practice, posture as CreativePosture, colours.colours);
  const chapter: ReadingTerritory = {
    archetypeId,
    posture: posture as CreativePosture,
    name,
    idea,
    whyThisBusiness: why,
    borrowedWorld: typeof record.borrowedWorld === "string" ? record.borrowedWorld : "",
    distinctive: typeof record.distinctive === "string" ? record.distinctive : "",
    feel: strings(record, "feel").slice(0, 5),
    pairings,
    colour: colours,
    imageNotes: strings(record, "imageNotes").slice(0, 6),
    layout: strings(record, "layout").slice(0, 6),
    graphicLanguage: strings(record, "graphicLanguage").slice(0, 6),
    voice,
    mustNotBecome: typeof record.mustNotBecome === "string" ? record.mustNotBecome : "",
    risk,
    references: referencesFrom(record.references),
    imagePrompts: shots.prompts,
    sharedArtDirection: shots.sharedArtDirection,
  };
  if (!chapter.borrowedWorld || !chapter.mustNotBecome || chapter.references.length < 2) return null;
  if (banned([name, idea, why, risk, voice.idea, ...voice.examples].join(" "))) return null;
  return chapter;
}

function pairingsFrom(value: unknown): TypePairing[] {
  if (!Array.isArray(value)) return [];
  const pairings: TypePairing[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const heading = typefaceById(typeof record.headingId === "string" ? record.headingId : "");
    const body = typefaceById(typeof record.bodyId === "string" ? record.bodyId : "");
    const reason = typeof record.reason === "string" ? record.reason.trim() : "";
    if (!heading || !body || reason.length < 40) continue;
    pairings.push({
      headingId: heading.id,
      heading: heading.name,
      headingFamily: heading.fontFamily,
      bodyId: body.id,
      body: body.name,
      bodyFamily: body.fontFamily,
      reason,
    });
  }
  return pairings.slice(0, 3);
}

function coloursFrom(value: unknown): ReadingTerritory["colour"] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.colours) || record.colours.length < 3) return null;
  const colours = [];
  for (const item of record.colours.slice(0, 5)) {
    if (!item || typeof item !== "object") return null;
    const colour = item as Record<string, unknown>;
    const hex = typeof colour.hex === "string" ? colour.hex.trim() : "";
    const name = typeof colour.name === "string" ? colour.name.trim() : "";
    if (!name || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
    colours.push({
      name,
      hex: hex.toUpperCase(),
      possibleRole: typeof colour.possibleRole === "string" ? colour.possibleRole : "Supporting",
    });
  }
  const why = typeof record.why === "string" ? record.why : "";
  if (!why) return null;
  return {
    name: typeof record.name === "string" ? record.name : "Working palette",
    colours,
    why,
    contrast: typeof record.contrast === "string" ? record.contrast : "",
    accent: typeof record.accent === "string" ? record.accent : "",
  };
}

function voiceFrom(value: unknown): ReadingTerritory["voice"] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const idea = typeof record.idea === "string" ? record.idea.trim() : "";
  const examples = strings(record, "examples");
  const behaviours = strings(record, "behaviours");
  if (!idea || examples.length < 3 || behaviours.length < 3) return null;
  return {
    idea,
    behaviours,
    wordsThatBelong: strings(record, "wordsThatBelong"),
    wordsThatDont: strings(record, "wordsThatDont"),
    examples: examples.slice(0, 5),
  };
}

function referencesFrom(value: unknown): ReadingTerritory["references"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const world = typeof record.world === "string" ? record.world.trim() : "";
      const take = typeof record.take === "string" ? record.take.trim() : "";
      if (!world || !take) return null;
      return { world, take };
    })
    .filter((item): item is { world: string; take: string } => !!item)
    .slice(0, 6);
}

function specificToBusiness(blob: string, context: StrategistContext): boolean {
  const value = blob.toLowerCase();
  if (context.name.trim().length > 2 && value.includes(context.name.trim().toLowerCase())) return true;
  const tokens = context.description
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  return tokens.some((token) => value.includes(token));
}

function readingText(reading: CreativeReading): string {
  return [
    reading.hypothesis.centralIdea,
    reading.hypothesis.strategicOpportunity,
    ...reading.territories.flatMap((territory) => [territory.name, territory.idea, territory.whyThisBusiness, territory.risk, ...territory.voice.examples]),
  ].join("\n");
}

function banned(value: string): boolean {
  const text = value.toLowerCase();
  return BANNED.some((phrase) => text.includes(phrase));
}

function text(record: object, key: string): string {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function strings(record: object, key: string): string[] {
  const value = (record as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}
