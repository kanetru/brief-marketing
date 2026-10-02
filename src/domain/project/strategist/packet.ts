import { textValue } from "../../../state/textEvidence";
import type { BriefProject, EvidenceRecord } from "../../../types/project";
import type { DiscoverySession } from "../../../types/discovery";
import { colourProfile } from "../../colourProfile";
import { imageryProfile } from "../../imagery";

export interface StrategistPacket {
  hash: string;
  text: string;
  evidenceIds: string[];
}

export function buildStrategistPacket(
  project: BriefProject,
  extras?: {
    evidence?: EvidenceRecord[];
    categoryNote?: string;
    competitorLines?: string[];
    candidateNote?: string;
    contradictions?: string[];
  },
): StrategistPacket {
  const session = project.discovery;
  const evidence = extras?.evidence ?? [];
  const lines = [
    `Business: ${project.businessName || textValue(session.business.name) || "Unnamed"}`,
    `Category label: ${project.category || "unset"}`,
    `Website: ${project.website || "unset"}`,
    "",
    "WHAT THEY SAID",
    block(session),
    "",
    "LEARNING REFLECTIONS",
    project.learning.length ? project.learning.map((item) => `- ${item.prompt} → ${item.choice}`).join("\n") : "None yet.",
    "",
    "COLOUR TASTE (not a brand palette)",
    colourProfile(session.colourPreferences).summary,
    "",
    "IMAGERY TASTE",
    imageryProfile(session.imageryPreferences).summary,
    "",
    "MANAGER NOTES",
    project.managerNotes.trim() || "None.",
    "",
    "APPROVED OR EDITED LINES (do not overwrite; challenge them if the evidence now disagrees)",
    project.overrides.filter((item) => item.status !== "rejected" && item.decisionStatus !== "rejected").map((item) => `- ${item.fieldId}: ${item.text}`).join("\n") || "None.",
    "",
    "WEBSITE RESEARCH",
    project.websiteResearch?.site?.summary
      || (project.websiteResearch?.observation
        ? [project.websiteResearch.observation.headline, project.websiteResearch.observation.description, project.websiteResearch.observation.excerpt].filter(Boolean).join("\n")
        : "No website research stored."),
    "",
    "COMPETITORS",
    extras?.competitorLines?.join("\n") || project.competitors.map((item) => `- ${item.name} ${item.website} ${item.notes}`.trim()).join("\n") || "None added.",
    "",
    "CATEGORY",
    extras?.categoryNote || "No category synthesis.",
    "",
    "CONTRADICTIONS ALREADY NOTICED",
    extras?.contradictions?.join("\n") || "None recorded by the rules.",
    "",
    "RULE CANDIDATES",
    "These are mechanical suggestions. Accept, revise, or reject them. They are not the strategy.",
    extras?.candidateNote || "No rule candidates were attached.",
    "",
    "EVIDENCE IDS YOU MAY CITE",
    evidence.map((item) => `- ${item.id} [${item.epistemicStatus}/${item.sourceType}] ${item.text}`).join("\n") || "No ledger rows.",
    "",
    "LIBRARY",
    project.library.length ? project.library.map((item) => `- ${item.name}: ${item.description}`).join("\n") : "Nothing on file.",
  ];
  const text = lines.join("\n");
  return {
    hash: stableHash(text),
    text,
    evidenceIds: evidence.map((item) => item.id),
  };
}

function block(session: DiscoverySession): string {
  const inputs = session.strategyInputs;
  const said = (label: string, value: string) => (value.trim() ? `${label}: ${value.trim()}` : `${label}: unknown`);
  const offers = inputs.offers.length
    ? inputs.offers.map((offer) => `${offer.name} (${offer.role}, ${offer.importance}${offer.buyer ? `, bought by ${offer.buyer}` : ""})`).join("; ")
    : "unknown";
  return [
    said("What they do", textValue(session.business.description)),
    said("What people come for", textValue(session.business.peopleComeFor)),
    said("How they say they differ", session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : ""),
    `Offers: ${offers}`,
    `What they want more of: ${inputs.want.join(", ") || "unknown"} ${textValue(inputs.wantNote)}`.trim(),
    said("Why it needed to exist", inputs.whyExist.state === "evidence" ? inputs.whyExist.evidence.raw : ""),
    said("What was missing", textValue(inputs.whatWasMissing)),
    said("What gets better", textValue(inputs.whatGetsBetter)),
    said("What they refuse", textValue(inputs.refuse)),
    said("What they do differently", textValue(inputs.differently)),
    said("What would embarrass them", textValue(inputs.embarrassed)),
    said("Who it should matter to", textValue(session.audience.bestCustomers)),
    said("Situation when someone looks", textValue(inputs.situation)),
    said("What should be different afterwards", textValue(inputs.afterwards)),
    said("Hesitation", textValue(inputs.hesitate)),
    said("What they hate about alternatives", textValue(inputs.hateAlternatives)),
    `What they lean toward: ${inputs.lean.join(", ") || "unknown"}`,
    `Awareness when people first arrive: ${inputs.awareness ?? "unknown"}`,
    `Outcomes they ticked: ${session.goals.outcomes.selected.join(", ") || "unknown"}`,
    said("A year from today", textValue(session.goals.twelveMonthSuccess)),
    said("Follow-up on that year", textValue(inputs.goalFollowUp)),
    `Capacity: ${inputs.capacity ?? "unknown"}`,
    `Active now: ${inputs.active.join(", ") || "unknown"}`,
    `What is working: ${inputs.working.join(", ") || "unknown"}`,
    said("What feels like a chore", textValue(inputs.chore)),
    `Can make: ${inputs.canMake.join(", ") || "unknown"}`,
    said("Who makes it", textValue(inputs.whoCreates)),
    `Time: ${inputs.time ?? "unknown"}`,
    `Constraints: ${inputs.constraints.join(", ") || "none named"}`,
    said("How people hear of them", textValue(inputs.hear)),
    said("Before they get in touch", textValue(inputs.beforeContact)),
    said("What they must believe", textValue(inputs.mustBelieve)),
    said("What stops them", textValue(inputs.stopsThem)),
    said("After they buy", textValue(inputs.afterBuy)),
    said("What brings them back", textValue(inputs.comeBack)),
    `Proof they named: ${inputs.proofKinds.join(", ") || "none"}`,
    said("Proof they can show", textValue(inputs.proofAvailable)),
    `Neighbours: ${inputs.neighbourKinds.join(", ")} ${textValue(inputs.neighbours)}`.trim(),
    said("Wrong company", textValue(inputs.wrongCompany)),
    `Personality they want: ${session.personality.attract.selected.join(", ") || "unknown"}`,
    `Personality they refuse: ${session.personality.avoid.selected.join(", ") || "unknown"}`,
    said("Language they like", textValue(session.voicePreferences.preferredLanguage)),
    said("Language they refuse", textValue(session.voicePreferences.avoidedLanguage)),
  ].join("\n");
}

export function stableHash(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}
