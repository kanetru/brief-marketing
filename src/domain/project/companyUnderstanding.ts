import { buildBrandIntelligence } from "../brandIntelligence";
import { MARKETING_OUTCOMES } from "../options";
import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";
import type { StatementOverride, UnderstandingField } from "../../types/project";

export function buildUnderstanding(session: DiscoverySession, overrides: StatementOverride[]): UnderstandingField[] {
  const reading = buildBrandIntelligence(session).reading;
  const description = textValue(session.business.description);
  const comeFor = textValue(session.business.peopleComeFor);
  const audience = textValue(session.audience.bestCustomers);
  const horizon = textValue(session.goals.twelveMonthSuccess);
  const difference = session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "";
  const lead = reading.territories[0];
  const language = textValue(session.voicePreferences.preferredLanguage);
  const outcomes = session.goals.outcomes.selected
    .map((id) => MARKETING_OUTCOMES.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  const fields: UnderstandingField[] = [
    field("company.what_they_do", "business", "What they do", description, "fact", description ? "high" : "low", description ? ["business.description"] : [], "accepted"),
    field("company.offer", "business", "What people come for", comeFor, "fact", comeFor ? "high" : "low", comeFor ? ["business.comeFor"] : [], "accepted"),
    field("company.commercial_goal", "business", "What they want a year from now", horizon, "preference", horizon ? "medium" : "low", horizon ? ["goals.horizon"] : [], "accepted"),
    field("audience.primary", "audience", "Who it should matter to", audience, "fact", audience ? "high" : "low", audience ? ["audience.current"] : [], "accepted"),
    field("audience.language", "audience", "Language they used", language, "preference", "medium", language ? ["voice.preferred"] : [], "accepted"),
    field("market.differentiation", "market", "How they say they differ", difference, "fact", difference ? "medium" : "low", difference ? ["business.difference"] : [], "accepted"),
    field("market.category_caution", "market", "What they should not sound like", lead?.mustNotBecome || reading.hypothesis.conventionsToAvoid[0] || "", "inference", "medium", ["inference.avoid"], "unreviewed"),
    field("brand.central_idea", "brand", "The idea underneath", reading.hypothesis.centralIdea, "hypothesis", "medium", ["inference.central"], "unreviewed"),
    field("brand.positioning", "brand", "Where they might stand", reading.hypothesis.strategicOpportunity, "hypothesis", "medium", ["inference.position"], "unreviewed"),
    field("brand.voice", "brand", "How they should sound", lead?.voice.idea || reading.hypothesis.verbalOpportunity, "inference", "medium", ["inference.voice"], "unreviewed"),
    field("brand.avoid", "brand", "What to stay away from", lead?.mustNotBecome || "", "inference", "medium", ["inference.avoid"], "unreviewed"),
    field("strategy.opportunities", "marketing", "What the work could open", reading.hypothesis.visualOpportunity, "hypothesis", "medium", ["inference.position"], "unreviewed"),
    field("marketing.objectives", "marketing", "What they asked marketing to do", outcomes, "preference", "medium", outcomes ? ["goals.outcomes"] : [], "accepted"),
    field("creative.territory", "creative", "A direction worth trying", lead?.idea || "", "hypothesis", lead ? "medium" : "low", lead ? ["inference.territory"] : [], "unreviewed"),
    field("creative.risk", "creative", "What could go wrong", lead?.risk || "", "inference", "medium", lead ? ["inference.territory"] : [], "unreviewed"),
  ];
  return fields.filter((item) => item.text.trim()).map((item) => applyOverride(item, overrides));
}

export function inferenceSeeds(session: DiscoverySession): Array<{ id: string; text: string; topic: string; kind: "inference" | "hypothesis" }> {
  const reading = buildBrandIntelligence(session).reading;
  const lead = reading.territories[0];
  const seeds: Array<{ id: string; text: string; topic: string; kind: "inference" | "hypothesis" }> = [
    { id: "inference.central", text: reading.hypothesis.centralIdea, topic: "brand", kind: "hypothesis" },
    { id: "inference.position", text: reading.hypothesis.strategicOpportunity, topic: "strategy", kind: "hypothesis" },
    { id: "inference.voice", text: lead?.voice.idea || reading.hypothesis.verbalOpportunity, topic: "brand", kind: "inference" },
    { id: "inference.avoid", text: lead?.mustNotBecome || "", topic: "brand", kind: "inference" },
    { id: "inference.territory", text: lead?.idea || "", topic: "creative", kind: "hypothesis" },
  ];
  return seeds.filter((item) => item.text.trim());
}

function applyOverride(field: UnderstandingField, overrides: StatementOverride[]): UnderstandingField {
  const override = overrides.find((item) => item.fieldId === field.id);
  if (!override || override.status === "rejected" || override.decisionStatus === "rejected") return field;
  const epistemic = override.epistemicStatus ?? field.epistemicStatus;
  return {
    ...field,
    text: override.text.trim() || field.text,
    kind: epistemic,
    epistemicStatus: epistemic,
    decisionStatus: override.decisionStatus === "superseded" ? "superseded" : "approved",
    evidenceIds: [...field.evidenceIds, `manager.override.${field.id}`],
  };
}

function field(
  id: string,
  section: UnderstandingField["section"],
  label: string,
  text: string,
  kind: UnderstandingField["kind"],
  confidence: UnderstandingField["confidence"],
  evidenceIds: string[],
  decisionStatus: UnderstandingField["decisionStatus"],
): UnderstandingField {
  return { id, section, label, text, kind, epistemicStatus: kind, decisionStatus, confidence, evidenceIds };
}
