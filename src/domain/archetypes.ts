import type { BrandSignalModel } from "../types/brandIntelligence";

export interface ArchetypeDefinition {
  id: string;
  name: string;
  oneLineIdea: string;
  previewDirectionId: string;
  /** Relative pull. Not a claim about the client. */
  wants: Record<string, number>;
  prior: number;
  personality: string[];
  visualCharacter: string[];
  typeSummary: string;
  stylingNotes: string[];
  possibleReferences: string[];
  imagery: {
    summary: string;
    notes: string[];
    avoid: string[];
  };
  tensionsResolved: string;
  imagePrompt: string;
}

export const ARCHETYPES: readonly ArchetypeDefinition[] = [
  {
    id: "grounded-editorial",
    name: "Grounded Editorial",
    oneLineIdea: "Natural and human, composed with enough restraint to feel considered.",
    previewDirectionId: "warm-editorial",
    prior: 0.15,
    wants: { organic: 1, warm: 1, editorial: 1, restrained: 0.85, natural: 0.8, human: 0.7, tactile: 0.45 },
    personality: ["Natural", "Human", "Considered"],
    visualCharacter: ["Warm", "Editorial", "Restrained", "Tactile"],
    typeSummary: "A characterful editorial serif, with a practical sans in support.",
    stylingNotes: [
      "Quiet margins and a clear column",
      "Headline serif, plain supporting sans",
      "Colour used as a material rather than a shout",
    ],
    possibleReferences: ["Independent print magazines", "Workshop and material studies"],
    imagery: {
      summary: "Natural light, real people, and the work in context.",
      notes: [
        "Natural light",
        "Documentary rather than staged",
        "People in context",
        "Close details of process and material",
        "Visible texture",
        "Imperfect compositions",
        "Restrained post-processing",
      ],
      avoid: ["Glossy stock photography", "Artificial studio perfection", "Generic smiling-team imagery"],
    },
    tensionsResolved: "Keeps the warmth, and chooses restraint over raw energy.",
    imagePrompt:
      "Natural light, documentary photograph of a person at work, warm earth tones, visible texture, imperfect crop, no gloss",
  },
  {
    id: "raw-humanism",
    name: "Raw Humanism",
    oneLineIdea: "Warm and human, with the texture and imperfection left visible.",
    previewDirectionId: "organic-raw",
    prior: 0.12,
    wants: { raw: 1, organic: 0.9, tactile: 0.85, warm: 0.8, human: 0.8, expressive: 0.55 },
    personality: ["Human", "Direct", "Unfussy"],
    visualCharacter: ["Raw", "Warm", "Tactile", "Imperfect"],
    typeSummary: "A warmer, less polished serif or humanist face. A cold grotesque is a poor headline here.",
    stylingNotes: ["Uneven edges left visible", "Type that feels printed, not rendered", "Few rules, more material"],
    possibleReferences: ["Process diaries", "Hands, tools, and unfinished work"],
    imagery: {
      summary: "Close, imperfect, and specific to how the work is actually made.",
      notes: [
        "Available light",
        "Hands and tools in frame",
        "Cropped too close to be a poster",
        "Dust, grain, and material",
        "No retouching of the useful mess",
      ],
      avoid: ["Seamless studio backdrops", "High-gloss product lighting", "Stock handshakes"],
    },
    tensionsResolved: "Keeps the humanity, and chooses texture over polish.",
    imagePrompt: "Close documentary crop of hands and material, warm light, visible grain, imperfect, no studio gloss",
  },
  {
    id: "precise-structure",
    name: "Precise Structure",
    oneLineIdea: "Clear, geometric and composed, with the polish doing the talking.",
    previewDirectionId: "geometric-clean",
    prior: 0.14,
    wants: { geometric: 1, polished: 0.9, minimal: 0.85, cool: 0.65, technical: 0.6, clean: 0.8, restrained: 0.45 },
    personality: ["Clear", "Precise", "Quietly confident"],
    visualCharacter: ["Geometric", "Polished", "Minimal", "Cool"],
    typeSummary: "A clean grotesque or geometric sans, with very little decoration.",
    stylingNotes: ["Strict grid", "One accent, used rarely", "Lots of unused space"],
    possibleReferences: ["Technical manuals with a point of view", "Architecture monographs"],
    imagery: {
      summary: "Controlled frames, clear structure, and objects allowed to be themselves.",
      notes: [
        "Even, controlled light",
        "Deliberate crops",
        "Architecture, tools, or product in isolation",
        "Little atmosphere for its own sake",
      ],
      avoid: ["Handmade texture as decoration", "Casual snapshots", "Over-saturated colour"],
    },
    tensionsResolved: "Chooses clarity and polish over warmth and irregularity.",
    imagePrompt: "Cool, precise photograph, geometric crop, even light, generous negative space, no texture overlay",
  },
  {
    id: "warm-precision",
    name: "Warm Precision",
    oneLineIdea: "Structured and readable, but warmer and more human than a corporate system.",
    previewDirectionId: "restrained-warm",
    prior: 0.1,
    wants: { clean: 0.8, warm: 0.75, human: 0.75, approachable: 0.65, contemporary: 0.45, practical: 0.5, restrained: 0.35 },
    personality: ["Approachable", "Capable", "Warm"],
    visualCharacter: ["Clean", "Warm", "Structured"],
    typeSummary: "A humanist sans for the running text, with a quiet serif only where a headline needs it.",
    stylingNotes: ["Warm paper ground", "Simple components", "Type doing more work than graphics"],
    possibleReferences: ["Useful public-service design", "Studios that explain the work in plain sight"],
    imagery: {
      summary: "People and places, photographed clearly, without a campaign gloss.",
      notes: ["Soft natural light", "Real rooms", "Faces that are not performing", "Simple compositions"],
      avoid: ["Ice-blue corporate gradients", "Heroic low-angle portraits"],
    },
    tensionsResolved: "Holds structure and warmth in the same system.",
    imagePrompt: "Warm, clear photograph of a real workspace, soft daylight, simple composition, no campaign gloss",
  },
  {
    id: "playful-signal",
    name: "Playful Signal",
    oneLineIdea: "Energetic and direct, with colour and type carrying some of the personality.",
    previewDirectionId: "playful-warm",
    prior: 0.08,
    wants: { playful: 1, expressive: 0.85, energetic: 0.8, warm: 0.45, contemporary: 0.4 },
    personality: ["Playful", "Energetic", "Direct"],
    visualCharacter: ["Expressive", "Warm", "Graphic"],
    typeSummary: "An expressive display face for short lines, with a plain sans underneath so it stays readable.",
    stylingNotes: ["One loud colour", "Type as the graphic", "Short lines, not paragraphs of display type"],
    possibleReferences: ["Independent posters", "Packaging that can be read across a room"],
    imagery: {
      summary: "Graphic, cropped, and a little loud — still specific to this work.",
      notes: ["Hard crops", "Strong colour in the scene", "Movement", "Few props"],
      avoid: ["Muted luxury still-life", "Formal portraits"],
    },
    tensionsResolved: "Chooses energy over restraint.",
    imagePrompt: "Graphic crop, warm saturated colour, energetic composition, plain background, no luxury styling",
  },
  {
    id: "quiet-authority",
    name: "Quiet Authority",
    oneLineIdea: "Classic and restrained, confident without raising its voice.",
    previewDirectionId: "classic-polished",
    prior: 0.09,
    wants: { classic: 1, restrained: 0.85, polished: 0.6, authoritative: 0.65, serious: 0.5, formal: 0.45 },
    personality: ["Serious", "Dependable", "Refined"],
    visualCharacter: ["Classic", "Restrained", "Polished"],
    typeSummary: "A classic serif with real text colour, set quietly. No display tricks.",
    stylingNotes: ["Traditional proportions", "A rule and a margin, not a graphic system", "Black, paper, and one muted metal"],
    possibleReferences: ["Book jackets", "Institutions that do not need to look new"],
    imagery: {
      summary: "Formal, still, and specific. Nothing is trying to be liked.",
      notes: ["Still light", "Formal framing", "Materials and rooms over faces", "Little colour grading"],
      avoid: ["Casual phone snapshots", "Trend-led gradients", "Jokes in the layout"],
    },
    tensionsResolved: "Chooses classic restraint over contemporary energy.",
    imagePrompt: "Still, formal photograph, classic framing, muted colour, paper and material, no trend styling",
  },
];

const FORK_AXES: ReadonlyArray<readonly [string, string]> = [
  ["raw", "polished"],
  ["organic", "geometric"],
  ["expressive", "restrained"],
  ["playful", "serious"],
  ["warm", "cool"],
];

export interface RankedArchetype extends ArchetypeDefinition {
  score: number;
}

export function archetypeById(id: string): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((archetype) => archetype.id === id);
}

function axisLean(wants: Record<string, number>, left: string, right: string): number {
  return (wants[left] ?? 0) - (wants[right] ?? 0);
}

export function archetypesDiffer(a: ArchetypeDefinition, b: ArchetypeDefinition): boolean {
  return FORK_AXES.some(([left, right]) => axisLean(a.wants, left, right) * axisLean(b.wants, left, right) < 0);
}

export function rankArchetypes(model: BrandSignalModel): RankedArchetype[] {
  const hard = new Set(model.hardAvoidDimensions);
  return ARCHETYPES.map((archetype) => {
    let score = archetype.prior;
    for (const [dimension, weight] of Object.entries(archetype.wants)) {
      score += (model.nets[dimension] ?? 0) * weight;
      if (hard.has(dimension) && weight >= 0.5) score -= 8;
    }
    return { ...archetype, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function uncoveredScore(candidate: ArchetypeDefinition, first: ArchetypeDefinition, model: BrandSignalModel): number {
  let score = 0;
  for (const [dimension, weight] of Object.entries(candidate.wants)) {
    if ((first.wants[dimension] ?? 0) >= 0.45) continue;
    score += Math.max(0, model.nets[dimension] ?? 0) * weight;
  }
  return score;
}

export function distinctArchetypes(model: BrandSignalModel): RankedArchetype[] {
  const ranked = rankArchetypes(model);
  const first = ranked[0];
  if (!first) return [];
  const second =
    [...ranked]
      .filter((item) => item.id !== first.id && archetypesDiffer(first, item))
      .sort((a, b) => uncoveredScore(b, first, model) - uncoveredScore(a, first, model) || b.score - a.score)[0] ?? ranked[1];
  if (!second) return [first];
  const third = ranked.find(
    (item) =>
      item.id !== first.id &&
      item.id !== second.id &&
      item.score > 4 &&
      item.score > second.score * 0.88 &&
      archetypesDiffer(item, first) &&
      archetypesDiffer(item, second) &&
      uncoveredScore(item, first, model) > 2 &&
      uncoveredScore(item, second, model) > 2,
  );
  return third ? [first, second, third] : [first, second];
}

/** A fork is worth one question when two territories are both alive and actually different. */
export function creativeFork(model: BrandSignalModel): { a: RankedArchetype; b: RankedArchetype } | null {
  const [first, second] = distinctArchetypes(model);
  if (!first || !second) return null;
  if (first.score < 5) return null;
  if (second.score < first.score * 0.72) return null;
  if (!archetypesDiffer(first, second)) return null;
  return { a: first, b: second };
}
