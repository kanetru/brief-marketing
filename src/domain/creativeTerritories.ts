import { distinctArchetypes, type ArchetypeDefinition, type RankedArchetype } from "./archetypes";
import { imageryLabel } from "./imagery";
import { paletteById } from "./palettes";
import { writeRationale } from "./strategistCopy";
import { imagePromptsFor } from "./territoryImagery";
import { colourWords, readEvidence, visualRecipe } from "./territoryVisual";
import { shortlistTypefaces } from "./typefaceCatalogue";
import type { DiscoverySession } from "../types/discovery";
import type {
  BrandSignalModel,
  ColourTerritory,
  CreativeTerritory,
  ImageryDirection,
  SignalEvidenceNote,
  VoiceDirection,
} from "../types/brandIntelligence";

const COLOUR_NEIGHBOUR: Record<string, string> = {
  "warm-earth": "soft-editorial",
  "soft-editorial": "warm-earth",
  "deep-botanical": "warm-earth",
  "sun-washed": "warm-earth",
  "bright-optimistic": "sun-washed",
  "quiet-neutral": "cool-structured",
  "cool-structured": "quiet-neutral",
  "high-contrast": "cool-structured",
};

const VOICE_CLUSTERS: Array<{
  id: string;
  summary: string;
  wants: Record<string, number>;
  characteristics: string[];
  behaviour: string[];
  phrases: string[];
}> = [
  {
    id: "human-understated",
    summary: "Direct, human, and understated. Expertise is explained, not announced.",
    wants: { human: 1, conversational: 0.9, understated: 0.6, simple: 0.45, humble: 0.3 },
    characteristics: ["Direct", "Human", "Knowledgeable", "Understated"],
    behaviour: [
      "Short declarative sentences",
      "Plain language",
      "Explain the expertise rather than announcing it",
      "Minimal sales language",
      "Occasional personality",
      "Confident without hype",
    ],
    phrases: ["Here's what we do, and why it matters.", "We'll tell you straight, before the work gets complicated."],
  },
  {
    id: "formal-polished",
    summary: "Measured and polished. The claim stays smaller than the work.",
    wants: { formal: 1, polished: 0.8, reserved: 0.55, confident: 0.3 },
    characteristics: ["Formal", "Polished", "Reserved", "Confident"],
    behaviour: ["Measured sentences", "Few adjectives", "Let the work carry the claim", "No jokes in the first line"],
    phrases: ["A considered approach, carefully carried through.", "The standard is in the work, not the announcement."],
  },
  {
    id: "direct-confident",
    summary: "Plain and sure of itself, without becoming a pitch.",
    wants: { confident: 1, simple: 0.7, direct: 0.4, human: 0.3 },
    characteristics: ["Direct", "Confident", "Plain", "Specific"],
    behaviour: ["Say the thing in one sentence", "Name the constraint", "Skip the warm-up paragraph"],
    phrases: ["This is the part we will not rush.", "The useful version is the specific one."],
  },
  {
    id: "technical-plain",
    summary: "Technical where it helps, plain everywhere else.",
    wants: { technical: 0.8, simple: 0.7, reserved: 0.4, practical: 0.5 },
    characteristics: ["Technical", "Plain", "Precise", "Calm"],
    behaviour: ["Use the real noun", "Define a term once", "Do not decorate a specification"],
    phrases: ["The detail is the work.", "We can show the method, not just the result."],
  },
];

export function buildCreativeTerritories(session: DiscoverySession, model: BrandSignalModel): CreativeTerritory[] {
  return distinctArchetypes(model).map((archetype) => assembleTerritory(session, model, archetype));
}

function assembleTerritory(session: DiscoverySession, model: BrandSignalModel, archetype: RankedArchetype): CreativeTerritory {
  const sources = evidenceFor(model, archetype);
  const sourcePaths = sources.map((item) => item.source);
  const colours = colourTerritories(session, model, archetype);
  const suggested = colours.find((item) => item.role === "suggested") ?? colours[0];
  const voice = voiceTerritory(session, model);
  const imagery = imageryDirection(session, archetype);
  const candidates = shortlistTypefaces(model.nets, session.typographyPreferences.avoidedDirectionIds, sourcePaths);
  if (!suggested) {
    throw new Error("A territory needs a colour starting point.");
  }
  const rationale = writeRationale(archetype.name, archetype.oneLineIdea, sources);
  const prompts = imagePromptsFor({
    businessName: readEvidence(session.business.name),
    description: readEvidence(session.business.description),
    paletteName: suggested.name,
    colourWords: colourWords(suggested.swatches),
    treatment: visualRecipe(archetype.id).imageTreatment,
    notes: imagery.notes,
    avoids: [...imagery.avoid, ...model.hardAvoids.map((item) => item.summary)],
  });
  return {
    id: archetype.id,
    name: archetype.name,
    oneLineIdea: archetype.oneLineIdea,
    rationale,
    personality: archetype.personality,
    visualCharacter: archetype.visualCharacter,
    colourDirection: suggested,
    alternativeColour: colours.find((item) => item.role === "alternative") ?? null,
    existingColours: colours.find((item) => item.role === "existing") ?? null,
    typeDirection: { summary: archetype.typeSummary, candidates },
    imageryDirection: imagery,
    voiceDirection: voice,
    stylingNotes: archetype.stylingNotes,
    possibleReferences: archetype.possibleReferences,
    examplePhrases: voice.examplePhrases,
    supportingEvidence: sources,
    tensionsResolved: [archetype.tensionsResolved],
    tensionsPreserved: preserved(model, archetype),
    hardAvoidsRespected: model.hardAvoids.map((item) => item.summary),
    explorationLevel: archetype.score >= 8 ? "supported" : "exploratory",
    previewDirectionId: archetype.previewDirectionId,
    generatedMoodboardAssets: [],
    generatedImagePrompts: prompts.map((prompt) => prompt.prompt),
    referenceImages: [],
  };
}

function evidenceFor(model: BrandSignalModel, archetype: ArchetypeDefinition): SignalEvidenceNote[] {
  const wanted = new Set(Object.keys(archetype.wants));
  const notes: SignalEvidenceNote[] = [];
  const seen = new Set<string>();
  for (const contribution of model.contributions) {
    if (!wanted.has(contribution.dimension) || contribution.amount <= 0) continue;
    if (contribution.kind === "reinforcement" || contribution.source === "cross-modal") continue;
    const key = `${contribution.source}:${contribution.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({ source: contribution.source, summary: contribution.summary });
    if (notes.length >= 6) return notes;
  }
  return notes;
}

function preserved(model: BrandSignalModel, archetype: ArchetypeDefinition): string[] {
  const wanted = new Set(Object.keys(archetype.wants));
  const lines = model.tensions
    .filter((tension) => wanted.has(tension.left) || wanted.has(tension.right))
    .map((tension) => tension.statement);
  return lines.length > 0 ? lines.slice(0, 2) : ["No strong internal tension was left open inside this territory."];
}

export function colourTerritories(session: DiscoverySession, model: BrandSignalModel, archetype?: ArchetypeDefinition): ColourTerritory[] {
  const avoided = new Set(session.colourPreferences.avoidedPaletteIds);
  const territories: ColourTerritory[] = [];
  const existing = existingColours(session);
  if (existing) territories.push(existing);

  const preferred = session.colourPreferences.preferredPaletteIds.filter((id) => !avoided.has(id));
  const primaryId = preferred[0] ?? derivedPalette(model, archetype);
  const primary = paletteTerritory(primaryId, "suggested", session, model);
  if (primary) territories.push(primary);

  const alternativeId = (preferred[1] && preferred[1] !== primaryId ? preferred[1] : COLOUR_NEIGHBOUR[primaryId]) ?? null;
  if (alternativeId && alternativeId !== primaryId && !avoided.has(alternativeId)) {
    const alternative = paletteTerritory(alternativeId, "alternative", session, model);
    if (alternative) territories.push(alternative);
  }
  return territories;
}

function existingColours(session: DiscoverySession): ColourTerritory | null {
  const relationship = session.colourPreferences.existingColourRelationship;
  if (relationship.state !== "selected" || relationship.value === "no") return null;
  const swatches = session.colourPreferences.existingBrandColours.map((colour) => colour.hex);
  if (swatches.length === 0) return null;
  return {
    id: "existing",
    name: "Existing colours",
    role: "existing",
    swatches,
    rationale: "These are colours they already use. They are context, not a new proposal.",
    evidenceSources: ["colour.existingHexes"],
  };
}

function derivedPalette(model: BrandSignalModel, archetype?: ArchetypeDefinition): string {
  const warm = (model.nets.warm ?? 0) + (model.nets.organic ?? 0) + (model.nets.natural ?? 0);
  const cool = (model.nets.cool ?? 0) + (model.nets.geometric ?? 0) + (model.nets.technical ?? 0);
  if ((archetype?.wants.editorial ?? 0) > 0.6 && warm >= cool) return "soft-editorial";
  if ((model.nets.playful ?? 0) > (model.nets.restrained ?? 0) && warm > 0) return "sun-washed";
  return warm >= cool ? "warm-earth" : "cool-structured";
}

function paletteTerritory(
  paletteId: string,
  role: "suggested" | "alternative",
  session: DiscoverySession,
  model: BrandSignalModel,
): ColourTerritory | null {
  const palette = paletteById(paletteId);
  if (!palette) return null;
  const sources: string[] = [];
  if (session.colourPreferences.preferredPaletteIds.includes(paletteId)) sources.push("colour.preferred");
  if (session.colourPreferences.avoidedPaletteIds.length > 0) sources.push("colour.avoided");
  if ((model.nets.warm ?? 0) > 1 || (model.nets.organic ?? 0) > 1 || (model.nets.cool ?? 0) > 1) {
    sources.push(...visualSources(session).slice(0, 1));
  }
  const why =
    role === "suggested"
      ? `${palette.name} is a starting palette, not a final specification.`
      : `${palette.name} is an alternative if the first palette feels too expected.`;
  const because = session.colourPreferences.preferredPaletteIds.includes(paletteId)
    ? " It follows a palette they already preferred."
    : " It follows the warm, cool, and material signals rather than a palette they clicked.";
  const rejected = session.colourPreferences.avoidedPaletteIds.length
    ? " Palettes they rejected were left out."
    : "";
  return {
    id: palette.id,
    name: palette.name,
    role,
    swatches: [...palette.swatches],
    rationale: `${why}${because}${rejected}`,
    evidenceSources: sources,
  };
}

function visualSources(session: DiscoverySession): string[] {
  return session.visualPreferences.comparisons
    .filter((comparison) => comparison.choice.state === "selected" && comparison.choice.value !== "neither")
    .map((comparison) => `visual.${comparison.comparisonId}`);
}

function imageryDirection(session: DiscoverySession, archetype: ArchetypeDefinition): ImageryDirection {
  const avoided = new Set(session.imageryPreferences.avoidedDirectionIds);
  const notes = archetype.imagery.notes.filter((note) => {
    if (avoided.has("polished") && /gloss|studio perfection/i.test(note)) return false;
    return true;
  });
  const avoid = [...archetype.imagery.avoid];
  for (const id of session.imageryPreferences.avoidedDirectionIds) {
    const label = imageryLabel(id);
    if (!avoid.some((item) => item.toLowerCase().includes(label.toLowerCase()))) {
      avoid.push(`${label} imagery, which they moved away from`);
    }
  }
  const sources = [];
  if (session.imageryPreferences.preferredDirectionIds.length > 0) sources.push("imagery.preferred");
  if (session.imageryPreferences.avoidedDirectionIds.length > 0) sources.push("imagery.avoided");
  sources.push(...visualSources(session).slice(0, 2));
  return {
    summary: archetype.imagery.summary,
    notes,
    avoid,
    evidenceSources: sources,
  };
}

export function voiceTerritory(session: DiscoverySession, model: BrandSignalModel): VoiceDirection {
  const voiceNets: Record<string, number> = {};
  for (const contribution of model.contributions) {
    if (contribution.modality !== "voice") continue;
    voiceNets[contribution.dimension] = (voiceNets[contribution.dimension] ?? 0) + contribution.amount;
  }
  const spoken = Object.values(voiceNets).some((value) => Math.abs(value) > 0.4);
  const nets = spoken ? voiceNets : model.nets;
  let best = VOICE_CLUSTERS[0];
  let bestScore = -Infinity;
  for (const cluster of VOICE_CLUSTERS) {
    let score = 0;
    for (const [dimension, weight] of Object.entries(cluster.wants)) {
      score += (nets[dimension] ?? 0) * weight;
    }
    if (score > bestScore) {
      best = cluster;
      bestScore = score;
    }
  }
  const cluster = best ?? VOICE_CLUSTERS[0];
  const sources = session.voicePreferences.comparisons
    .filter((round) => round.choice.state === "selected")
    .map((round) => `voice.${round.roundId}`);
  const explore = textOf(session.voicePreferences.preferredLanguage);
  const avoid = textOf(session.voicePreferences.avoidedLanguage);
  if (!cluster) {
    throw new Error("Voice clusters are missing.");
  }
  return {
    cluster: cluster.id,
    summary: sources.length === 0 ? `${cluster.summary} Voice evidence is still thin, so treat the lines as examples only.` : cluster.summary,
    characteristics: cluster.characteristics,
    behaviour: cluster.behaviour,
    examplePhrases: cluster.phrases,
    wordsToExplore: explore ? [explore] : cluster.characteristics.map((item) => item.toLowerCase()),
    wordsToAvoid: avoid ? [avoid] : [],
    evidenceSources: sources,
  };
}

function textOf(value: { state: string; evidence?: { raw: string } }): string {
  if (value.state !== "evidence" || !value.evidence) return "";
  return value.evidence.raw.trim();
}

export function territoryPlainText(territory: CreativeTerritory): string[] {
  return [
    territory.name,
    territory.oneLineIdea,
    territory.rationale,
    territory.typeDirection.summary,
    ...territory.typeDirection.candidates.flatMap((candidate) => candidate.why),
    territory.colourDirection.rationale,
    territory.imageryDirection.summary,
    ...territory.imageryDirection.notes,
    ...territory.imageryDirection.avoid,
    territory.voiceDirection.summary,
    ...territory.voiceDirection.examplePhrases,
    ...territory.voiceDirection.behaviour,
    ...territory.stylingNotes,
  ];
}
