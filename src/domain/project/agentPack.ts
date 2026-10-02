import { CHANNEL_LABEL } from "./strategy/channels";
import type { AgentFile, AgentPack, EvidenceRecord, ProjectIntelligence, UnderstandingField } from "../../types/project";
import type { BriefProject } from "../../types/project";
import type { StrategicPlan } from "../../types/strategy";

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
    file("12_channel_strategy.md", "Channel strategy", channelFile(intelligence.strategy)),
    file("13_customer_journey.md", "Customer journey", journeyFile(intelligence.strategy)),
    file("14_marketing_roadmap.md", "Marketing roadmap", roadmapFile(intelligence.strategy)),
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
    strategyPreface(intelligence.strategy),
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
  return [sectionFields(intelligence, "audience"), "", psychologyFile(intelligence.strategy)].join("\n");
}

function positioningFile(intelligence: Omit<ProjectIntelligence, "agentPack">): string {
  const plan = intelligence.strategy;
  const position = [
    "## Social position",
    `${plan.positioning.epistemicStatus} · ${plan.positioning.decisionStatus}`,
    plan.positioning.statement,
    "",
    "The client did not write this. It is a hypothesis until the manager approves it.",
  ].join("\n");
  return [sectionFields(intelligence, "market"), "", sectionFields(intelligence, "brand"), "", position].join("\n");
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
  const plan = intelligence.strategy;
  const territories = plan.territories.map((item) => [
    `### ${item.name}`,
    item.idea,
    `For: ${item.audienceNeed}`,
    `Toward: ${item.purpose}`,
    `Formats: ${item.formats.join(", ") || "Not yet chosen."}`,
    `Needs: ${item.assets.join(", ") || "Unknown."}`,
    `Proof: ${item.proof}`,
    `Risk: ${item.risk}`,
  ].join("\n")).join("\n\n");
  const language = languageBlock(plan);
  const items = intelligence.opportunities.filter((item) => item.type === "content" || item.type === "campaign" || item.type === "format" || item.type === "channel");
  const moves = items.length === 0 ? "" : items.map((item) => `### ${item.title}\n${item.why}\n\nDo: ${item.action}`).join("\n\n");
  return [territories, language, moves].filter(Boolean).join("\n\n");
}

function psychologyFile(plan: StrategicPlan): string {
  const audience = plan.audience;
  const lines = [
    ["Situation", audience.situation],
    ["Afterwards", audience.desiredOutcome],
    ["Hesitation", audience.anxieties],
    ["Alternatives", audience.frustrations],
    ["Must believe", audience.trustSignals],
    ["Awareness", audience.awarenessState === "unknown" ? "" : audience.awarenessState.replaceAll("_", " ")],
    ["What they lean toward", audience.attractionSignals.join(", ")],
  ].filter(([, value]) => value.trim());
  const body = lines.length === 0
    ? "How they decide is still unknown."
    : lines.map(([label, value]) => `**${label}**\n${value}`).join("\n\n");
  return `## How they decide\n\n${body}\n\nNo demographic profile is included. None was evidenced.`;
}

function languageBlock(plan: StrategicPlan): string {
  const groups: Array<[string, string[]]> = [
    ["Owned", plan.language.owned],
    ["Customer", plan.language.customer],
    ["Category", plan.language.category],
    ["Search", plan.language.search],
    ["Clichés", plan.language.cliches],
    ["Avoid", plan.language.avoid],
  ];
  const filled = groups.filter(([, values]) => values.length > 0);
  if (filled.length === 0) return "";
  return ["## Language", ...filled.map(([label, values]) => `**${label}**\n${values.join("; ")}`)].join("\n\n");
}

function channelFile(plan: StrategicPlan): string {
  const groups = ["primary", "secondary", "test", "maintain", "deprioritise", "not_now"] as const;
  return groups.map((priority) => {
    const items = plan.channels.filter((item) => item.priority === priority);
    if (items.length === 0) return "";
    const body = items.map((item) => [
      `### ${CHANNEL_LABEL[item.channel]}`,
      `Role: ${item.role}`,
      `Why: ${item.why}`,
      `For: ${item.forWhom}`,
      `Toward: ${item.goal}`,
      `Strength: ${item.strength}`,
      `Limit: ${item.limitation}`,
      `Success: ${item.success}`,
      item.needs.length ? `Needs: ${item.needs.join("; ")}` : "",
    ].filter(Boolean).join("\n")).join("\n\n");
    return `## ${priority.replace("_", " ")}\n\n${body}`;
  }).filter(Boolean).join("\n\n");
}

function journeyFile(plan: StrategicPlan): string {
  return plan.journey.map((stage) => [
    `### ${stage.stage}`,
    stage.customerState,
    `Tension: ${stage.tension}`,
    `Proof: ${stage.proof}`,
    `Content: ${stage.content}`,
    `Channel: ${stage.channel}`,
  ].join("\n")).join("\n\n");
}

function roadmapFile(plan: StrategicPlan): string {
  return plan.roadmap.map((stage) => [
    `### ${stage.marker} · ${stage.horizon} · ${stage.phase}`,
    stage.objective,
    `Why: ${stage.why}`,
    `Do: ${stage.actions.join("; ")}`,
    `Depends on: ${stage.dependencies.join("; ")}`,
    `Signal: ${stage.success}`,
    `Status: ${stage.status}`,
  ].join("\n")).join("\n\n");
}

function strategyPreface(plan: StrategicPlan): string {
  const roles = plan.channels
    .filter((item) => item.priority === "primary" || item.priority === "secondary")
    .map((item) => `${CHANNEL_LABEL[item.channel]} (${item.priority}): ${item.role}`)
    .join("\n");
  const position = plan.positioning.decisionStatus === "approved"
    ? plan.positioning.statement
    : `${plan.positioning.statement} (${plan.positioning.epistemicStatus}, not yet approved)`;
  return [
    "Strategy in force",
    `Primary goal: ${plan.objective}`,
    `Audience: ${plan.audience.identitySignals || "Not yet named."}`,
    `Positioning: ${position}`,
    roles ? `Channel roles:\n${roles}` : "Channel roles: none derived.",
    `Content territories: ${plan.territories.map((item) => item.name).join("; ") || "None yet."}`,
    `Constraint: ${plan.constraint || "None named."}`,
    `Roadmap priority: ${plan.nextPriority || "Not yet set."}`,
  ].join("\n\n");
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
