import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { adjacentSection, isParked } from "../sections";
import { normaliseHandle } from "../socialHandle";
import { briefReply } from "./briefing";
import { groundedOpportunityViews } from "./groundedOpportunities";
import { competitorViews } from "./managerView";
import { positioningRead } from "./positioning";
import { buildProjectIntelligence } from "../project/assemble";
import { createProject, submitDiscovery } from "../../state/projectStore";
import { emptyMarketDiscovery } from "../market/review";
import { createSession } from "../../state/createSession";
import { ProjectProvider } from "../../state/ProjectContext";
import { ProjectList } from "../../screens/studio/ProjectList";
import { AskBrief } from "../../screens/studio/AskBrief";
import { ClientOnboardingSection } from "../../screens/studio/OnboardingAccess";
import { DEMO_ACCOUNT } from "../project/account";
import type { BriefProject } from "../../types/project";

const AT = "2026-10-06T00:00:00.000Z";

describe("active onboarding", () => {
  it("skips visual, colour, and type on the way through", () => {
    expect(isParked("visual")).toBe(true);
    expect(isParked("colour")).toBe(true);
    expect(isParked("type")).toBe(true);
    expect(isParked("imagery")).toBe(true);
    expect(adjacentSection("reality", 1)).toBe("inspiration");
    expect(adjacentSection("welcome", 1)).toBe("business");
    const source = readFileSync(new URL("../../screens/strategySteps.tsx", import.meta.url), "utf8");
    expect(source).toContain("Where can we find you?");
    expect(source).toContain("Instagram");
    expect(source).toContain("TikTok");
    expect(source).not.toMatch(/requestMarketDiscovery|ensembledata/);
    const social = readFileSync(new URL("../socialHandle.ts", import.meta.url), "utf8");
    expect(social).not.toMatch(/fetch\(|ensembledata/);
  });

  it("normalises instagram and tiktok handles and allows an empty one", () => {
    expect(normaliseHandle("@dirt.land")).toEqual({ handle: "dirt.land", valid: true });
    expect(normaliseHandle("https://www.tiktok.com/@dirtland")).toEqual({ handle: "dirtland", valid: true });
    expect(normaliseHandle("")).toEqual({ handle: "", valid: true });
    expect(normaliseHandle("not a handle!")).toEqual({ handle: "", valid: false });
  });

  it("keeps a finished project open after the visual stages are parked", () => {
    const discovery = createSession(AT);
    discovery.progress = { section: "complete", furthest: "complete", steps: discovery.progress.steps };
    discovery.business.description = { state: "evidence", evidence: { raw: "Land intelligence for growers.", capturedAt: AT } };
    discovery.visualPreferences.comparisons[0] = {
      ...discovery.visualPreferences.comparisons[0]!,
      choice: { state: "selected", value: "a", capturedAt: AT },
    };
    const project = createProject({ businessName: "DIRT", discovery, discoveryStatus: "submitted", now: AT });
    expect(project.discovery.progress.section).toBe("complete");
    expect(project.discovery.visualPreferences.comparisons[0]?.choice.state).toBe("selected");
    expect(project.businessName).toBe("DIRT");
  });
});

describe("onboarding link", () => {
  it("asks for a business and offers copy, preview, and open", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProjectProvider>
          <ProjectList />
        </ProjectProvider>
      </MemoryRouter>,
    );
    expect(html).toContain(`Welcome, ${DEMO_ACCOUNT.name.split(" ")[0]}`);
    expect(html).toContain("+ Onboard new client");
    expect(html).toContain("Make Brief your own");
    expect(html).toContain("Actions for");
  });
});

describe("positioning and briefing", () => {
  it("grounds positioning and a follow-up in the client, and refuses invented growth", () => {
    const discovery = createSession(AT);
    discovery.business.description = { state: "evidence", evidence: { raw: "Ten years of land history.", capturedAt: AT } };
    discovery.business.differentiation = { state: "evidence", evidence: { raw: "Historical context, not a weekly snapshot.", capturedAt: AT } };
    discovery.strategyInputs.presence = { instagram: "dirt.land", tiktok: "", website: "https://dirt.land", note: "" };
    let project = createProject({ businessName: "DIRT", discovery, now: AT });
    project = submitDiscovery(project, AT);
    expect(project.socials?.map((item) => item.handle)).toContain("dirt.land");
    expect(project.website).toContain("dirt.land");
    const cards = positioningRead(project);
    expect(cards.map((card) => card.title).join(" ")).toMatch(/own/i);
    const first = briefReply(project, [], "What is DIRT's strongest positioning opportunity?");
    expect(first.text).toMatch(/Historical context/);
    expect(first.basis).toMatch(/onboarding|competitors/);
    const ideas = briefReply(project, [{ role: "brief", text: first.text }], "Give me three content ideas for that.");
    expect(ideas.ideas).toHaveLength(3);
    const growth = briefReply(project, [], "Which competitor is growing fastest?");
    expect(growth.text).toMatch(/don't have enough follower history/i);
    const files = briefReply({ ...project, library: [{ id: "f", name: "2026 Agreement.pdf", category: "proof", description: "", fileRef: "", tags: [], notes: "", createdAt: AT, updatedAt: AT, approval: "unreviewed", relatedOpportunityId: null }] } as BriefProject, [], "Does the plan match the contract?");
    expect(files.text).toMatch(/has not read/);
  });

  it("attaches researched metrics to a named competitor and writes a grounded opportunity", () => {
    const discovery = createSession(AT);
    discovery.business.differentiation = { state: "evidence", evidence: { raw: "Historical context, not a weekly snapshot.", capturedAt: AT } };
    discovery.strategyInputs.neighbours = { state: "evidence", evidence: { raw: "FarmLab", capturedAt: AT } };
    const project = {
      ...createProject({ businessName: "DIRT", discovery, now: AT }),
      profile: { description: "Land intelligence.", audience: "Growers", goal: "Be chosen for the long view", offers: [{ name: "Soil history", description: "Ten years of paddock context", priceLabel: "From $240" }] },
      marketDiscovery: {
        ...emptyMarketDiscovery(AT),
        origin: "live" as const,
        candidates: [{
          id: "farmlab",
          platform: "instagram" as const,
          handle: "farmlab",
          displayName: "FarmLab",
          bio: "Soil testing.",
          profileUrl: "https://instagram.com/farmlab",
          website: "",
          followers: 18400,
          following: null,
          recentPosts: [{
            platform: "instagram" as const,
            postId: "1",
            accountId: "farmlab",
            publishedAt: "2026-10-01T00:00:00.000Z",
            caption: "How a soil test changes the next season",
            hashtags: ["Soil"],
            mentions: [],
            mediaType: "image" as const,
            likes: 120,
            comments: 14,
            views: null,
            shares: null,
            url: null,
            retrievedAt: AT,
          }],
          sourceQueries: [],
          discoveryFrequency: 1,
          providerStatus: "live" as const,
          retrievedAt: AT,
          clientClaim: "",
          enriched: true,
        }],
      },
    };
    const view = competitorViews(project, buildProjectIntelligence(project, AT)).find((item) => item.name === "FarmLab");
    expect(view?.stats?.accounts.some((account) => account.followers.includes("18"))).toBe(true);
    expect(view?.stats?.topPosts.some((post) => /soil test/i.test(post.text))).toBe(true);
    const opportunities = groundedOpportunityViews(project);
    expect(opportunities[0]?.title).toMatch(/historical context/i);
    expect(opportunities.map((item) => item.why).join(" ")).toMatch(/Soil/);
    expect(opportunities[0]?.could).toMatch(/Campaign/);
  });

  it("opens Ask Brief with the client name", () => {
    const project = createProject({ businessName: "DIRT", now: AT });
    const html = renderToStaticMarkup(
      <AskBrief project={project} open seed="" onClose={() => undefined} onMessages={() => undefined} onSaveIdea={() => undefined} onNote={() => undefined} />,
    );
    expect(html).toContain("Ask me anything about DIRT");
    expect(html).toContain("positioning opportunity");
    expect(html).toContain('data-screen="ask-brief"');
    expect(html).toContain('aria-modal="true"');
    const ready = renderToStaticMarkup(
      <MemoryRouter>
        <ClientOnboardingSection project={project} heading="Your client onboarding is ready." onCopy={() => undefined} onSend={() => undefined} onViewResponses={() => undefined} />
      </MemoryRouter>,
    );
    expect(ready).toContain("Copy link");
    expect(ready).toContain("Preview");
    expect(ready).toContain("Open as client");
    expect(ready).not.toContain("Mark as sent");
    expect(ready).not.toMatch(/>\/c\//);
    const css = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");
    expect(css).toContain("prefers-reduced-motion");
  });
});
