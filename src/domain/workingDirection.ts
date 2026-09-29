import type { DiscoverySession } from "../types/discovery";
import type { CreativeStartingPoint, CreativeTerritory, TerritoryVisualSpec } from "../types/brandIntelligence";
import { list } from "./strategistCopy";

export function buildStartingPoint(
  session: DiscoverySession,
  territories: CreativeTerritory[],
  specs: TerritoryVisualSpec[],
  headline: string,
): CreativeStartingPoint {
  const lead = leadTerritory(territories, session);
  const spec = specs.find((item) => item.territoryId === lead.id) ?? specs[0];
  const others = territories.filter((territory) => territory.id !== lead.id);
  if (!spec) return emptyStartingPoint(headline);

  const reaction = session.territoryFeedback.reactions.find((item) => item.territoryId === lead.id);
  const stillOpen = [
    preferenceLine(session.territoryFeedback.preference, others),
    expressionOpen(lead),
    reaction?.note.trim() ? `They added: ${reaction.note.trim()}` : "",
  ].filter(Boolean);

  return {
    headline,
    feel: lead.personality,
    typeToExplore: unique([spec.headingTypeface.name, spec.bodyTypeface.name, ...lead.typeDirection.candidates.map((candidate) => candidate.name)]).slice(0, 4),
    colourToExplore: spec.palette.map((role) => ({ name: role.name, hex: role.hex, possibleRole: role.possibleRole })),
    imageDirection: lead.imageryDirection.notes.slice(0, 5),
    graphicLanguage: spec.graphicMotifs,
    voice: lead.voiceDirection.characteristics.slice(0, 4),
    examplePhrase: spec.examplePhrase,
    avoid: unique([...lead.imageryDirection.avoid, ...lead.hardAvoidsRespected]).slice(0, 5),
    stillOpen: stillOpen.slice(0, 3),
    why: {
      type: whyType(lead, spec, session),
      colour: whyColour(lead, spec, session),
      imagery: whyImagery(lead, session),
      graphic: whyGraphic(lead, spec),
      voice: whyVoice(lead, spec, session),
    },
  };
}

function leadTerritory(territories: CreativeTerritory[], session: DiscoverySession): CreativeTerritory {
  const preference = session.territoryFeedback.preference;
  const preferred = territories.find((territory) => territory.id === preference);
  if (preferred) return preferred;
  const ranked = [...session.territoryFeedback.reactions].sort((a, b) => score(b.response) - score(a.response));
  const best = territories.find((territory) => territory.id === ranked[0]?.territoryId);
  return best ?? territories[0] ?? emptyTerritoryStub();
}

function score(response: string): number {
  if (response === "very_close") return 3;
  if (response === "something_here") return 2;
  if (response === "not_for_us") return 0;
  return 1;
}

function preferenceLine(preference: string | null, others: CreativeTerritory[]): string {
  if (preference === "mix") return "How to hold both territories without averaging them into one look.";
  if (preference === "guidance") return "They want a recommendation before either territory is developed.";
  if (preference === "neither") return "Neither territory felt right. The next conversation should ask what was missing.";
  if (others[0]) return `${others[0].name} is still available if this direction feels too expected.`;
  return "";
}

function expressionOpen(lead: CreativeTerritory): string {
  if (lead.id === "grounded-editorial" || lead.id === "raw-humanism") return "How expressive the typography should become.";
  if (lead.id === "precise-structure") return "How much warmth the structure can take.";
  const open = lead.tensionsPreserved.find((line) => !/no strong internal tension/i.test(line));
  return open ?? "";
}

function whyType(territory: CreativeTerritory, spec: TerritoryVisualSpec, session: DiscoverySession): string[] {
  const lines = [
    `${spec.headingTypeface.name} is a possible ${spec.axes.typography} direction for headlines. ${spec.bodyTypeface.name} can carry the smaller text. Neither is a final face.`,
  ];
  const typeEvidence = territory.supportingEvidence.filter((note) => /type|serif|sans|board|editorial|geometric/i.test(note.summary));
  if (typeEvidence.length > 0) lines.push(humanEvidence(typeEvidence.map((note) => note.summary)));
  else lines.push(`The pairing follows the ${territory.name.toLowerCase()} character more than a specimen they named.`);
  const reaction = reactionLine(session, territory);
  if (reaction) lines.push(reaction);
  return lines.slice(0, 4);
}

function whyColour(territory: CreativeTerritory, spec: TerritoryVisualSpec, session: DiscoverySession): string[] {
  const names = list(spec.palette.map((role) => role.name.toLowerCase()));
  const lines = [`${territory.colourDirection.name} is the palette to test, experienced here as ${names}. Roles are possible, not assigned.`];
  if (territory.colourDirection.evidenceSources.includes("colour.preferred")) {
    lines.push("It follows a palette they already moved toward.");
  } else if (spec.temperature === "warm") {
    lines.push("The warmth follows a lean toward natural, human, or earthier colour rather than a specification.");
  } else if (spec.temperature === "cool") {
    lines.push("The cooler range follows a lean toward structure, geometry, or a more controlled palette.");
  }
  const reaction = reactionLine(session, territory);
  if (reaction) lines.push(reaction);
  return lines.slice(0, 4);
}

function whyImagery(territory: CreativeTerritory, session: DiscoverySession): string[] {
  const lines = [territory.imageryDirection.summary];
  if (territory.imageryDirection.notes[0]) lines.push(`Look for ${territory.imageryDirection.notes.slice(0, 3).join(", ").toLowerCase()}.`);
  if (territory.imageryDirection.avoid[0]) lines.push(`Keep out ${territory.imageryDirection.avoid.slice(0, 2).join(", and ").toLowerCase()}.`);
  const reaction = reactionLine(session, territory);
  if (reaction) lines.push(reaction);
  return lines.filter(Boolean).slice(0, 4);
}

function whyGraphic(territory: CreativeTerritory, spec: TerritoryVisualSpec): string[] {
  return [
    `${territory.name} asks for ${list(spec.graphicMotifs.map((motif) => motif.toLowerCase()))}.`,
    ...territory.stylingNotes.slice(0, 2),
  ].slice(0, 4);
}

function whyVoice(territory: CreativeTerritory, spec: TerritoryVisualSpec, session: DiscoverySession): string[] {
  const lines = [
    `${territory.voiceDirection.summary}`,
    `Example only: “${spec.examplePhrase}”`,
  ];
  const spoken = read(session.voicePreferences.preferredLanguage);
  if (spoken) lines.push(`They described the language they want as ${spoken}.`);
  const reaction = reactionLine(session, territory);
  if (reaction) lines.push(reaction);
  return lines.slice(0, 4);
}

function humanEvidence(summaries: string[]): string {
  const readable = summaries.slice(0, 3).map(plain).filter(Boolean);
  if (readable.length === 0) return "The evidence is in the discovery, under Why.";
  return `It follows from ${list(readable)}.`;
}

function plain(summary: string): string {
  return summary
    .replace(/^Selected personality: /i, "describing themselves as ")
    .replace(/^Visual board /i, "choosing ")
    .replace(/^Preferred palette: /i, "moving toward ")
    .replace(/^Preferred type: /i, "leaning toward ")
    .replace(/^Preferred imagery: /i, "preferring ")
    .replace(/-/g, " ");
}

function reactionLine(session: DiscoverySession, territory: CreativeTerritory): string | null {
  const reaction = session.territoryFeedback.reactions.find((item) => item.territoryId === territory.id);
  if (!reaction) return null;
  if (reaction.response === "very_close") return `They said ${territory.name} felt very close.`;
  if (reaction.response === "something_here") return `They found something worth keeping in ${territory.name}.`;
  return `They felt ${territory.name} was not really them.`;
}

function read(value: { state: string; evidence?: { raw: string } }): string {
  if (value.state !== "evidence" || !value.evidence) return "";
  return value.evidence.raw.trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function emptyStartingPoint(headline: string): CreativeStartingPoint {
  return {
    headline,
    feel: [],
    typeToExplore: [],
    colourToExplore: [],
    imageDirection: [],
    graphicLanguage: [],
    voice: [],
    examplePhrase: "",
    avoid: [],
    stillOpen: ["There is not enough evidence for a working direction yet."],
    why: { type: [], colour: [], imagery: [], graphic: [], voice: [] },
  };
}

function emptyTerritoryStub(): CreativeTerritory {
  return {
    id: "open",
    name: "Open",
    oneLineIdea: "",
    rationale: "",
    personality: [],
    visualCharacter: [],
    colourDirection: { id: "none", name: "", role: "suggested", swatches: [], rationale: "", evidenceSources: [] },
    alternativeColour: null,
    existingColours: null,
    typeDirection: { summary: "", candidates: [] },
    imageryDirection: { summary: "", notes: [], avoid: [], evidenceSources: [] },
    voiceDirection: {
      cluster: "",
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
