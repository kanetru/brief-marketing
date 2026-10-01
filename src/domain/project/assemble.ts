import { buildBrandIntelligence } from "../brandIntelligence";
import { adaptiveFollowUps, discoveryProgress, findContradictions, openQuestionsFrom } from "./adaptiveQuestions";
import { buildAgentPack } from "./agentPack";
import { buildAssetRegister } from "./assetRegister";
import { buildUnderstanding, inferenceSeeds } from "./companyUnderstanding";
import { profileCompetitor, synthesiseCategory } from "./competitors";
import { buildEvidenceLedger } from "./evidenceLedger";
import { buildOpportunities } from "./opportunities";
import type { BriefProject, ProjectIntelligence } from "../../types/project";

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
  const category = synthesiseCategory(competitors, [described, difference].filter(Boolean).join(" "));
  const opportunities = buildOpportunities(fields, category, project.businessName);
  const assets = buildAssetRegister(project, fields);
  const contradictions = findContradictions(project.discovery);
  const readingQuestions = buildBrandIntelligence(project.discovery).reading.tomorrow.questions;
  const openQuestions = openQuestionsFrom(project.discovery, adaptiveFollowUps(project.discovery, project.followUps), readingQuestions);
  const partial = {
    projectId: project.id,
    version: project.version,
    generatedAt,
    evidence,
    understanding,
    competitors,
    category,
    opportunities,
    assets,
    library: project.library ?? [],
    openQuestions,
    contradictions,
    discoveryProgress: discoveryProgress(project.discovery),
  };
  return { ...partial, agentPack: buildAgentPack(project, partial) };
}

export function projectStatus(project: BriefProject): BriefProject["status"] {
  const progress = discoveryProgress(project.discovery);
  if (progress >= 100) return "review";
  if (progress > 0) return "discovery";
  return project.status === "active" ? "active" : "draft";
}
