import { describe, expect, it } from "vitest";
import { organicFixture } from "../../fixtures/brandFixtures";
import { buildBrandIntelligence } from "../brandIntelligence";
import { textsContainFiller } from "../languageGuard";
import { managerWorkspaceAllowed, resolveSurface } from "./access";
import { buildAgentPack } from "./agentPack";
import { buildProjectIntelligence } from "./assemble";
import { acceptOpportunity, buildOpportunities } from "./opportunities";
import { profileCompetitor, synthesiseCategory } from "./competitors";
import { createProject, projectByToken, touchProject, withCompetitor, withOverride } from "../../state/projectStore";
import type { Opportunity } from "../../types/project";

const AT = "2026-04-01T12:00:00.000Z";

function workshop() {
  return createProject({
    clientName: "North Workshop",
    businessName: "North Workshop",
    category: "Furniture",
    discovery: organicFixture(),
    now: AT,
  });
}

describe("project intelligence", () => {
  it("creates a project and resolves only that share token", () => {
    const first = workshop();
    const second = createProject({ businessName: "Other Room", discovery: organicFixture(), now: AT });
    expect(first.id).not.toBe(second.id);
    expect(first.shareToken).not.toBe(second.shareToken);
    expect(projectByToken([first, second], first.shareToken)?.businessName).toBe("North Workshop");
    expect(projectByToken([first, second], second.shareToken)?.id).toBe(second.id);
    expect(projectByToken([first, second], "missing")).toBeNull();
  });

  it("refuses the manager workspace to a client surface", () => {
    expect(resolveSurface("/studio", "client")).toBe("client");
    expect(resolveSurface("/studio/abc", "client")).toBe("client");
    expect(managerWorkspaceAllowed(resolveSurface("/studio", "client"))).toBe(false);
    expect(resolveSurface("/c/token/start", "manager")).toBe("client");
    expect(managerWorkspaceAllowed(resolveSurface("/c/token/start", "manager"))).toBe(false);
    expect(managerWorkspaceAllowed(resolveSurface("/studio", "manager"))).toBe(true);
  });

  it("keeps client statements and strategist inferences apart", () => {
    const intelligence = buildProjectIntelligence(workshop(), AT);
    const said = intelligence.evidence.find((item) => item.id === "business.description");
    const thought = intelligence.evidence.find((item) => item.id === "inference.central");
    expect(said?.sourceType).toBe("client_statement");
    expect(said?.kind).toBe("fact");
    expect(said?.text).toContain("furniture");
    expect(thought?.sourceType).toBe("strategist_inference");
    expect(thought?.kind === "inference" || thought?.kind === "hypothesis").toBe(true);
    expect(thought?.text).not.toBe(said?.text);
  });

  it("builds company understanding from the evidence", () => {
    const intelligence = buildProjectIntelligence(workshop(), AT);
    const field = intelligence.understanding.fields.find((item) => item.id === "company.what_they_do");
    expect(field?.text).toContain("furniture for homes");
    expect(field?.kind).toBe("fact");
    expect(field?.evidenceIds).toContain("business.description");
  });

  it("lets a manager override a derived statement and regenerates the context", () => {
    const project = workshop();
    const before = buildProjectIntelligence(project, AT);
    const edited = withOverride(project, {
      fieldId: "brand.central_idea",
      text: "The joint is the brief.",
      status: "edited",
      updatedAt: AT,
    });
    const after = buildProjectIntelligence(edited, AT);
    expect(edited.version).toBe(project.version + 1);
    expect(after.understanding.fields.find((item) => item.id === "brand.central_idea")).toMatchObject({
      text: "The joint is the brief.",
      kind: "hypothesis",
      epistemicStatus: "hypothesis",
      decisionStatus: "approved",
      confidence: "medium",
    });
    expect(after.understanding.fields.find((item) => item.id === "brand.central_idea")?.evidenceIds).toContain("manager.override.brand.central_idea");
    expect(before.agentPack.master.markdown).not.toContain("The joint is the brief.");
    expect(after.agentPack.master.markdown).toContain("The joint is the brief.");
    expect(after.agentPack.master.markdown).toContain("approved direction");
    expect(after.agentPack.files.find((file) => file.name === "03_positioning.md")?.markdown).not.toMatch(/Central idea\*\* \(fact\)/);
    expect(after.agentPack.master.markdown).toContain("You are working on marketing for North Workshop.");
    expect(after.agentPack.master.markdown).toContain(`Project version ${edited.version}.`);
    const touched = touchProject(edited, "2026-05-01T00:00:00.000Z");
    const regenerated = buildProjectIntelligence(touched, touched.updatedAt);
    expect(regenerated.agentPack.projectVersion).toBe(edited.version + 1);
    expect(regenerated.agentPack.master.markdown).toContain("2026-05-01T00:00:00.000Z");
    expect(regenerated.agentPack.master.markdown).toContain("The joint is the brief.");
    expect(regenerated.agentPack.master.markdown).toContain("furniture for homes");
  });

  it("proposes an asset register with usable priorities", () => {
    const intelligence = buildProjectIntelligence(workshop(), AT);
    expect(intelligence.assets.length).toBeGreaterThan(0);
    for (const asset of intelligence.assets) {
      expect(["now", "soon", "later"]).toContain(asset.priority);
      expect(["proposed", "approved", "in_progress", "complete"]).toContain(asset.status);
      expect(asset.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("rejects generic opportunity language", () => {
    const planted: Opportunity = {
      id: "bad",
      title: "A modern yet timeless brand",
      type: "positioning",
      why: "Deliver a premium experience and stand out.",
      evidenceIds: [],
      confidence: "low",
      action: "Be purpose-driven.",
      effort: "low",
      impactHypothesis: "Your brand is authentic.",
    };
    expect(acceptOpportunity(planted)).toBe(false);
    const intelligence = buildProjectIntelligence(workshop(), AT);
    const built = buildOpportunities(intelligence.understanding.fields, null, "North Workshop");
    expect(built.length).toBeGreaterThan(0);
    for (const item of built) {
      expect(acceptOpportunity(item)).toBe(true);
      expect(textsContainFiller([`${item.title} ${item.why} ${item.action}`])).toBeNull();
    }
  });

  it("never fabricates competitor research", () => {
    const urlOnly = profileCompetitor({ id: "c1", name: "Oak & Co", website: "https://oak.example", notes: "" }, false);
    expect(urlOnly.basis).toBe("unavailable");
    expect(urlOnly.headline).toBe("");
    expect(urlOnly.apparentPositioning).toBe("");
    expect(urlOnly.audience).toBe("");
    expect(urlOnly.unavailableReason).toMatch(/has not visited/i);
    expect(synthesiseCategory([urlOnly], "speed")).toBeNull();

    const noted = profileCompetitor({ id: "c2", name: "Oak & Co", website: "https://oak.example", notes: "They lead with heritage oak." }, false);
    expect(noted.basis).toBe("manager_notes");
    expect(noted.headline).toBe("");
    expect(noted.apparentPositioning).toBe("They lead with heritage oak.");
    const category = synthesiseCategory([noted], "They stay close to the material.");
    expect(category?.commonClaims).toEqual([]);
    expect(category?.visualSameness).toEqual([]);
    expect(category?.languageInCommon).toEqual([]);
    expect(category?.observation).toMatch(/has not browsed/i);

    const project = withCompetitor(workshop(), { id: "c1", name: "Oak & Co", website: "https://oak.example", notes: "" });
    const intelligence = buildProjectIntelligence(project, AT);
    expect(intelligence.category).toBeNull();
    expect(intelligence.agentPack.files.find((file) => file.name === "06_competitors.md")?.markdown).toMatch(/has not visited/i);
    expect(intelligence.agentPack.files.find((file) => file.name === "06_competitors.md")?.markdown).not.toMatch(/headline:/i);
  });

  it("writes an agent pack from the current project", () => {
    const intelligence = buildProjectIntelligence(workshop(), AT);
    const names = intelligence.agentPack.files.map((file) => file.name);
    expect(names).toEqual([
      "00_README.md",
      "01_company.md",
      "02_audience.md",
      "03_positioning.md",
      "04_voice.md",
      "05_visual_direction.md",
      "06_competitors.md",
      "07_content_strategy.md",
      "08_asset_register.md",
      "09_guardrails.md",
      "10_open_questions.md",
      "11_evidence.md",
    ]);
    expect(intelligence.agentPack.master.name).toBe("BRIEF_CONTEXT.md");
    expect(intelligence.agentPack.master.markdown).toContain("canonical project context");
    expect(intelligence.agentPack.master.markdown).toContain("furniture for homes");
    expect(intelligence.agentPack.master.markdown).toContain("FACT");
    const company = intelligence.agentPack.files.find((file) => file.name === "01_company.md");
    expect(company?.markdown).toContain("furniture for homes");
    const evidence = intelligence.agentPack.files.find((file) => file.name === "11_evidence.md");
    expect(evidence?.markdown).toContain("client_statement");
    expect(evidence?.markdown).toContain("strategist_inference");
    const pack = buildAgentPack(workshop(), intelligence);
    expect(pack.master.markdown).toContain(`Project version ${workshop().version}.`);
  });

  it("still falls back when no strategist reading is stored", () => {
    const reading = buildBrandIntelligence(organicFixture()).reading;
    expect(reading.source).toBe("fallback");
    expect(reading.territories.length).toBeGreaterThanOrEqual(2);
    expect(reading.hypothesis.centralIdea.trim().length).toBeGreaterThan(0);
  });
});
