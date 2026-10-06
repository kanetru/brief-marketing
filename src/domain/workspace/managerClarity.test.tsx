import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createProject } from "../../state/projectStore";
import { createSession } from "../../state/createSession";
import { seedDemoWorkspace } from "../project/demoWorkspace";
import { buildProjectIntelligence } from "../project/assemble";
import { DEFAULT_PANEL, MORE_NAV, PRIMARY_NAV } from "./managerNav";
import { competitorViews, opportunityViews, overviewNeedsResearch } from "./managerView";
import { ClientCard } from "../../screens/studio/ProjectList";
import { CompetitorBoard, CompetitorDetail, MarketBoard, OpportunityBoard } from "../../screens/studio/ManagerBoards";
import { ClientOverview } from "../../screens/studio/ClientOverview";
import { marketFacts } from "./plainAnalytics";

const AT = "2026-10-05T12:00:00.000Z";

function north() {
  const project = seedDemoWorkspace(AT).find((item) => item.businessName === "North Workshop");
  if (!project) throw new Error("missing north");
  return project;
}

function fresh() {
  const discovery = createSession(AT);
  discovery.business.description = { state: "evidence", evidence: { raw: "Soil history for farms.", capturedAt: AT } };
  discovery.strategyInputs.neighbours = { state: "evidence", evidence: { raw: "FarmLab, AgriWebb", capturedAt: AT } };
  return createProject({
    clientName: "Field Signal",
    businessName: "Field Signal",
    category: "Soil history",
    discovery,
    discoveryStatus: "submitted",
    now: AT,
  });
}

describe("manager clarity", () => {
  it("opens on four sections and keeps the rest behind More", () => {
    expect(DEFAULT_PANEL).toBe("overview");
    expect(PRIMARY_NAV.map((item) => item.id)).toEqual(["overview", "competitors", "market", "opportunities"]);
    expect(MORE_NAV.map((item) => item.label)).toEqual(["Files", "Content ideas", "Brand", "Contracts", "Notes", "Onboarding", "Responses", "Use in AI", "Client settings"]);
    expect(MORE_NAV.map((item) => item.label)).toContain("Use in AI");
    expect(PRIMARY_NAV.map((item) => item.label).join(" ")).not.toMatch(/Intelligence|Brand|Assets|History/);
  });

  it("renders a bounded client card", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={north()} />
      </MemoryRouter>,
    );
    expect(html).toContain("surface-card");
    expect(html).toContain("5 competitors");
    expect(html).toContain("opportunit");
    expect(html).not.toMatch(/Nothing to watch|has been watching/);
  });

  it("shows the read, competitor cards, market cards, and opportunity cards", () => {
    const project = north();
    const intelligence = buildProjectIntelligence(project, AT);
    const competitors = competitorViews(project, intelligence);
    const overview = renderToStaticMarkup(
      <ClientOverview project={project} onDetails={() => undefined} onSocials={() => undefined} onProfile={() => undefined} />,
    );
    expect(overview).toContain("North Workshop");
    expect(overview).toContain("northworkshop.example");
    expect(overview).toContain("A small workshop making furniture for homes.");
    expect(overview).toContain("Who they sell to");
    expect(overview).toContain("What they want");
    expect(overview).not.toContain("The read");
    expect(overview).not.toContain("What matters now");
    expect(overview).toContain("surface-card");
    const watched = competitors[0];
    const board = renderToStaticMarkup(
      <CompetitorBoard
        views={[
          ...competitors,
          { ...watched!, id: "ref", name: "Reference Co", badge: "REFERENCE" },
          { ...watched!, id: "watch", name: "Watch Co", badge: "WATCH" },
          { ...watched!, id: "emerging", name: "Emerging Co", badge: "EMERGING" },
        ]}
        busy={false}
        failed={false}
        onFind={() => undefined}
        onAdd={() => undefined}
      />,
    );
    expect(board).toContain("competitor-card");
    expect(board).toContain("DIRECT");
    expect(board).toContain("REFERENCE");
    expect(board).toContain("WATCH");
    expect(board).toContain("EMERGING");
    expect(board).toContain('role="button"');
    expect(board).toContain('tabindex="0"');
    expect(board).toContain("View");
    expect(competitors.map((item) => item.name)).toEqual(expect.arrayContaining(["Kiln & Co", "North & Sons", "Late Timber"]));
    const late = competitors.find((item) => item.name === "Late Timber");
    expect(late?.metrics.join(" ")).toMatch(/demo/i);
    expect(late?.stats?.changes.join(" ") ?? "").not.toMatch(/demo sample/i);
    expect(late?.stats?.accounts.every((account) => account.followers === "")).toBe(true);
    expect(late?.stats?.metrics.some((metric) => metric.label === "Followers")).toBe(true);
    expect(late?.themes).not.toMatch(/followers|headline/i);
    const detail = competitors[0];
    expect(detail).toBeTruthy();
    const drawer = renderToStaticMarkup(<CompetitorDetail view={detail!} onClose={() => undefined} />);
    expect(drawer).toContain("competitor-detail");
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain("Social performance");
    expect(drawer).not.toContain("Why they matter");
    const market = renderToStaticMarkup(<MarketBoard facts={marketFacts(project)} />);
    expect(market).toMatch(/market|Market analysis/);
    const opportunities = renderToStaticMarkup(
      <OpportunityBoard items={opportunityViews(project, intelligence)} onSave={() => undefined} onDismiss={() => undefined} />,
    );
    expect(opportunities).toContain("data-testid=\"save-opportunity\"");
    expect(opportunities).toContain("Dismiss");
    expect(opportunities).toContain("surface-card");
  });

  it("keeps an unresearched client obvious and does not call a provider from the boards", () => {
    const project = fresh();
    expect(overviewNeedsResearch(project)).toBe(true);
    const intelligence = buildProjectIntelligence(project, AT);
    const views = competitorViews(project, intelligence);
    expect(views.map((item) => item.badge)).toContain("NAMED");
    expect(views.map((item) => item.name)).toEqual(expect.arrayContaining(["FarmLab", "AgriWebb"]));
    const overview = renderToStaticMarkup(
      <ClientOverview project={project} onDetails={() => undefined} onSocials={() => undefined} onProfile={() => undefined} />,
    );
    expect(overview).toContain("Soil history for farms.");
    expect(overview).not.toContain("The read");
    const emptyMarket = renderToStaticMarkup(<MarketBoard facts={marketFacts(project)} />);
    expect(emptyMarket).toContain("Market analysis will appear after competitor research.");
    const named = renderToStaticMarkup(
      <CompetitorBoard views={views} busy={false} failed={false} onFind={() => undefined} onAdd={() => undefined} />,
    );
    expect(named).toContain("NAMED");
    expect(named).toContain("Find more");
    const emptyCompetitors = renderToStaticMarkup(
      <CompetitorBoard views={[]} busy={false} failed={false} onFind={() => undefined} onAdd={() => undefined} />,
    );
    expect(emptyCompetitors).toContain("No market research yet.");
    expect(emptyCompetitors).toContain("Find competitors");
    const emptyOpportunities = renderToStaticMarkup(
      <OpportunityBoard items={[]} onSave={() => undefined} onDismiss={() => undefined} />,
    );
    expect(emptyOpportunities).toContain("before suggesting opportunities");
    const source = readFileSync(new URL("../../screens/studio/ManagerBoards.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/requestMarketDiscovery|ensembledata/);
    const css = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");
    expect(css).toContain(".card-grid");
    expect(css).toMatch(/max-width: 800px/);
    expect(css).toContain("focus-visible");
  });
});
