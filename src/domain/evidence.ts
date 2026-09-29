import { imageryLabel } from "./imagery";
import { MARKETING_OUTCOMES, traitLabel } from "./options";
import { paletteById } from "./palettes";
import { typeDirectionById } from "./typography";
import { VISUAL_TRAITS } from "./visualDirections";
import { deriveVisualSignal } from "./visualSignal";
import { VOICE_TRAITS } from "./voice";
import { deriveVoiceSignal } from "./voiceSignal";
import type {
  DiscoverySession,
  MarketingOutcome,
  TextEvidenceAnswer,
  TextEvidenceOrUncertain,
  VisualTraitScores,
  VoiceTraitScores,
} from "../types/discovery";

export interface DerivedSignal {
  source: "visual_comparisons" | "voice_comparisons" | "personality_spectrum";
  type: "derived_signal";
  trait: string;
  /** 0–1. A pattern in the choices, not a fact about the brand. */
  strength: number;
}

/**
 * Deterministic evidence for the discovery interviewer.
 * Numbers live only under derivedSignals, and each one is labelled as derived.
 */
export interface DiscoveryEvidence {
  clientSaid: Record<string, string>;
  clientSelected: Record<string, unknown>;
  clientRejected: Record<string, unknown>;
  clientMarkedUnknown: string[];
  derivedSignals: DerivedSignal[];
}

const SIGNAL_FLOOR = 0.35;

export function buildDiscoveryEvidence(session: DiscoverySession): DiscoveryEvidence {
  const said: Record<string, string> = {};
  const selected: Record<string, unknown> = {};
  const rejected: Record<string, unknown> = {};
  const unknown: string[] = [];

  putText(said, "business.name", session.business.name);
  putText(said, "business.description", session.business.description);
  putText(said, "business.peopleComeFor", session.business.peopleComeFor);
  putTextOrUnknown(said, unknown, "business.differentiation", session.business.differentiation);

  putText(said, "audience.bestCustomers", session.audience.bestCustomers);
  const desired = session.audience.desiredCustomers;
  if (desired.state === "evidence") said["audience.desiredCustomers"] = desired.evidence.raw.trim();
  if (desired.state === "same_as_current") selected["audience.desiredCustomers"] = "same_as_current";
  if (desired.state === "uncertain") unknown.push("audience.desiredCustomers");

  if (session.goals.outcomes.selected.length > 0) {
    selected["goals.outcomes"] = session.goals.outcomes.selected.map(outcomeLabel);
  }
  putText(said, "goals.somethingElse", session.goals.somethingElse);
  putText(said, "goals.twelveMonthSuccess", session.goals.twelveMonthSuccess);

  const attract = session.personality.attract;
  const avoid = session.personality.avoid;
  if (attract.selected.length || attract.custom.length) {
    selected["personality.attract"] = [...attract.selected.map(traitLabel), ...attract.custom];
  }
  if (avoid.selected.length || avoid.custom.length) {
    rejected["personality.avoid"] = [...avoid.selected.map(traitLabel), ...avoid.custom];
  }

  for (const dimension of session.personalitySpectrum.dimensions) {
    const path = `spectrum.${dimension.id}`;
    if (dimension.answer.state === "neutral") {
      selected[path] = { left: dimension.leftLabel, right: dimension.rightLabel, position: "neither_really_matters" };
    }
    if (dimension.answer.state === "selected") {
      selected[path] = {
        left: dimension.leftLabel,
        right: dimension.rightLabel,
        value: dimension.answer.value,
      };
    }
  }

  for (const comparison of session.visualPreferences.comparisons) {
    if (comparison.choice.state !== "selected") continue;
    const path = `visual.${comparison.comparisonId}`;
    const choice = comparison.choice.value;
    if (choice === "neither") {
      rejected[path] = { presented: [comparison.a.id, comparison.b.id], choice: "neither" };
      continue;
    }
    const chosen = choice === "a" ? [comparison.a] : choice === "b" ? [comparison.b] : [comparison.a, comparison.b];
    const other = choice === "a" ? [comparison.b] : choice === "b" ? [comparison.a] : [];
    selected[path] = {
      choice,
      chosen: chosen.map((side) => side.id),
      strongTraits: unique(chosen.flatMap((side) => traitsAtLeast(side.traits, 0.6))),
    };
    if (other.length > 0) {
      rejected[`${path}.other`] = {
        id: other.map((side) => side.id),
        strongTraits: unique(other.flatMap((side) => traitsAtLeast(side.traits, 0.6))),
      };
    }
  }

  if (session.colourPreferences.preferredPaletteIds.length > 0) {
    selected["colour.preferred"] = session.colourPreferences.preferredPaletteIds.map(paletteName);
  }
  if (session.colourPreferences.avoidedPaletteIds.length > 0) {
    rejected["colour.avoided"] = session.colourPreferences.avoidedPaletteIds.map(paletteName);
  }
  if (session.colourPreferences.existingColourRelationship.state === "selected") {
    selected["colour.existingRelationship"] = session.colourPreferences.existingColourRelationship.value;
  }
  if (session.colourPreferences.existingBrandColours.length > 0) {
    said["colour.existingHexes"] = session.colourPreferences.existingBrandColours.map((colour) => colour.hex).join(", ");
  }

  if (session.typographyPreferences.preferredDirectionIds.length > 0) {
    selected["typography.preferred"] = session.typographyPreferences.preferredDirectionIds.map(
      (id) => typeDirectionById(id).label,
    );
  }
  if (session.typographyPreferences.avoidedDirectionIds.length > 0) {
    rejected["typography.avoided"] = session.typographyPreferences.avoidedDirectionIds.map(
      (id) => typeDirectionById(id).label,
    );
  }

  if (session.imageryPreferences.preferredDirectionIds.length > 0) {
    selected["imagery.preferred"] = session.imageryPreferences.preferredDirectionIds.map(imageryLabel);
  }
  if (session.imageryPreferences.avoidedDirectionIds.length > 0) {
    rejected["imagery.avoided"] = session.imageryPreferences.avoidedDirectionIds.map(imageryLabel);
  }

  for (const round of session.voicePreferences.comparisons) {
    const path = `voice.${round.roundId}`;
    if (round.choice.state === "none") {
      rejected[path] = { situation: round.situation, choice: "none", lines: round.options.map((option) => option.text) };
    }
    if (round.choice.state === "selected") {
      const optionId = round.choice.optionId;
      const option = round.options.find((item) => item.id === optionId);
      selected[path] = {
        situation: round.situation,
        line: option?.text ?? optionId,
        strongTraits: option ? strongVoiceTraits(option.traits) : [],
      };
    }
  }
  putText(said, "voice.preferredLanguage", session.voicePreferences.preferredLanguage);
  putText(said, "voice.avoidedLanguage", session.voicePreferences.avoidedLanguage);

  session.inspiration.positiveReferences.forEach((reference, index) => {
    const path = `inspiration.admired.${index + 1}`;
    said[`${path}.name`] = reference.name;
    if (reference.url) said[`${path}.url`] = reference.url;
    if (reference.note) said[`${path}.note`] = reference.note;
  });
  session.inspiration.negativeReferences.forEach((reference, index) => {
    const path = `inspiration.avoid.${index + 1}`;
    rejected[`${path}.name`] = reference.name;
    if (reference.url) rejected[`${path}.url`] = reference.url;
    if (reference.note) rejected[`${path}.note`] = reference.note;
  });

  if (session.territoryFeedback?.preference) {
    selected["territory.preference"] = session.territoryFeedback.preference;
  }
  for (const reaction of session.territoryFeedback?.reactions ?? []) {
    selected[`territory.${reaction.territoryId}`] = {
      response: reaction.response,
      note: reaction.note,
    };
  }

  return {
    clientSaid: said,
    clientSelected: selected,
    clientRejected: rejected,
    clientMarkedUnknown: unknown,
    derivedSignals: derivedSignals(session),
  };
}

/** Every path the payload actually contains. Observations must cite these. */
export function evidencePaths(evidence: DiscoveryEvidence): Set<string> {
  const paths = new Set<string>([
    ...Object.keys(evidence.clientSaid),
    ...Object.keys(evidence.clientSelected),
    ...Object.keys(evidence.clientRejected),
    ...evidence.clientMarkedUnknown,
  ]);
  for (const signal of evidence.derivedSignals) {
    paths.add(`derived.${signal.source}.${signal.trait}`);
  }
  return paths;
}

function derivedSignals(session: DiscoverySession): DerivedSignal[] {
  const signals: DerivedSignal[] = [];
  const visual = deriveVisualSignal(session.visualPreferences);
  if (visual) pushScores(signals, "visual_comparisons", visual, VISUAL_TRAITS);
  const voice = deriveVoiceSignal(session.voicePreferences);
  if (voice) pushScores(signals, "voice_comparisons", voice, VOICE_TRAITS);

  for (const dimension of session.personalitySpectrum.dimensions) {
    if (dimension.answer.state !== "selected") continue;
    const value = dimension.answer.value;
    const distance = Math.abs(value - 50) / 50;
    if (distance < 0.3) continue;
    const trait = value < 50 ? dimension.leftLabel : dimension.rightLabel;
    signals.push({
      source: "personality_spectrum",
      type: "derived_signal",
      trait: `${dimension.id}:${trait.toLowerCase()}`,
      strength: Math.round(distance * 100) / 100,
    });
  }
  return signals;
}

function pushScores(
  target: DerivedSignal[],
  source: DerivedSignal["source"],
  scores: VisualTraitScores | VoiceTraitScores,
  traits: readonly string[],
) {
  for (const trait of traits) {
    const strength = scores[trait as keyof typeof scores] ?? 0;
    if (strength < SIGNAL_FLOOR) continue;
    target.push({ source, type: "derived_signal", trait, strength });
  }
}

function putText(target: Record<string, string>, path: string, answer: TextEvidenceAnswer) {
  if (answer.state !== "evidence") return;
  const value = answer.evidence.raw.trim();
  if (value) target[path] = value;
}

function putTextOrUnknown(
  said: Record<string, string>,
  unknown: string[],
  path: string,
  answer: TextEvidenceOrUncertain,
) {
  if (answer.state === "uncertain") {
    unknown.push(path);
    return;
  }
  putText(said, path, answer);
}

function outcomeLabel(id: MarketingOutcome): string {
  return MARKETING_OUTCOMES.find((item) => item.id === id)?.label ?? id;
}

function paletteName(id: string): string {
  return paletteById(id)?.name ?? id;
}

function traitsAtLeast(scores: VisualTraitScores, threshold: number): string[] {
  return VISUAL_TRAITS.filter((trait) => scores[trait] >= threshold);
}

function strongVoiceTraits(scores: VoiceTraitScores): string[] {
  return VOICE_TRAITS.filter((trait) => scores[trait] >= 0.6);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
