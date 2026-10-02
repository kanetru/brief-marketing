import { buildBrandIntelligence } from "../brandIntelligence";
import { adaptiveFollowUps, discoveryProgress, findContradictions, openQuestionsFrom } from "./adaptiveQuestions";
import { buildAgentPack } from "./agentPack";
import { buildAssetRegister } from "./assetRegister";
import { buildUnderstanding, inferenceSeeds } from "./companyUnderstanding";
import { profileCompetitor, synthesiseCategory } from "./competitors";
import { buildEvidenceLedger } from "./evidenceLedger";
import { buildOpportunities } from "./opportunities";
import { compareMarket } from "./research/compare";
import { unavailablePlatformIntelligence } from "./strategy/platform";
import { deriveStrategy } from "./strategy/plan";
import { strategySource } from "./strategy/read";
import { resolveClientBrain } from "./strategist/brain";
import { buildStrategistPacket } from "./strategist/packet";
import { CHANNEL_LABEL } from "./strategy/channels";
import type { BriefProject, CategorySynthesis, ProjectIntelligence } from "../../types/project";

export function buildProjectIntelligence(project: BriefProject, generatedAt = new Date().toISOString()): ProjectIntelligence {
  const seeds = inferenceSeeds(project.discovery);
  const evidence = buildEvidenceLedger(project.discovery, {
    managerNotes: project.managerNotes,
    followUps: project.followUps,
    followUpRequest: project.followUpRequest ?? null,
    competitorNotes: project.competitors.map((item) => ({ id: item.id, name: item.name, notes: item.notes })),
    inferences: seeds,
    overrides: project.overrides,
    learning: project.learning ?? [],
    websiteResearch: project.websiteResearch ?? null,
    competitorResearch: project.competitors
      .map((item) => ({ id: item.id, name: item.name, research: project.competitorResearch?.[item.id] }))
      .filter((item): item is { id: string; name: string; research: NonNullable<typeof item.research> } => Boolean(item.research)),
    updatedAt: project.updatedAt,
  });
  const fields = buildUnderstanding(project.discovery, project.overrides);
  const understanding = { fields };
  const competitors = project.competitors.map((item) => profileCompetitor(item, project.competitorResearch?.[item.id] ?? false));
  const described = fields.find((field) => field.id === "company.what_they_do")?.text ?? "";
  const difference = fields.find((field) => field.id === "market.differentiation")?.text ?? "";
  const audience = fields.find((field) => field.id === "audience.primary")?.text ?? "";
  const offer = fields.find((field) => field.id === "company.offer")?.text ?? "";
  const clientSite = project.websiteResearch?.site ?? null;
  const competitorSites = project.competitors.flatMap((item) => {
    const site = project.competitorResearch?.[item.id]?.site;
    return site && site.pages.length > 0 ? [{ id: item.id, name: item.name || site.businessName, site }] : [];
  });
  const compared = compareMarket({
    businessName: project.businessName,
    discovery: { description: described, audience, difference, offer },
    clientSite,
    competitors: competitorSites,
  });
  const category = mergeCategory(synthesiseCategory(competitors, [described, difference].filter(Boolean).join(" ")), compared);
  const tensions = compared.tensions;
  const opportunities = buildOpportunities(fields, category, project.businessName, tensions);
  const assets = buildAssetRegister(project, fields);
  const contradictions = findContradictions(project.discovery);
  const readingQuestions = buildBrandIntelligence(project.discovery).reading.tomorrow.questions;
  const openQuestions = openQuestionsFrom(project.discovery, adaptiveFollowUps(project.discovery, project.followUps), readingQuestions);
  const strategy = deriveStrategy(
    strategySource(project.discovery, {
      categoryLanguage: category?.languageInCommon ?? [],
      categoryClaims: category?.commonClaims ?? [],
    }),
    unavailablePlatformIntelligence,
    project.overrides,
  );
  const candidateNote = [
    ...strategy.channels.map((item) => `${CHANNEL_LABEL[item.channel]} ${item.priority}: ${item.role}`),
    ...strategy.territories.map((item) => `Territory candidate: ${item.name}. ${item.idea}`),
    ...strategy.roadmap.map((item) => `Roadmap candidate ${item.horizon}: ${item.objective}`),
  ].join("\n");
  const packet = buildStrategistPacket(project, {
    evidence,
    categoryNote: category?.observation,
    competitorLines: competitors.map((item) => `${item.name}: ${item.apparentPositioning || item.unavailableReason || "no read"}`),
    candidateNote,
    contradictions: contradictions.map((item) => item.statement),
  });
  const clientBrain = resolveClientBrain(project.clientReading, packet.hash, project.overrides);
  const partial = {
    projectId: project.id,
    version: project.version,
    generatedAt,
    evidence,
    understanding,
    competitors,
    category,
    tensions,
    opportunities,
    assets,
    library: project.library ?? [],
    openQuestions,
    contradictions,
    strategy,
    clientBrain,
    discoveryProgress: discoveryProgress(project.discovery),
  };
  return { ...partial, agentPack: buildAgentPack(project, partial) };
}

function mergeCategory(
  category: CategorySynthesis | null,
  compared: { patterns: CategorySynthesis["patterns"]; summary: string },
): CategorySynthesis | null {
  if (!category) return null;
  if (compared.patterns.length === 0) return category;
  const covered = compared.patterns.some((item) => item.id === "pattern-process-invisible");
  const kept = covered ? category.patterns.filter((item) => item.id !== "pattern-making-gap") : category.patterns;
  const whiteSpace = [
    ...compared.patterns.filter((item) => item.patternType === "whitespace_hypothesis").map((item) => item.statement),
    ...category.whiteSpace.filter((line) => !(covered && /making is largely absent/i.test(line))),
  ];
  return {
    ...category,
    observation: category.basis === "research" && compared.summary ? compared.summary : category.observation,
    patterns: [...compared.patterns, ...kept],
    whiteSpace,
  };
}

export function projectStatus(project: BriefProject): BriefProject["status"] {
  const progress = discoveryProgress(project.discovery);
  if (progress >= 100) return "review";
  if (progress > 0) return "discovery";
  return project.status === "active" ? "active" : "draft";
}
