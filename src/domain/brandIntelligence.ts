import { creativeFork } from "./archetypes";
import { buildBrandSignalModel } from "./brandSignals";
import { buildCreativeTerritories } from "./creativeTerritories";
import { WEIGHTING_NOTES } from "./signalWeights";
import { buildTerritoryVisualSpec } from "./territoryVisual";
import { buildStartingPoint } from "./workingDirection";
import type { DiscoverySession } from "../types/discovery";
import type { BrandIntelligence, CreativeTerritory, WorkingBrief } from "../types/brandIntelligence";

export function buildBrandIntelligence(session: DiscoverySession): BrandIntelligence {
  const draftModel = buildBrandSignalModel(session, { includeReaction: false });
  const model = buildBrandSignalModel(session, { includeReaction: true });
  const draftTerritories = buildCreativeTerritories(session, draftModel);
  const territories = buildCreativeTerritories(session, model);
  const fork = creativeFork(draftModel);
  const draftVisualSpecs = draftTerritories.map((territory) => buildTerritoryVisualSpec(session, territory));
  const visualSpecs = territories.map((territory) => buildTerritoryVisualSpec(session, territory));
  const brief = workingBrief(territories, session);
  return {
    draftModel,
    model,
    draftTerritories,
    territories,
    draftVisualSpecs,
    visualSpecs,
    forkQuestion: fork
      ? "We're seeing two directions here. Which feels more like somewhere you'd want to go?"
      : null,
    weightingNotes: WEIGHTING_NOTES,
    workingBrief: brief,
    startingPoint: buildStartingPoint(session, territories, visualSpecs, brief.headline),
    firstConversation: firstConversation(session, model.uncertainty, model.tensions.map((tension) => tension.statement)),
  };
}

function workingBrief(territories: CreativeTerritory[], session: DiscoverySession): WorkingBrief {
  const lead = leadTerritory(territories, session);
  const open = [
    ...territories
      .filter((territory) => territory.id !== lead.id)
      .map((territory) => `${territory.name} is still on the table`),
    ...session.territoryFeedback.reactions
      .filter((reaction) => reaction.note.trim())
      .map((reaction) => reaction.note.trim()),
  ];
  return {
    headline: headlineFor(lead, session),
    feel: lead.personality.join(", "),
    colour: lead.colourDirection.name,
    type: lead.typeDirection.candidates.map((candidate) => candidate.name).join(", ") || lead.typeDirection.summary,
    imagery: lead.imageryDirection.notes.slice(0, 3).join("; "),
    voice: lead.voiceDirection.characteristics.join(", "),
    avoid: lead.hardAvoidsRespected.slice(0, 4).join("; ") || lead.imageryDirection.avoid.slice(0, 2).join("; "),
    stillOpen: open.slice(0, 3).join(". ") || "Which of the remaining tensions they want to keep.",
  };
}

function leadTerritory(territories: CreativeTerritory[], session: DiscoverySession): CreativeTerritory {
  const preference = session.territoryFeedback.preference;
  const preferred = territories.find((territory) => territory.id === preference);
  if (preferred) return preferred;
  const ranked = [...session.territoryFeedback.reactions].sort((a, b) => reactionScore(b.response) - reactionScore(a.response));
  const best = territories.find((territory) => territory.id === ranked[0]?.territoryId);
  return best ?? territories[0] ?? emptyTerritory();
}

function reactionScore(response: string): number {
  if (response === "very_close") return 3;
  if (response === "something_here") return 2;
  if (response === "not_for_us") return 0;
  return 1;
}

function headlineFor(lead: CreativeTerritory, session: DiscoverySession): string {
  const preference = session.territoryFeedback.preference;
  if (preference === "mix") return "They asked for a mix of directions, not a single pick.";
  if (preference === "neither") return "Neither territory felt right. The notes below are a starting point.";
  if (preference === "guidance") return "They asked for guidance on which direction to develop.";
  const reaction = session.territoryFeedback.reactions.find((item) => item.territoryId === lead.id);
  if (reaction?.response === "very_close") return `${lead.name} received the strongest response.`;
  if (reaction?.response === "something_here") return `${lead.name} has something they want to keep exploring.`;
  if (preference && preference !== lead.id) return "No single territory was chosen. The notes below are a starting point.";
  return `${lead.name} is the stronger starting point in the evidence. It is not a decision to use it.`;
}

function firstConversation(session: DiscoverySession, uncertainty: string[], tensions: string[]): string[] {
  const lines = [...tensions.slice(0, 2), ...uncertainty.slice(0, 2)];
  if (session.territoryFeedback.preference === "guidance") {
    lines.unshift("They want a recommendation on which territory to develop, and why.");
  }
  const notes = session.territoryFeedback.reactions.map((reaction) => reaction.note.trim()).filter(Boolean);
  return [...lines, ...notes].slice(0, 4);
}

function emptyTerritory(): CreativeTerritory {
  return {
    id: "open",
    name: "Open",
    oneLineIdea: "There is not enough evidence for a territory yet.",
    rationale: "The discovery does not yet point toward a territory.",
    personality: [],
    visualCharacter: [],
    colourDirection: {
      id: "none",
      name: "Not enough colour evidence",
      role: "suggested",
      swatches: [],
      rationale: "No colour territory yet.",
      evidenceSources: [],
    },
    alternativeColour: null,
    existingColours: null,
    typeDirection: { summary: "No type direction yet.", candidates: [] },
    imageryDirection: { summary: "", notes: [], avoid: [], evidenceSources: [] },
    voiceDirection: {
      cluster: "human-understated",
      summary: "",
      characteristics: [],
      behaviour: [],
      examplePhrases: [],
      wordsToExplore: [],
      wordsToAvoid: [],
      evidenceSources: [],
    },
    stylingNotes: [],
    possibleReferences: [],
    examplePhrases: [],
    supportingEvidence: [],
    tensionsResolved: [],
    tensionsPreserved: [],
    hardAvoidsRespected: [],
    explorationLevel: "exploratory",
    previewDirectionId: "editorial-organic",
    generatedMoodboardAssets: [],
    generatedImagePrompts: [],
    referenceImages: [],
  };
}
