import type { BriefProject, EvidenceRecord, ProjectIntelligence, StatementOverride } from "../../types/project";
import type { BrandBrain, BrainRevision } from "../../types/intelligence";

function fieldText(intelligence: ProjectIntelligence, section: string): string {
  const lines = intelligence.understanding.fields
    .filter((field) => field.section === section && field.text.trim())
    .map((field) => field.text.trim());
  return lines.join(" ") || "Not established yet.";
}

function byKind(intelligence: ProjectIntelligence, kind: EvidenceRecord["kind"]): string[] {
  return intelligence.evidence.filter((item) => item.epistemicStatus === kind).map((item) => item.text).filter(Boolean);
}

export function assembleBrandBrain(project: BriefProject, intelligence: ProjectIntelligence): BrandBrain {
  const live = intelligence.clientBrain.source === "live_model";
  const decisions = project.overrides
    .filter((item) => item.decisionStatus === "approved" || item.status === "approved" || item.status === "edited")
    .map((item) => item.text.trim())
    .filter(Boolean);
  const positioning = intelligence.strategy.positioning?.statement ?? "";
  return {
    projectId: project.id,
    version: project.version,
    updatedAt: project.updatedAt,
    narrative: live
      ? intelligence.clientBrain.output.clientRead
      : `${project.businessName || "This client"} is known through discovery and research. No model reading is stored yet.`,
    identity: project.businessName || "Unnamed",
    business: fieldText(intelligence, "business"),
    offers: fieldText(intelligence, "company"),
    commercialPriorities: fieldText(intelligence, "marketing"),
    goals: fieldText(intelligence, "marketing"),
    customers: fieldText(intelligence, "audience"),
    customerPsychology: [intelligence.strategy.audience.situation, intelligence.strategy.audience.desiredOutcome].filter(Boolean).join(" ") || "Not established yet.",
    customerJourney: intelligence.strategy.journey.map((stage) => stage.stage).filter(Boolean).join(" · ") || "Not established yet.",
    category: project.category || intelligence.category?.observation || "Not established yet.",
    competitors: intelligence.competitors.map((item) => item.name).filter(Boolean).join(", ") || "None being watched.",
    positioning: positioning || "No positioning is approved.",
    differentiation: fieldText(intelligence, "market"),
    brand: fieldText(intelligence, "brand"),
    verbalIdentity: fieldText(intelligence, "brand"),
    visualIdentity: fieldText(intelligence, "creative"),
    colourPreferences: "Colour choices in discovery are taste, not a brand palette.",
    imageryPreferences: "Imagery choices are photographic preferences, not a finished art direction.",
    channels: intelligence.strategy.channels.map((item) => `${item.channel} ${item.priority}`).join(", "),
    content: intelligence.strategy.territories.map((item) => item.name).join(", ") || "Not established yet.",
    proof: intelligence.strategy.proof.have.join(" ") || intelligence.strategy.proof.gaps.join(" ") || "Proof is thin.",
    constraints: fieldText(intelligence, "marketing"),
    capabilities: project.library.length ? `${project.library.length} files in the library.` : "No library yet.",
    opportunities: intelligence.opportunities.map((item) => item.title).join("; ") || "None saved.",
    strategicDecisions: decisions.join(" ") || "No manager decision is stored.",
    facts: byKind(intelligence, "fact"),
    preferences: byKind(intelligence, "preference"),
    hypotheses: [
      ...byKind(intelligence, "hypothesis"),
      ...(positioning ? [`Hypothesis: ${positioning}`] : []),
    ],
    recommendations: byKind(intelligence, "recommendation"),
    contradictions: intelligence.contradictions.map((item) => item.statement),
    unknowns: intelligence.openQuestions.map((item) => item.prompt),
    currentStrategicRead: live
      ? intelligence.clientBrain.output.clientRead
      : "No model reading is stored. Working directions stay hypotheses until a person decides.",
    evidenceIds: intelligence.evidence.map((item) => item.id),
  };
}

export function appendRevision(revisions: readonly BrainRevision[], next: BrainRevision): BrainRevision[] {
  return [...revisions, next];
}

export function revisionFromDecision(override: StatementOverride, version: number): BrainRevision {
  return {
    version,
    at: override.updatedAt,
    summary: "Manager decision",
    previous: "",
    current: override.text,
    why: override.decisionStatus === "rejected" || override.status === "rejected"
      ? "The manager set the line aside."
      : "The manager kept or edited a line. Approval does not make a hypothesis a fact.",
    evidenceIds: [],
    managerDecisionIds: [override.fieldId],
  };
}

const DAY = 24 * 60 * 60 * 1000;

export function staleEvidence(evidence: readonly EvidenceRecord[], now: string, maxAgeDays = 120): EvidenceRecord[] {
  const at = Date.parse(now);
  return evidence.filter((item) => {
    if (!item.retrievedAt) return false;
    return at - Date.parse(item.retrievedAt) > maxAgeDays * DAY;
  });
}
