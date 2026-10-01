import { buildBrandIntelligence } from "../brandIntelligence";
import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";
import type { StatementOverride, UnderstandingField } from "../../types/project";

export function buildUnderstanding(session: DiscoverySession, overrides: StatementOverride[]): UnderstandingField[] {
  const reading = buildBrandIntelligence(session).reading;
  const name = textValue(session.business.name).trim() || "This business";
  const description = textValue(session.business.description);
  const comeFor = textValue(session.business.peopleComeFor);
  const audience = textValue(session.audience.bestCustomers);
  const horizon = textValue(session.goals.twelveMonthSuccess);
  const difference = session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "";
  const lead = reading.territories[0];
  const fields: UnderstandingField[] = [
    field("company.what_they_do", "company", "What they do", description || `${name} has not described the work yet.`, description ? "fact" : "hypothesis", description ? "high" : "low", description ? ["business.description"] : []),
    field("company.offer", "company", "What people come for", comeFor || "Not yet said.", comeFor ? "fact" : "hypothesis", comeFor ? "high" : "low", comeFor ? ["business.comeFor"] : []),
    field("company.commercial_goal", "company", "Commercial aim", horizon || "No horizon has been named.", horizon ? "preference" : "hypothesis", horizon ? "medium" : "low", horizon ? ["goals.horizon"] : []),
    field("audience.primary", "audience", "Who it should matter to", audience || "The paying audience is still vague.", audience ? "fact" : "hypothesis", audience ? "high" : "low", audience ? ["audience.current"] : []),
    field("audience.language", "audience", "Language they used", textValue(session.voicePreferences.preferredLanguage) || "No language preference yet.", textValue(session.voicePreferences.preferredLanguage) ? "preference" : "hypothesis", "medium", textValue(session.voicePreferences.preferredLanguage) ? ["voice.preferred"] : []),
    field("market.differentiation", "market", "How they say they differ", difference || "Difference is unresolved.", difference ? "fact" : "hypothesis", difference ? "medium" : "low", difference ? ["business.difference"] : []),
    field("market.category_caution", "market", "Category costume to resist", lead?.mustNotBecome || reading.hypothesis.conventionsToAvoid[0] || "", "inference", "medium", ["inference.avoid"]),
    field("brand.central_idea", "brand", "Central idea", reading.hypothesis.centralIdea, "hypothesis", "medium", ["inference.central"]),
    field("brand.positioning", "brand", "Positioning hypothesis", reading.hypothesis.strategicOpportunity, "hypothesis", "medium", ["inference.position"]),
    field("brand.voice", "brand", "Voice", lead?.voice.idea || reading.hypothesis.verbalOpportunity, "inference", "medium", ["inference.voice"]),
    field("brand.avoid", "brand", "Do not become", lead?.mustNotBecome || "", "inference", "medium", ["inference.avoid"]),
    field("strategy.opportunities", "strategy", "Strategic opening", reading.hypothesis.visualOpportunity, "hypothesis", "medium", ["inference.position"]),
    field("creative.territory", "creative", "Territory to explore", lead?.idea || "No territory yet.", "hypothesis", lead ? "medium" : "low", lead ? ["inference.territory"] : []),
    field("creative.risk", "creative", "Risk in that territory", lead?.risk || "", "inference", "medium", lead ? ["inference.territory"] : []),
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
  if (!override || override.status === "rejected") return field;
  return {
    ...field,
    text: override.text.trim() || field.text,
    kind: "fact",
    confidence: "high",
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
): UnderstandingField {
  return { id, section, label, text, kind, confidence, evidenceIds };
}
