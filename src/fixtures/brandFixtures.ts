import { buildBrandIntelligence } from "../domain/brandIntelligence";
import { territoryPlainText } from "../domain/creativeTerritories";
import { textsContainFiller } from "../domain/languageGuard";
import { syncAdaptiveComparisons } from "../domain/visualDirections";
import { createSession } from "../state/createSession";
import type { BrandIntelligence } from "../types/brandIntelligence";
import type { DiscoverySession, VisualTraitScores } from "../types/discovery";

const AT = "2026-01-15T10:00:00.000Z";

export interface BrandFixtureReport {
  id: string;
  name: string;
  intelligence: BrandIntelligence;
}

function said(raw: string) {
  return { state: "evidence" as const, evidence: { raw, capturedAt: AT } };
}

export function studioSession(id: string): DiscoverySession {
  const session = createSession(AT);
  session.id = id;
  session.business.name = said("North Workshop");
  session.business.description = said("A small workshop making furniture for homes.");
  session.business.peopleComeFor = said("People come for pieces that feel made, not manufactured.");
  session.business.differentiation = said("They stay close to the material and the person using it.");
  session.audience.bestCustomers = said("Households furnishing one careful room.");
  session.audience.desiredCustomers = { state: "same_as_current", capturedAt: AT };
  session.goals.outcomes = { state: "selected", selected: ["generate_enquiries"], capturedAt: AT };
  session.goals.twelveMonthSuccess = said("A full order book without sounding louder.");
  session.personality.attract = { state: "selected", selected: ["natural", "human", "calm"], custom: [], capturedAt: AT };
  session.personality.avoid = { state: "selected", selected: ["premium"], custom: [], capturedAt: AT };
  for (const dimension of session.personalitySpectrum.dimensions) {
    if (dimension.id !== "human_corporate") continue;
    dimension.answer = { state: "selected", value: 18, capturedAt: AT };
  }
  session.voicePreferences.preferredLanguage = said("plain, specific, no pitch");
  session.voicePreferences.avoidedLanguage = said("premium solutions");
  return session;
}

export function chooseVisual(session: DiscoverySession, keys: Array<keyof VisualTraitScores>) {
  for (const comparison of session.visualPreferences.comparisons) {
    const score = (traits: VisualTraitScores) => keys.reduce((sum, key) => sum + traits[key], 0);
    const a = score(comparison.a.traits);
    const b = score(comparison.b.traits);
    const value = Math.abs(a - b) < 0.2 ? "neither" : a > b ? "a" : "b";
    comparison.choice = { state: "selected", value, capturedAt: AT };
  }
}

export function chooseVoice(session: DiscoverySession, prefer: (traits: DiscoverySession["voicePreferences"]["comparisons"][number]["options"][number]["traits"]) => number) {
  for (const round of session.voicePreferences.comparisons) {
    const best = [...round.options].sort((a, b) => prefer(b.traits) - prefer(a.traits))[0];
    if (!best) continue;
    round.choice = { state: "selected", optionId: best.id, capturedAt: AT };
  }
}

export function organicFixture(): DiscoverySession {
  const session = studioSession("organic-visual");
  chooseVisual(session, ["organic", "raw", "warm"]);
  chooseVoice(session, (traits) => traits.human + traits.conversational + traits.understated);
  session.visualPreferences.comparisons = syncAdaptiveComparisons(session.visualPreferences.comparisons);
  return session;
}

export function geometricFixture(): DiscoverySession {
  const session = studioSession("geometric-visual");
  chooseVisual(session, ["technical", "minimal", "polished", "cool", "classic"]);
  chooseVoice(session, (traits) => traits.human + traits.conversational + traits.understated);
  session.visualPreferences.comparisons = syncAdaptiveComparisons(session.visualPreferences.comparisons);
  return session;
}

export function formalVoiceFixture(): DiscoverySession {
  const session = studioSession("formal-voice");
  chooseVisual(session, ["organic", "raw", "warm"]);
  chooseVoice(session, (traits) => traits.formal + traits.polished + traits.reserved);
  return session;
}

export function humanVoiceFixture(): DiscoverySession {
  const session = studioSession("human-voice");
  chooseVisual(session, ["organic", "raw", "warm"]);
  chooseVoice(session, (traits) => traits.human + traits.conversational + traits.simple);
  return session;
}

export function brandFixtureReports(): BrandFixtureReport[] {
  return [
    { id: "organic-raw-warm", name: "Organic, raw, warm, documentary", intelligence: buildBrandIntelligence(organicFixture()) },
    { id: "geometric-polished", name: "Geometric, polished, restrained, art-directed", intelligence: buildBrandIntelligence(geometricFixture()) },
    { id: "voice-human", name: "Same look, human voice", intelligence: buildBrandIntelligence(humanVoiceFixture()) },
    { id: "voice-formal", name: "Same look, formal voice", intelligence: buildBrandIntelligence(formalVoiceFixture()) },
  ];
}

export function territorySignature(intelligence: BrandIntelligence): string {
  return intelligence.territories
    .map((territory) =>
      [
        territory.id,
        territory.colourDirection.id,
        territory.imageryDirection.summary,
        territory.typeDirection.candidates.map((candidate) => candidate.id).join("+"),
      ].join(":"),
    )
    .join(" || ");
}

export function voiceSignature(intelligence: BrandIntelligence): string {
  return intelligence.territories
    .map((territory) => `${territory.voiceDirection.cluster}:${territory.examplePhrases.join(" / ")}`)
    .join(" || ");
}

export function formatBrandReport(report: BrandFixtureReport): string {
  const model = report.intelligence.model;
  const lines = [
    `# ${report.name}`,
    `id: ${report.id}`,
    "",
    "top positive signals:",
    ...model.signals
      .filter((signal) => signal.polarity === "positive")
      .slice(0, 8)
      .map((signal) => `- ${signal.dimension} (${signal.strength}, ${signal.group})`),
    "",
    "top negative signals:",
    ...model.signals
      .filter((signal) => signal.polarity === "negative")
      .slice(0, 5)
      .map((signal) => `- ${signal.dimension} (${signal.strength})`),
    "",
    "cross-modal reinforcement:",
    ...(model.reinforcement.length ? model.reinforcement.map((item) => `- ${item.summary}`) : ["- none"]),
    "",
    "tensions:",
    ...(model.tensions.length ? model.tensions.map((item) => `- ${item.statement}`) : ["- none"]),
    "",
    "hard avoids:",
    ...(model.hardAvoids.length ? model.hardAvoids.map((item) => `- ${item.summary}`) : ["- none"]),
    "",
  ];
  for (const territory of report.intelligence.territories) {
    lines.push(
      `territory: ${territory.name}`,
      territory.oneLineIdea,
      `why: ${territory.rationale}`,
      `type: ${territory.typeDirection.candidates.map((candidate) => `${candidate.name} (${candidate.why[0]})`).join("; ") || territory.typeDirection.summary}`,
      `colour: ${territory.colourDirection.name} — ${territory.colourDirection.rationale}`,
      `imagery: ${territory.imageryDirection.summary}`,
      `image notes: ${territory.imageryDirection.notes.join("; ")}`,
      `voice: ${territory.voiceDirection.summary}`,
      `phrases: ${territory.examplePhrases.join(" | ")}`,
      "",
    );
  }
  const filler = textsContainFiller(report.intelligence.territories.flatMap((territory) => territoryPlainText(territory)));
  if (filler) lines.push(`filler warning: ${filler}`);
  return lines.join("\n");
}
