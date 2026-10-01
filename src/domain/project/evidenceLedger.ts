import { MARKETING_OUTCOMES, PERSONALITY_TRAITS } from "../options";
import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";
import type { EvidenceKind, EvidenceRecord, EvidenceSourceType } from "../../types/project";

export function buildEvidenceLedger(
  session: DiscoverySession,
  extras: {
    managerNotes: string;
    followUps: Array<{ id: string; prompt: string; answer: string }>;
    competitorNotes: Array<{ id: string; name: string; notes: string }>;
    inferences: Array<{ id: string; text: string; topic: string; kind: EvidenceKind }>;
    overrides: Array<{ fieldId: string; text: string; status: string }>;
    updatedAt: string;
  },
): EvidenceRecord[] {
  const at = extras.updatedAt;
  const records: EvidenceRecord[] = [];

  const say = (
    id: string,
    sourceType: EvidenceSourceType,
    sourceReference: string,
    text: string,
    topic: string,
    kind: EvidenceKind,
    confidence: EvidenceRecord["confidence"] = "high",
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    records.push({
      id,
      sourceType,
      sourceReference,
      text: trimmed,
      topic,
      confidence,
      kind,
      timestamp: at,
      managerStatus: "unreviewed",
    });
  };

  say("business.name", "client_statement", "business.name", textValue(session.business.name), "company", "fact");
  say("business.description", "client_statement", "business.description", textValue(session.business.description), "company", "fact");
  say("business.comeFor", "client_statement", "business.peopleComeFor", textValue(session.business.peopleComeFor), "company", "fact");
  if (session.business.differentiation.state === "evidence") {
    say("business.difference", "client_statement", "business.differentiation", session.business.differentiation.evidence.raw, "market", "fact");
  }
  if (session.business.differentiation.state === "uncertain") {
    say("business.difference", "client_statement", "business.differentiation", "They are not sure what makes them different.", "market", "fact", "medium");
  }
  say("audience.current", "client_statement", "audience.bestCustomers", textValue(session.audience.bestCustomers), "audience", "fact");
  if (session.audience.desiredCustomers.state === "evidence") {
    say("audience.desired", "client_statement", "audience.desiredCustomers", session.audience.desiredCustomers.evidence.raw, "audience", "preference");
  }
  if (session.audience.desiredCustomers.state === "same_as_current") {
    say("audience.desired", "client_statement", "audience.desiredCustomers", "They want to keep mattering to the people who already come.", "audience", "preference");
  }
  const goals = session.goals.outcomes.selected
    .map((id) => MARKETING_OUTCOMES.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  say("goals.outcomes", "client_statement", "goals.outcomes", goals, "strategy", "preference");
  say("goals.horizon", "client_statement", "goals.twelveMonthSuccess", textValue(session.goals.twelveMonthSuccess), "strategy", "preference");
  const attract = session.personality.attract.selected
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  const avoid = session.personality.avoid.selected
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  say("personality.attract", "client_statement", "personality.attract", attract, "brand", "preference");
  say("personality.avoid", "client_statement", "personality.avoid", avoid, "brand", "preference");
  say("voice.preferred", "client_statement", "voice.preferredLanguage", textValue(session.voicePreferences.preferredLanguage), "brand", "preference");
  say("voice.avoided", "client_statement", "voice.avoidedLanguage", textValue(session.voicePreferences.avoidedLanguage), "brand", "preference");
  if (session.colourPreferences.preferredPaletteIds.length > 0) {
    say("colour.preferred", "visual_choice", "colour.preferred", session.colourPreferences.preferredPaletteIds.join(", "), "brand", "preference");
  }
  if (session.typographyPreferences.preferredDirectionIds.length > 0) {
    say("type.preferred", "visual_choice", "type.preferred", session.typographyPreferences.preferredDirectionIds.join(", "), "brand", "preference");
  }
  if (session.imageryPreferences.preferredDirectionIds.length > 0) {
    say("imagery.preferred", "visual_choice", "imagery.preferred", session.imageryPreferences.preferredDirectionIds.join(", "), "brand", "preference");
  }
  const reaction = session.territoryFeedback.preference;
  if (reaction) say("territory.preference", "client_statement", "territory.preference", reaction, "creative", "preference", "medium");

  if (extras.managerNotes.trim()) {
    say("manager.notes", "manager_statement", "manager.notes", extras.managerNotes, "company", "fact", "medium");
  }
  for (const follow of extras.followUps) {
    say(`followup.${follow.id}`, "client_statement", `followup.${follow.id}`, follow.answer ? `${follow.prompt} — ${follow.answer}` : "", "strategy", "fact", "medium");
  }
  for (const competitor of extras.competitorNotes) {
    say(`competitor.${competitor.id}`, "manager_statement", `competitor.${competitor.id}`, competitor.notes ? `${competitor.name}: ${competitor.notes}` : "", "market", "fact", "medium");
  }
  for (const inference of extras.inferences) {
    say(inference.id, "strategist_inference", inference.id, inference.text, inference.topic, inference.kind, "medium");
  }
  for (const override of extras.overrides) {
    if (override.status === "rejected") continue;
    say(
      `manager.override.${override.fieldId}`,
      "manager_statement",
      `override.${override.fieldId}`,
      override.text,
      "brand",
      "fact",
      "high",
    );
  }
  return records;
}
