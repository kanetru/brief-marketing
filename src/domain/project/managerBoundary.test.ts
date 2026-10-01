import { describe, expect, it } from "vitest";
import { organicFixture } from "../../fixtures/brandFixtures";
import { buildBrandIntelligence } from "../brandIntelligence";
import { adaptiveFollowUps } from "./adaptiveQuestions";
import { attentionLine, needsAttention } from "./attention";
import { CLIENT_SECTIONS, clientCanSeeIntelligence, clientContribution, clientDestination, completionMessage } from "./clientAccess";
import { learningPrompts } from "./learning";
import { extractPageObservations } from "./pageExtract";
import { DEMO_ACCOUNT } from "./account";
import { managerWorkspaceAllowed, resolveSurface } from "./access";
import { buildProjectIntelligence } from "./assemble";
import { profileCompetitor, synthesiseCategory } from "./competitors";
import { seedDemoWorkspace } from "./demoWorkspace";
import { acceptOpportunity } from "./opportunities";
import {
  coerceProject,
  completeFollowUp,
  createProject,
  inviteDiscovery,
  projectByToken,
  requestFollowUp,
  submitDiscovery,
  withCompetitor,
  withCompetitorResearch,
  withDiscovery,
  withLibraryAsset,
  withOverride,
  withWebsiteResearch,
} from "../../state/projectStore";
import type { StoredResearch } from "../../types/project";

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

const PAGE = `<html><head><title>North Workshop</title><meta name="description" content="Furniture from the bench."></head><body><h1>Made in the workshop</h1><p>Benches, tables, and the joint you can see.</p><a href="/visit">Book a visit</a></body></html>`;

describe("manager and client boundary", () => {
  it("lets a token open only that project's discovery", () => {
    const first = workshop();
    const second = workshop();
    expect(projectByToken([first, second], first.shareToken)?.id).toBe(first.id);
    expect(projectByToken([first, second], second.shareToken)?.id).not.toBe(first.id);
    expect(CLIENT_SECTIONS).not.toContain("profile");
    expect(clientDestination("in_progress")).toBe("discovery");
  });

  it("keeps the client out of the studio, the intelligence, and the agent pack", () => {
    expect(resolveSurface("/studio", "client")).toBe("client");
    expect(managerWorkspaceAllowed(resolveSurface("/studio", "client"))).toBe(false);
    expect(clientCanSeeIntelligence("strategy")).toBe(false);
    expect(clientCanSeeIntelligence("agent_pack")).toBe(false);
    expect(clientCanSeeIntelligence("evidence")).toBe(false);
    expect(clientCanSeeIntelligence("understanding")).toBe(false);
    const message = completionMessage(DEMO_ACCOUNT.name);
    expect(`${message.title} ${message.body} ${message.next}`).not.toMatch(/opportunit|competitor|agent pack|territor/i);
    expect(message.body).toContain("Jane Smith");
  });

  it("ends submitted discovery on a completion state and lets the manager ask a follow-up", () => {
    const sent = inviteDiscovery(workshop(), AT);
    expect(sent.discoveryStatus).toBe("invited");
    expect(sent.history.map((event) => event.kind)).toContain("discovery_sent");
    const submitted = submitDiscovery(sent, AT);
    expect(submitted.discoveryStatus).toBe("submitted");
    expect(clientDestination(submitted.discoveryStatus)).toBe("complete");
    const given = clientContribution(submitted.discovery);
    expect(given.answered).toBeGreaterThan(0);
    const followed = requestFollowUp(submitted, [{ id: "ask-making", prompt: "Is the making the part you'd keep?" }], AT);
    expect(followed.discoveryStatus).toBe("follow_up_requested");
    expect(clientDestination(followed.discoveryStatus)).toBe("follow_up");
    const done = completeFollowUp(followed, { "ask-making": "Yes. The joint." }, AT);
    expect(done.discoveryStatus).toBe("follow_up_complete");
    expect(clientDestination(done.discoveryStatus)).toBe("complete");
    const intelligence = buildProjectIntelligence(done, AT);
    expect(intelligence.evidence.some((item) => item.text.includes("The joint."))).toBe(true);
  });

  it("remembers client intelligence for the manager who comes back", () => {
    const edited = withOverride(workshop(), {
      fieldId: "brand.central_idea",
      text: "The joint is the brief.",
      status: "edited",
      updatedAt: AT,
    }, AT);
    const stored = coerceProject(JSON.parse(JSON.stringify(edited)));
    expect(stored?.businessName).toBe("North Workshop");
    const intelligence = buildProjectIntelligence(stored ?? edited, AT);
    expect(intelligence.understanding.fields.find((field) => field.id === "brand.central_idea")?.text).toBe("The joint is the brief.");
    expect(intelligence.agentPack.master.markdown).toContain("The joint is the brief.");
    expect(intelligence.agentPack.projectVersion).toBe(edited.version);
  });

  it("does not turn a manager edit into a fact, and keeps source, epistemic status, and decision apart", () => {
    const project = withOverride(workshop(), {
      fieldId: "brand.central_idea",
      text: "The joint is the brief.",
      status: "approved",
      updatedAt: AT,
    }, AT);
    const intelligence = buildProjectIntelligence(project, AT);
    const field = intelligence.understanding.fields.find((item) => item.id === "brand.central_idea");
    const said = intelligence.evidence.find((item) => item.id === "business.description");
    const decision = intelligence.evidence.find((item) => item.id === "manager.override.brand.central_idea");
    expect(field).toMatchObject({ epistemicStatus: "hypothesis", decisionStatus: "approved", kind: "hypothesis" });
    expect(said).toMatchObject({ sourceType: "client_statement", epistemicStatus: "fact", decisionStatus: "accepted" });
    expect(decision).toMatchObject({ sourceType: "manager_statement", epistemicStatus: "hypothesis", decisionStatus: "approved" });
    expect(decision?.epistemicStatus).not.toBe(decision?.decisionStatus);
    expect(intelligence.agentPack.master.markdown).toContain("approved direction");
    expect(intelligence.agentPack.master.markdown).toContain("FACT");
  });

  it("keeps website copy as published evidence with provenance, not as a business fact", () => {
    const observation = extractPageObservations(PAGE, "https://northworkshop.example", AT);
    expect(observation.headline).toBe("Made in the workshop");
    expect(observation.callsToAction).toContain("Book a visit");
    const missing = extractPageObservations("<html><body><p></p></body></html>", "https://empty.example", AT);
    expect(missing.headline).toBe("");
    const research: StoredResearch = { url: observation.url, retrievedAt: AT, observation, unavailableReason: "" };
    const project = withWebsiteResearch(workshop(), research, AT);
    const intelligence = buildProjectIntelligence(project, AT);
    const headline = intelligence.evidence.find((item) => item.id === "website.headline");
    expect(headline).toMatchObject({
      sourceType: "website_research",
      epistemicStatus: "inference",
      claimScope: "published_copy",
      url: "https://northworkshop.example",
      retrievedAt: AT,
    });
    expect(headline?.epistemicStatus).not.toBe("fact");
    expect(intelligence.understanding.fields.some((field) => field.text.includes("Made in the workshop"))).toBe(false);
    expect(intelligence.agentPack.master.markdown).toContain("PUBLISHED COPY");
  });

  it("does not invent competitor fields when research is missing", () => {
    const failed: StoredResearch = { url: "https://oak.example", retrievedAt: AT, observation: null, unavailableReason: "Research is unavailable." };
    const profile = profileCompetitor({ id: "c1", name: "Oak & Co", website: "https://oak.example", notes: "" }, failed);
    expect(profile.basis).toBe("unavailable");
    expect(profile.headline).toBe("");
    expect(profile.apparentPositioning).toBe("");
    expect(profile.audience).toBe("");
    expect(profile.offer).toBe("");
    expect(profile.unavailableReason).toMatch(/unavailable|not invented|no page/i);
    const forced = profileCompetitor({ id: "c1", name: "Oak & Co", website: "https://oak.example", notes: "" }, true);
    expect(forced.basis).toBe("unavailable");
    expect(forced.headline).toBe("");
    expect(synthesiseCategory([profile, forced], "They make it slowly.")).toBeNull();
  });

  it("synthesises category patterns only from evidence that exists", () => {
    const one = profileCompetitor({ id: "c1", name: "Oak", website: "", notes: "They lead with craftsmanship." }, false);
    const alone = synthesiseCategory([one], "A workshop making furniture.");
    expect(alone?.patterns).toEqual([]);
    expect(alone?.commonClaims).toEqual([]);
    expect(alone?.observation).toMatch(/has not browsed/i);

    const two = profileCompetitor({ id: "c2", name: "Elm", website: "", notes: "Craftsmanship and finished interiors." }, false);
    const both = synthesiseCategory([one, two], "A small workshop making furniture.");
    expect(both?.patterns.length).toBeGreaterThan(0);
    const claim = both?.patterns.find((pattern) => pattern.id === "pattern-craftsmanship");
    expect(claim?.statement).toContain("2 of 2");
    expect(claim?.statement).not.toContain("4 of 5");
    expect(claim?.evidenceIds.length).toBeGreaterThan(0);
    expect(both?.patterns.some((pattern) => pattern.id === "pattern-making-gap")).toBe(true);
    expect(both?.whiteSpace[0]).toMatch(/hypothesis/i);
  });

  it("cites evidence on every opportunity and can ask to show the making", () => {
    const noted = withCompetitor(workshop(), { id: "c1", name: "Oak", website: "", notes: "Finished interiors and craftsmanship." });
    const second = withCompetitor(noted, { id: "c2", name: "Elm", website: "", notes: "Craftsmanship across finished interiors." });
    const intelligence = buildProjectIntelligence(second, AT);
    expect(intelligence.opportunities.length).toBeGreaterThan(0);
    for (const item of intelligence.opportunities) {
      expect(item.evidenceIds.length).toBeGreaterThan(0);
      expect(acceptOpportunity(item)).toBe(true);
      expect(`${item.title} ${item.action}`.toLowerCase()).not.toContain("behind-the-scenes");
    }
    expect(intelligence.opportunities.some((item) => item.id === "opp-making")).toBe(true);
    const making = intelligence.opportunities.find((item) => item.id === "opp-making");
    expect(making?.evidenceIds).toContain("business.description");
  });

  it("keeps the asset register and the asset library distinct", () => {
    const held = withLibraryAsset(workshop(), {
      id: "lib-joint",
      name: "workshop-joint-01.jpg",
      category: "photo_video",
      description: "A joint.",
      fileRef: "workshop-joint-01.jpg",
      tags: ["process"],
      notes: "",
      createdAt: AT,
      updatedAt: AT,
      approval: "accepted",
      relatedOpportunityId: null,
    }, AT);
    const intelligence = buildProjectIntelligence(held, AT);
    expect(intelligence.assets.length).toBeGreaterThan(0);
    expect(intelligence.library.map((item) => item.id)).toEqual(["lib-joint"]);
    expect(intelligence.assets.some((item) => item.id === "lib-joint")).toBe(false);
    expect(intelligence.agentPack.files.find((file) => file.name === "08_asset_register.md")?.markdown).toContain("SHOULD EXIST");
    expect(intelligence.agentPack.files.find((file) => file.name === "08_asset_register.md")?.markdown).toContain("workshop-joint-01.jpg");
  });

  it("builds the agent pack from canonical manager state and still falls back without a strategist", () => {
    const project = withWebsiteResearch(workshop(), {
      url: "https://northworkshop.example",
      retrievedAt: AT,
      observation: extractPageObservations(PAGE, "https://northworkshop.example", AT),
      unavailableReason: "",
    }, AT);
    const intelligence = buildProjectIntelligence(project, AT);
    expect(intelligence.agentPack.master.markdown).toContain("canonical project context");
    expect(intelligence.agentPack.master.markdown).toContain(`Project version ${project.version}.`);
    expect(intelligence.agentPack.master.markdown).toContain("furniture for homes");
    expect(intelligence.agentPack.master.markdown).toContain("An approved direction is a decision");
    const reading = buildBrandIntelligence(organicFixture()).reading;
    expect(reading.source).toBe("fallback");
    expect(reading.territories.length).toBeGreaterThanOrEqual(2);
  });

  it("bounds follow-up and reflects learning without opening the workspace", () => {
    const prompts = adaptiveFollowUps(organicFixture(), []);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.length).toBeLessThanOrEqual(5);
    expect(prompts.some((item) => item.id === "ask-strong")).toBe(true);
    expect(prompts.some((item) => item.id === "ask-making")).toBe(true);
    expect(prompts.some((item) => item.id === "ask-audience")).toBe(false);
    const learning = learningPrompts(organicFixture());
    expect(learning.length).toBeGreaterThan(0);
    expect(learning.length).toBeLessThanOrEqual(2);
    expect(learning.some((item) => /territor|competitor|opportunit/i.test(item.statement))).toBe(false);
  });

  it("does not record a history event for every discovery keystroke", () => {
    const project = workshop();
    const once = withDiscovery(project, project.discovery, AT);
    const twice = withDiscovery(once, once.discovery, AT);
    expect(twice.history).toHaveLength(project.history.length);
    expect(twice.version).toBe(project.version + 2);
    expect(twice.discoveryStatus).toBe("in_progress");
  });

  it("stores retrieved competitor pages as research and leaves gaps empty", () => {
    const observation = extractPageObservations(PAGE, "https://oak.example", AT);
    const research: StoredResearch = { url: observation.url, retrievedAt: AT, observation, unavailableReason: "" };
    const project = withCompetitorResearch(
      withCompetitor(workshop(), { id: "c1", name: "Oak", website: "https://oak.example", notes: "" }, AT),
      "c1",
      research,
      AT,
    );
    const intelligence = buildProjectIntelligence(project, AT);
    const profile = intelligence.competitors[0];
    expect(profile?.basis).toBe("research");
    expect(profile?.headline).toBe("Made in the workshop");
    expect(profile?.audience).toBe("");
    expect(profile?.offer).toBe("");
    const page = intelligence.evidence.find((item) => item.id === "competitor.c1.page.headline");
    expect(page?.claimScope).toBe("published_copy");
    expect(page?.epistemicStatus).not.toBe("fact");
    expect(project.history.some((event) => event.kind === "competitor_researched")).toBe(true);
  });

  it("seeds a manager practice and points attention at submitted discovery", () => {
    const projects = seedDemoWorkspace(AT);
    expect(projects.map((project) => project.workspaceId).every((id) => id === DEMO_ACCOUNT.workspaceId)).toBe(true);
    const north = projects.find((project) => project.businessName === "North Workshop");
    expect(north?.discoveryStatus).toBe("submitted");
    expect(needsAttention(north ?? projects[0])).toBe(true);
    const intelligence = buildProjectIntelligence(north ?? projects[0], AT);
    expect(attentionLine(north ?? projects[0], intelligence)).toMatch(/ready for review/i);
    expect(intelligence.library.some((item) => item.name === "workshop-joint-01.jpg")).toBe(true);
    expect(intelligence.assets.some((item) => item.name === "workshop-joint-01.jpg")).toBe(false);
    expect(intelligence.category).not.toBeNull();
    const kiln = projects.find((project) => project.businessName === "Kiln & Co");
    expect(kiln?.discoveryStatus).toBe("in_progress");
    expect(needsAttention(kiln ?? projects[0])).toBe(false);
  });
});
