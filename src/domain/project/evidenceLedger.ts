import { MARKETING_OUTCOMES, PERSONALITY_TRAITS } from "../options";
import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";
import type {
  DecisionStatus,
  EvidenceKind,
  EvidenceRecord,
  EvidenceSourceType,
  LearningResponse,
  StatementOverride,
  StoredResearch,
} from "../../types/project";

export function buildEvidenceLedger(
  session: DiscoverySession,
  extras: {
    managerNotes: string;
    followUps: Array<{ id: string; prompt: string; answer: string }>;
    followUpRequest: { prompts: Array<{ id: string; prompt: string }>; answers: Record<string, string> } | null;
    competitorNotes: Array<{ id: string; name: string; notes: string }>;
    inferences: Array<{ id: string; text: string; topic: string; kind: EvidenceKind }>;
    overrides: StatementOverride[];
    learning: LearningResponse[];
    websiteResearch: StoredResearch | null;
    competitorResearch: Array<{ id: string; name: string; research: StoredResearch }>;
    updatedAt: string;
  },
): EvidenceRecord[] {
  const at = extras.updatedAt;
  const records: EvidenceRecord[] = [];

  const say = (input: {
    id: string;
    sourceType: EvidenceSourceType;
    sourceReference: string;
    text: string;
    topic: string;
    kind: EvidenceKind;
    confidence?: EvidenceRecord["confidence"];
    decisionStatus?: DecisionStatus;
    url?: string;
    retrievedAt?: string;
    claimScope?: EvidenceRecord["claimScope"];
  }) => {
    const trimmed = input.text.trim();
    if (!trimmed) return;
    const fromClient = input.sourceType === "client_statement" || input.sourceType === "visual_choice";
    records.push({
      id: input.id,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      text: trimmed,
      topic: input.topic,
      confidence: input.confidence ?? "high",
      kind: input.kind,
      epistemicStatus: input.kind,
      decisionStatus: input.decisionStatus ?? (fromClient ? "accepted" : "unreviewed"),
      url: input.url,
      retrievedAt: input.retrievedAt,
      claimScope: input.claimScope ?? "business",
      timestamp: at,
      managerStatus: "unreviewed",
    });
  };

  say({ id: "business.name", sourceType: "client_statement", sourceReference: "business.name", text: textValue(session.business.name), topic: "company", kind: "fact" });
  say({ id: "business.description", sourceType: "client_statement", sourceReference: "business.description", text: textValue(session.business.description), topic: "company", kind: "fact" });
  say({ id: "business.comeFor", sourceType: "client_statement", sourceReference: "business.peopleComeFor", text: textValue(session.business.peopleComeFor), topic: "company", kind: "fact" });
  if (session.business.differentiation.state === "evidence") {
    say({ id: "business.difference", sourceType: "client_statement", sourceReference: "business.differentiation", text: session.business.differentiation.evidence.raw, topic: "market", kind: "fact" });
  }
  if (session.business.differentiation.state === "uncertain") {
    say({ id: "business.difference", sourceType: "client_statement", sourceReference: "business.differentiation", text: "They are not sure what makes them different.", topic: "market", kind: "fact", confidence: "medium" });
  }
  say({ id: "audience.current", sourceType: "client_statement", sourceReference: "audience.bestCustomers", text: textValue(session.audience.bestCustomers), topic: "audience", kind: "fact" });
  if (session.audience.desiredCustomers.state === "evidence") {
    say({ id: "audience.desired", sourceType: "client_statement", sourceReference: "audience.desiredCustomers", text: session.audience.desiredCustomers.evidence.raw, topic: "audience", kind: "preference" });
  }
  if (session.audience.desiredCustomers.state === "same_as_current") {
    say({ id: "audience.desired", sourceType: "client_statement", sourceReference: "audience.desiredCustomers", text: "They want to keep mattering to the people who already come.", topic: "audience", kind: "preference" });
  }
  const goals = session.goals.outcomes.selected
    .map((id) => MARKETING_OUTCOMES.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  say({ id: "goals.outcomes", sourceType: "client_statement", sourceReference: "goals.outcomes", text: goals, topic: "strategy", kind: "preference" });
  say({ id: "goals.horizon", sourceType: "client_statement", sourceReference: "goals.twelveMonthSuccess", text: textValue(session.goals.twelveMonthSuccess), topic: "strategy", kind: "preference" });
  const attract = session.personality.attract.selected
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  const avoid = session.personality.avoid.selected
    .map((id) => PERSONALITY_TRAITS.find((item) => item.id === id)?.label ?? id)
    .join(", ");
  say({ id: "personality.attract", sourceType: "client_statement", sourceReference: "personality.attract", text: attract, topic: "brand", kind: "preference" });
  say({ id: "personality.avoid", sourceType: "client_statement", sourceReference: "personality.avoid", text: avoid, topic: "brand", kind: "preference" });
  say({ id: "voice.preferred", sourceType: "client_statement", sourceReference: "voice.preferredLanguage", text: textValue(session.voicePreferences.preferredLanguage), topic: "brand", kind: "preference" });
  say({ id: "voice.avoided", sourceType: "client_statement", sourceReference: "voice.avoidedLanguage", text: textValue(session.voicePreferences.avoidedLanguage), topic: "brand", kind: "preference" });
  if (session.colourPreferences.preferredPaletteIds.length > 0) {
    say({ id: "colour.preferred", sourceType: "visual_choice", sourceReference: "colour.preferred", text: session.colourPreferences.preferredPaletteIds.join(", "), topic: "brand", kind: "preference" });
  }
  if (session.typographyPreferences.preferredDirectionIds.length > 0) {
    say({ id: "type.preferred", sourceType: "visual_choice", sourceReference: "type.preferred", text: session.typographyPreferences.preferredDirectionIds.join(", "), topic: "brand", kind: "preference" });
  }
  if (session.imageryPreferences.preferredDirectionIds.length > 0) {
    say({ id: "imagery.preferred", sourceType: "visual_choice", sourceReference: "imagery.preferred", text: session.imageryPreferences.preferredDirectionIds.join(", "), topic: "brand", kind: "preference" });
  }
  const reaction = session.territoryFeedback.preference;
  if (reaction) say({ id: "territory.preference", sourceType: "client_statement", sourceReference: "territory.preference", text: reaction, topic: "creative", kind: "preference", confidence: "medium" });

  if (extras.managerNotes.trim()) {
    say({ id: "manager.notes", sourceType: "manager_statement", sourceReference: "manager.notes", text: extras.managerNotes, topic: "company", kind: "inference", confidence: "medium" });
  }
  for (const follow of extras.followUps) {
    say({ id: `followup.${follow.id}`, sourceType: "client_statement", sourceReference: `followup.${follow.id}`, text: follow.answer ? `${follow.prompt} — ${follow.answer}` : "", topic: "strategy", kind: "fact", confidence: "medium" });
  }
  for (const prompt of extras.followUpRequest?.prompts ?? []) {
    const answer = extras.followUpRequest?.answers[prompt.id] ?? "";
    say({ id: `followup.request.${prompt.id}`, sourceType: "client_statement", sourceReference: `followup.request.${prompt.id}`, text: answer ? `${prompt.prompt} — ${answer}` : "", topic: "strategy", kind: "fact", confidence: "medium" });
  }
  for (const item of extras.learning) {
    say({ id: `learning.${item.id}`, sourceType: "client_statement", sourceReference: `learning.${item.id}`, text: `${item.prompt} — ${item.choice}`, topic: "brand", kind: "preference", confidence: "medium" });
  }
  for (const competitor of extras.competitorNotes) {
    say({ id: `competitor.${competitor.id}`, sourceType: "manager_statement", sourceReference: `competitor.${competitor.id}`, text: competitor.notes ? `${competitor.name}: ${competitor.notes}` : "", topic: "market", kind: "inference", confidence: "medium" });
  }
  for (const inference of extras.inferences) {
    say({ id: inference.id, sourceType: "strategist_inference", sourceReference: inference.id, text: inference.text, topic: inference.topic, kind: inference.kind, confidence: "medium" });
  }
  for (const override of extras.overrides) {
    if (override.status === "rejected" || override.decisionStatus === "rejected") continue;
    const epistemic = override.epistemicStatus ?? "hypothesis";
    say({
      id: `manager.override.${override.fieldId}`,
      sourceType: "manager_statement",
      sourceReference: `override.${override.fieldId}`,
      text: override.text,
      topic: "brand",
      kind: epistemic,
      confidence: "medium",
      decisionStatus: override.decisionStatus === "superseded" ? "superseded" : "approved",
    });
  }
  publishPage(say, "website", "website_research", extras.websiteResearch);
  for (const competitor of extras.competitorResearch) {
    publishPage(say, `competitor.${competitor.id}.page`, "competitor_research", competitor.research, competitor.name);
  }
  return records;
}

function publishPage(
  say: (input: {
    id: string;
    sourceType: EvidenceSourceType;
    sourceReference: string;
    text: string;
    topic: string;
    kind: EvidenceKind;
    confidence?: EvidenceRecord["confidence"];
    decisionStatus?: DecisionStatus;
    url?: string;
    retrievedAt?: string;
    claimScope?: EvidenceRecord["claimScope"];
  }) => void,
  idPrefix: string,
  sourceType: EvidenceSourceType,
  research: StoredResearch | null,
  name = "",
) {
  const page = research?.observation;
  if (!research || !page) return;
  const prefix = name ? `${name} says` : "The site says";
  const bits: Array<[string, string]> = [
    ["headline", page.headline],
    ["description", page.description],
    ["excerpt", page.excerpt],
  ];
  for (const [slot, text] of bits) {
    say({
      id: `${idPrefix}.${slot}`,
      sourceType,
      sourceReference: page.url,
      text: text ? `${prefix}: ${text}` : "",
      topic: "market",
      kind: "inference",
      confidence: "medium",
      decisionStatus: "unreviewed",
      url: page.url,
      retrievedAt: page.retrievedAt,
      claimScope: "published_copy",
    });
  }
}
