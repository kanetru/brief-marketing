import type { AgentFile, AgentPack, EvidenceRecord, ProjectIntelligence, UnderstandingField } from "../../types/project";
import type { BriefProject } from "../../types/project";

export function buildAgentPack(project: BriefProject, intelligence: Omit<ProjectIntelligence, "agentPack">): AgentPack {
  const files = [
    file("00_README.md", "How to use this pack", readme(project, intelligence.generatedAt)),
    file("01_company.md", "Company", companyFile(intelligence)),
    file("02_audience.md", "Audience", audienceFile(intelligence)),
    file("03_positioning.md", "Positioning", positioningFile(intelligence)),
    file("04_voice.md", "Voice", voiceFile(intelligence)),
    file("05_visual_direction.md", "Visual direction", visualFile(intelligence)),
    file("06_competitors.md", "Competitors", competitorFile(intelligence)),
    file("07_content_strategy.md", "Content strategy", contentFile(intelligence)),
    file("08_asset_register.md", "Asset register", assetFile(intelligence)),
    file("09_guardrails.md", "Guardrails", guardrailFile(intelligence)),
    file("10_open_questions.md", "Open questions", questionFile(intelligence)),
    file("11_evidence.md", "Evidence", evidenceFile(intelligence)),
  ];
  const master = file("BRIEF_CONTEXT.md", "Complete context", masterFile(project, intelligence, files));
  return { generatedAt: intelligence.generatedAt, projectVersion: project.version, files, master };
}

export const STARTER_WORKFLOWS = [
  { id: "social", label: "Write social content", uses: "04_voice.md and 07_content_strategy.md", task: "Write three social posts for this client. Use only claims the evidence supports. Match the voice. Do not invent proof." },
  { id: "campaign", label: "Create a campaign", uses: "03_positioning.md and 07_content_strategy.md", task: "Propose one campaign with a single idea, three assets, and what must not be claimed." },
  { id: "designer", label: "Brief a designer", uses: "05_visual_direction.md", task: "Write a designer brief from the visual direction. Include type, colour roles, imagery, and the risk." },
  { id: "landing", label: "Build a landing page", uses: "01_company.md, 02_audience.md, and 04_voice.md", task: "Draft a landing page outline: first line, who it is for, proof needed, and the ask." },
  { id: "calendar", label: "Create a content calendar", uses: "07_content_strategy.md and 08_asset_register.md", task: "Sketch four weeks of content using the recurring format. Mark anything that needs proof first." },
] as const;

export function starterPrompt(workflowId: string, pack: AgentPack): string {
  const workflow = STARTER_WORKFLOWS.find((item) => item.id === workflowId) ?? STARTER_WORKFLOWS[0];
  return `${workflow?.task}\n\nUse this project context. Treat it as canonical unless the user overrides it.\n\n${pack.master.markdown}`;
}

function masterFile(project: BriefProject, intelligence: Omit<ProjectIntelligence, "agentPack">, files: AgentFile[]): string {
  const name = project.businessName || "this business";
  const sections = files
    .filter((item) => item.name !== "00_README.md")
    .map((item) => `## ${item.title}\n\n${item.markdown}`)
    .join("\n\n");
  return [
    `You are working on marketing for ${name}. Treat the following as canonical project context unless the user explicitly overrides it.`,
    "",
    `Project version ${project.version}. Generated ${intelligence.generatedAt}.`,
    "Facts are things the client said. Inferences and hypotheses come from Brief and can be wrong.",
    "An approved direction is a decision the manager made. It is not a fact.",
    "Published copy is what a website currently says. It is not a fact about the business.",
    "",
    sections,
  ].join("\n");
}

function readme(project: BriefProject, generatedAt: string): string {
  return [`Context pack for ${project.businessName || "an unnamed project"}.`, `Version ${project.version}. Generated ${generatedAt}.`, "Give BRIEF_CONTEXT.md to another assistant when you want the whole client. Use a single file when the task is narrower."].join("\n\n");
}

function companyFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const parts = [sectionFields(intelligence, "business"), sectionFields(intelligence, "company")]
    .filter((part) => part !== "Nothing in this section yet.");
  return parts.join("\n\n") || "Nothing in this section yet.";
}

function audienceFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  return sectionFields(intelligence, "audience");
}

function positioningFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  return [sectionFields(intelligence, "market"), "", sectionFields(intelligence, "brand")].join("\n");
}

function voiceFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const lead = intelligence.understanding.fields.find((field) => field.id === "brand.voice");
  const readingVoice = lead?.text ?? "";
  return [`Principle: ${readingVoice}`, "", sectionFields(intelligence, "brand")].join("\n");
}

function visualFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  return sectionFields(intelligence, "creative");
}

function competitorFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  if (intelligence.competitors.length === 0) return "No competitors have been added.";
  const lines = intelligence.competitors.map((profile) => {
    if (profile.basis === "unavailable") return `### ${profile.name}\n${profile.website}\n\n${profile.unavailableReason}`;
    return `### ${profile.name}\n${profile.website}\n\nBasis: ${profile.basis}.\n\n${profile.apparentPositioning}`;
  });
  const category = intelligence.category
    ? `\n\nCategory note: ${intelligence.category.observation}`
    : "\n\nCategory synthesis is unavailable until notes or a research provider exist.";
  const tensions = intelligence.tensions.length
    ? `\n\n${intelligence.tensions.map((item) => `${item.title}\n${item.statement}`).join("\n\n")}`
    : "";
  return lines.join("\n\n") + category + tensions;
}

function contentFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const items = intelligence.opportunities.filter((item) => item.type === "content" || item.type === "campaign" || item.type === "format" || item.type === "channel");
  if (items.length === 0) return "No content opportunities yet.";
  return items.map((item) => `### ${item.title}\n${item.why}\n\nDo: ${item.action}`).join("\n\n");
}

function assetFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const register = intelligence.assets.map((asset) => `- SHOULD EXIST · ${asset.priority.toUpperCase()} · ${asset.name} (${asset.status}). ${asset.reason}`).join("\n");
  const library = intelligence.library.length === 0
    ? "Nothing is on file yet."
    : intelligence.library.map((asset) => `- ON HAND · ${asset.name}${asset.fileRef ? ` · ${asset.fileRef}` : ""}`).join("\n");
  return `What should exist\n\n${register}\n\nWhat is on hand\n\n${library}`;
}

function guardrailFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const avoid = intelligence.understanding.fields.find((field) => field.id === "brand.avoid");
  const risk = intelligence.understanding.fields.find((field) => field.id === "creative.risk");
  return [`Do not become: ${avoid?.text || "Not named."}`, `Risk: ${risk?.text || "Not named."}`, "Do not invent proof, metrics, or competitor claims that are not in the evidence file."].join("\n\n");
}

function questionFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  if (intelligence.openQuestions.length === 0) return "Nothing unresolved was strong enough to list.";
  return intelligence.openQuestions.map((item) => `- ${item.prompt}`).join("\n");
}

function evidenceFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  return intelligence.evidence
    .slice(0, 24)
    .map((item) => `- ${evidenceMark(item)} · ${item.sourceType} · ${item.sourceReference}: ${item.text}`)
    .join("\n");
}

function sectionFields(intelligence: Omit<ProjectIntelligence, "agentPack">, section: string): string {
  const fields = intelligence.understanding.fields.filter((field) => field.section === section);
  if (fields.length === 0) return "Nothing in this section yet.";
  return fields.map((field) => `**${field.label}** (${fieldMark(field)})\n${field.text}`).join("\n\n");
}

function fieldMark(field: UnderstandingField): string {
  if (field.decisionStatus === "approved" && field.epistemicStatus !== "fact") return "approved direction";
  return field.epistemicStatus;
}

function evidenceMark(item: EvidenceRecord): string {
  if (item.claimScope === "published_copy") return "PUBLISHED COPY";
  if (item.decisionStatus === "approved" && item.epistemicStatus !== "fact") return "APPROVED DIRECTION";
  return item.epistemicStatus.toUpperCase();
}

function file(name: string, title: string, markdown: string): AgentFile {
  return { name, title, markdown };
}
