import { pairingsFor } from "./typePairings";
import { practiceFromText, stablePick, type PracticeProfile } from "./creativePractices";
import { textValue } from "../state/textEvidence";
import type { CreativeTerritory } from "../types/brandIntelligence";
import type {
  BrandHypothesis,
  ColourPush,
  CreativePosture,
  CreativeReading,
  ReadingColour,
  ReadingImagePrompt,
  ReadingTerritory,
  TomorrowBrief,
} from "../types/creativeReading";
import type { DiscoverySession } from "../types/discovery";

const POSTURE: Record<string, CreativePosture> = {
  "grounded-editorial": "editorial",
  "raw-humanism": "raw",
  "precise-structure": "precise",
  "warm-precision": "warm",
  "playful-signal": "expressive",
  "quiet-authority": "classic",
};

const LAYOUT: Record<CreativePosture, string[]> = {
  editorial: [
    "Captions sit outside the image frame.",
    "One oversized headline, with a tiny technical annotation beside it.",
    "Rules and numbering, the way a journal contents page works.",
    "Portrait photographs, cropped hard.",
  ],
  raw: [
    "Leave the photograph's edge rough.",
    "Let type meet the image once, not on every element.",
    "Paper grain is allowed.",
    "No pill-shaped buttons or soft interface chrome.",
  ],
  precise: [
    "A measured grid, with a column kept for annotation.",
    "Hairline rules rather than boxes.",
    "One accent colour, used the way a site mark is used.",
    "Avoid lifestyle-stock compositions.",
  ],
  expressive: [
    "One element is allowed to be too big.",
    "Everything else stays plain so the loud part has a job.",
    "Crop so the subject fills the frame.",
    "No decorative patterns behind the type.",
  ],
  classic: [
    "Generous margins and a clear hierarchy.",
    "Small caps or a plain label for sections, not a badge.",
    "Photographs sit in a frame, captioned underneath.",
    "Avoid trend surfaces and gradient meshes.",
  ],
  warm: [
    "Type can be close to the picture, but the picture stays documentary.",
    "Use the accent once on a page.",
    "Prefer the working environment over a styled result.",
    "No stock smiles and no soft-focus warmth.",
  ],
};

const FEEL: Record<CreativePosture, string[]> = {
  editorial: ["paper", "specific", "quietly confident"],
  raw: ["close", "unfinished", "honest about the work"],
  precise: ["exact", "annotated", "calm"],
  expressive: ["direct", "physical", "one loud note"],
  classic: ["settled", "literate", "unhurried"],
  warm: ["near", "useful", "unfussy"],
};

export function strategistEvidenceHash(session: DiscoverySession): string {
  const payload = JSON.stringify({
    name: textValue(session.business.name),
    description: textValue(session.business.description),
    comeFor: textValue(session.business.peopleComeFor),
    difference: session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "",
    audience: textValue(session.audience.bestCustomers),
    goals: textValue(session.goals.twelveMonthSuccess),
    attract: session.personality.attract.selected,
    avoid: session.personality.avoid.selected,
    visual: session.visualPreferences.comparisons.map((item) => (item.choice.state === "selected" ? item.choice.value : item.choice.state)),
    colour: session.colourPreferences.preferredPaletteIds,
    push: session.colourPreferences.colourPush ?? null,
    type: session.typographyPreferences.preferredDirectionIds,
    worlds: session.typographyPreferences.worldIds,
    refine: session.typographyPreferences.refinementIds,
    imagery: session.imageryPreferences.preferredDirectionIds,
    voice: session.voicePreferences.comparisons.map((item) => (item.choice.state === "selected" ? item.choice.optionId : item.choice.state)),
  });
  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) hash = (hash * 33 + payload.charCodeAt(index)) | 0;
  return `reading-${(hash >>> 0).toString(16)}`;
}

export function buildCreativeReading(session: DiscoverySession, territories: CreativeTerritory[]): CreativeReading {
  const description = textValue(session.business.description);
  const name = textValue(session.business.name).trim() || "This business";
  const blob = [
    name,
    description,
    textValue(session.business.peopleComeFor),
    session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "",
    textValue(session.audience.bestCustomers),
    textValue(session.goals.twelveMonthSuccess),
  ].join(" ");
  const practice = practiceFromText(blob, description || name);
  const temperature = colourTemperature(session);
  const chapters = (territories.length > 0 ? territories : [{ id: "grounded-editorial" }]).slice(0, 3).map((territory) =>
    chapter(session, practice, name, description, postureFor(territory.id), territory.id, temperature),
  );
  const lead = chapters[0];
  return {
    source: "fallback",
    hypothesis: hypothesis(practice, name, description, session, lead),
    territories: chapters,
    tomorrow: lead ? tomorrow(lead, practice) : emptyTomorrow(),
  };
}

export function imagePromptsForChapter(
  name: string,
  description: string,
  practice: PracticeProfile,
  posture: CreativePosture,
  colours: ReadingColour[],
): { prompts: ReadingImagePrompt[]; sharedArtDirection: string } {
  const colourNames = colours.map((colour) => colour.name).join(", ");
  const noted = notedWork(description);
  const sharedArtDirection = `One art-directed set for ${name}: ${practice.place}, subject is ${practice.material}, palette leaning ${colourNames}. The same light runs through every frame. ${noted ? `They said: ${noted}.` : ""} Do not become ${practice.cliche}.`;
  const roles: ReadingImagePrompt["role"][] = ["hero", "detail", "context", "texture"];
  return {
    sharedArtDirection,
    prompts: roles.map((role) => ({
      role,
      prompt: promptFor(role, name, practice.activity, practice, posture, colourNames, sharedArtDirection),
    })),
  };
}

function chapter(
  session: DiscoverySession,
  practice: PracticeProfile,
  name: string,
  description: string,
  posture: CreativePosture,
  archetypeId: string,
  temperature: "warm" | "cool",
): ReadingTerritory {
  const noted = notedWork(description);
  const territoryName = stablePick(practice.names[posture], `${name}:${archetypeId}`);
  const reference = practice.references[postureIndex(posture) % practice.references.length] ?? practice.references[0];
  const colours = pushed(practice.palettes[temperature], session.colourPreferences.colourPush ?? null);
  const pairings = pairingsFor(posture, practice, session.typographyPreferences.refinementIds);
  const shots = imagePromptsForChapter(name, description, practice, posture, colours);
  const borrowed = reference?.world ?? "Independent publishing";
  return {
    archetypeId,
    posture,
    name: territoryName,
    idea: [
      territoryName,
      practice.activity,
      noted ? `They put it this way: ${noted}` : "What they wrote is kept as they wrote it.",
      `The manners come from ${borrowed.toLowerCase()}, not from a category costume.`,
    ].join(". "),
    whyThisBusiness: `${name}. The customer is ${practice.customer}. ${practice.voiceIdea}`,
    borrowedWorld: borrowed,
    distinctive: `The ${practice.tokens[0]} stays in the frame. It refuses ${practice.cliche}.`,
    feel: FEEL[posture],
    pairings,
    colour: {
      name: `${practice.material} — ${temperature === "cool" ? "cooler" : "warmer"} cut`,
      colours,
      why: paletteWhy(practice, temperature, session.colourPreferences.colourPush ?? null),
      contrast: "Ink against a paper ground, so the work reads before any accent does.",
      accent: `The accent is a working mark — ${colours.find((colour) => colour.possibleRole === "Accent")?.name ?? "one strong colour"} — used once, not as a theme.`,
    },
    imageNotes: [
      `Show ${practice.activity} at ${practice.place}.`,
      `The ${practice.material} is the subject, not a backdrop.`,
      `Include ${practice.maker} only when the work needs a scale.`,
      "Same light and same crop logic across the set.",
      `Keep away from ${practice.cliche}.`,
    ],
    layout: LAYOUT[posture],
    graphicLanguage: [
      `Borrow the manners of ${borrowed.toLowerCase()}, not its branding.`,
      reference?.take ?? "Name the specific thing.",
      "Number things when there is a sequence.",
      "One accent, used sparingly.",
    ],
    voice: {
      idea: practice.voiceIdea,
      behaviours: [
        `Start with the ${practice.tokens[0]}.`,
        "Use concrete nouns.",
        "Explain before persuading.",
        "Short sentences when making a point.",
        "An occasional dry aside is welcome.",
        "No inflated claims.",
      ],
      wordsThatBelong: practice.nouns.slice(0, 6),
      wordsThatDont: ["premium", "solutions", "journey", "transform", "elevate"],
      examples: practice.lines.slice(0, 4),
    },
    mustNotBecome: practice.cliche,
    risk: practice.risks[posture],
    references: practice.references.slice(0, 4),
    imagePrompts: shots.prompts,
    sharedArtDirection: shots.sharedArtDirection,
  };
}

function hypothesis(
  practice: PracticeProfile,
  name: string,
  description: string,
  session: DiscoverySession,
  lead: ReadingTerritory | undefined,
): BrandHypothesis {
  const comeFor = textValue(session.business.peopleComeFor);
  const original = description.replace(/\s+/g, " ").trim();
  return {
    centralIdea: centralIdea(practice),
    strategicOpportunity: `The usual picture is ${practice.cliche}. ${name} has more room in ${practice.references[0]?.world.toLowerCase() ?? "a neighbouring practice"} than in that costume.`,
    desiredFeeling: lead ? lead.feel.join(", ") : "specific and useful",
    culturalTerritory: practice.references.map((item) => item.world).slice(0, 3).join(", "),
    visualOpportunity: `Borrow from ${practice.references[0]?.world.toLowerCase() ?? "publishing"} : ${practice.references[0]?.take ?? "show the work."}`,
    verbalOpportunity: practice.voiceIdea,
    tensionsToUse: [`${practice.material} versus ${practice.cliche}`, "clarity versus costume"],
    conventionsToAvoid: [practice.cliche, "language that could describe a hundred other businesses"],
    evidence: [original, comeFor, textValue(session.audience.bestCustomers)].filter((line) => line.trim().length > 0).slice(0, 4),
  };
}

function centralIdea(practice: PracticeProfile): string {
  switch (practice.id) {
    case "ceramic":
      return "Useful vessels, written about with the attention of a journal rather than a gift shop.";
    case "architecture":
      return "Serious expertise without institutional polish.";
    case "furniture":
      return "The joint, explained, rather than the room, styled.";
    case "food":
      return "The plate, named, rather than the room, mood-lit.";
    default:
      return "The work, explained by the person doing it.";
  }
}

function tomorrow(lead: ReadingTerritory, practice: PracticeProfile): TomorrowBrief {
  const first = lead.pairings[0];
  const second = lead.pairings[1];
  return {
    type: [first, second].filter(Boolean).map((pairing) => `${pairing?.heading} + ${pairing?.body}`).join("; ") || "Set one headline face and one practical text face.",
    colour: `${lead.colour.name}. ${lead.colour.why}`,
    photography: lead.imageNotes.slice(0, 5),
    design: lead.layout.slice(0, 4),
    voice: [lead.voice.idea, ...lead.voice.behaviours.slice(0, 3)],
    avoid: [lead.mustNotBecome, lead.risk],
    questions: [
      `How much of ${practice.place} should a stranger see before they see the finished result?`,
      lead.posture === "editorial" ? "How expressive should the headline serif become before it turns nostalgic?" : "How much warmth can the structure take before it loses its point?",
    ],
  };
}

function promptFor(
  role: ReadingImagePrompt["role"],
  name: string,
  clause: string,
  practice: PracticeProfile,
  posture: CreativePosture,
  colourNames: string,
  shared: string,
): string {
  const shot = {
    hero: `the main ${practice.material} in use or just finished, seen as a whole`,
    detail: `a close crop of ${practice.tokens[0]} — surface, edge, or joint — filling the frame`,
    context: `${practice.maker} at ${practice.place}, occupied with the work, not looking at the camera`,
    texture: `the environment itself: tools, surface, light on ${practice.material}, with no hero object centred`,
  }[role];
  const camera = {
    hero: "medium distance, subject large, horizon simple",
    detail: "macro, shallow plane, edge-to-edge material",
    context: "documentary distance, person small enough that the place still reads",
    texture: "tight, almost abstract, no face",
  }[role];
  const polish = posture === "raw" ? "unretouched, slight grain" : posture === "precise" ? "clear and controlled, not glossy" : "printed-matter restraint";
  return [
    `SUBJECT: ${shot}.`,
    `SETTING: ${practice.place}, for ${name}.`,
    `ACTION: ${practice.activity}.`,
    "LIGHT: one source, late or north light, no beauty lighting.",
    `CAMERA / COMPOSITION: ${camera}.`,
    `MATERIAL: ${practice.material}.`,
    "TEXTURE: real surface, dust or grain left in.",
    `COLOUR TREATMENT: ${colourNames}.`,
    `POLISH: ${polish}.`,
    `MOOD: ${clause}`,
    `AVOID: ${practice.cliche}; text; logos; stock smiles; a brand moodboard.`,
    `SHARED DIRECTION: ${shared}`,
  ].join(" ");
}

function paletteWhy(practice: PracticeProfile, temperature: "warm" | "cool", push: ColourPush | null): string {
  const pushLine = push ? ` Pushed ${push}, because a flatter version of this palette would ignore that lean.` : "";
  const technical = temperature === "cool"
    ? `${practice.material} kept technical: paper, ink, and one working accent rather than a rustic range.`
    : `${practice.material} kept warm without becoming costume: bone, a deep ink, and an accent that belongs to the work.`;
  return `${technical} It follows the work they described, not a category costume.${pushLine}`;
}

function notedWork(description: string): string {
  const sentence = description.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  if (!sentence || sentence.length > 90) return "";
  return sentence.replace(/\.$/, "");
}

function pushed(colours: ReadingColour[], push: ColourPush | null): ReadingColour[] {
  if (!push) return colours.map((colour) => ({ ...colour }));
  return colours.map((colour) => ({ ...colour, hex: shiftHex(colour.hex, push, colour.possibleRole) }));
}

function shiftHex(hex: string, push: ColourPush, role: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  let red = (value >> 16) & 255;
  let green = (value >> 8) & 255;
  let blue = value & 255;
  if (push === "warmer") red = Math.min(255, red + 18);
  if (push === "darker") {
    red = Math.round(red * 0.82);
    green = Math.round(green * 0.82);
    blue = Math.round(blue * 0.82);
  }
  if (push === "cleaner") {
    red = Math.round(red * 0.92 + 18);
    green = Math.round(green * 0.92 + 18);
    blue = Math.round(blue * 0.92 + 18);
  }
  if (push === "brighter" && role === "Accent") red = Math.min(255, red + 28);
  if (push === "quieter") {
    const mix = 0.18;
    red = Math.round(red * (1 - mix) + 210 * mix);
    green = Math.round(green * (1 - mix) + 206 * mix);
    blue = Math.round(blue * (1 - mix) + 198 * mix);
  }
  if (push === "stranger" && role === "Accent") {
    blue = Math.min(255, blue + 36);
    green = Math.max(0, green - 16);
  }
  const next = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${next(red)}${next(green)}${next(blue)}`.toUpperCase();
}

function colourTemperature(session: DiscoverySession): "warm" | "cool" {
  const ids = session.colourPreferences.preferredPaletteIds;
  const coolPalette = ids.includes("cool-structured") || ids.includes("quiet-neutral");
  const warmPalette = ids.some((id) => ["warm-earth", "sun-washed", "soft-editorial", "deep-botanical", "bright-optimistic"].includes(id));
  if (coolPalette && !warmPalette) return "cool";
  if (warmPalette) return "warm";
  let cool = 0;
  let warm = 0;
  for (const comparison of session.visualPreferences.comparisons) {
    if (comparison.choice.state !== "selected" || comparison.choice.value === "neither") continue;
    const side = comparison.choice.value === "a" ? comparison.a : comparison.b;
    cool += side.traits.cool ?? 0;
    warm += side.traits.warm ?? 0;
  }
  return cool > warm + 0.4 ? "cool" : "warm";
}

function postureFor(archetypeId: string): CreativePosture {
  return POSTURE[archetypeId] ?? "editorial";
}

function postureIndex(posture: CreativePosture): number {
  return ["editorial", "raw", "precise", "expressive", "classic", "warm"].indexOf(posture);
}

function emptyTomorrow(): TomorrowBrief {
  return { type: "", colour: "", photography: [], design: [], voice: [], avoid: [], questions: [] };
}
