import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ActionGroup, BadgeRow } from "../../components/ActionGroup";
import { ClientCard } from "../../screens/studio/ProjectList";
import { CompetitorBoard, OpportunityBoard } from "../../screens/studio/ManagerBoards";
import { RemoveClientDialog } from "../../screens/studio/RemoveClient";
import { createProject } from "../../state/projectStore";
import type { LibraryAsset } from "../../types/project";
import { clientInitials, clientLogo } from "./clientLogo";
import type { CompetitorView, OpportunityView } from "./managerView";

const AT = "2026-10-05T12:00:00.000Z";
const css = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");

function asset(patch: Partial<LibraryAsset>): LibraryAsset {
  return {
    id: "asset",
    name: "Logo",
    category: "brand",
    description: "",
    fileRef: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    tags: ["logo"],
    notes: "",
    createdAt: AT,
    updatedAt: AT,
    approval: "accepted",
    relatedOpportunityId: null,
    ...patch,
  };
}

function dirt(library: LibraryAsset[] = []) {
  return {
    ...createProject({ businessName: "DIRT", clientName: "Ada", category: "Land Intelligence", now: AT }),
    library,
  };
}

describe("client logos on studio cards", () => {
  it("uses the client library logo and keeps the card as the click target", () => {
    const project = dirt([asset({ fileRef: "data:image/png;base64,DIRTLOGO", name: "Primary logo", tags: ["logo", "primary"] })]);
    expect(clientLogo(project)?.src).toBe("data:image/png;base64,DIRTLOGO");
    expect(clientLogo(project)?.variant).toBe("primary");
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={project} />
      </MemoryRouter>,
    );
    const link = html.slice(html.indexOf("<a "), html.indexOf("</a>"));
    expect(link).toContain(`href="/studio/${project.id}"`);
    expect(link).toContain('data-logo="image"');
    expect(link).toContain('src="data:image/png;base64,DIRTLOGO"');
    expect(link).toContain("DIRT");
    expect(link).toContain("Land Intelligence");
  });

  it("falls back to initials when no logo exists", () => {
    expect(clientInitials("DIRT")).toBe("DI");
    expect(clientInitials("North Workshop")).toBe("NW");
    expect(clientLogo(dirt())).toBeNull();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={dirt()} />
      </MemoryRouter>,
    );
    expect(html).toContain('data-logo="fallback"');
    expect(html).toContain("DI");
    expect(html).not.toContain("<img");
  });

  it("ignores a filename that is not an image url", () => {
    const project = dirt([asset({ name: "Logo", fileRef: "logo.png", tags: ["logo"] })]);
    expect(clientLogo(project)).toBeNull();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={project} />
      </MemoryRouter>,
    );
    expect(html).toContain('data-logo="fallback"');
    expect(html).not.toContain("logo.png");
    expect(html).not.toContain("<img");
    expect(html).toContain("DIRT");
  });

  it("prefers the primary logo on a light card and the dark logo on a dark surface", () => {
    const project = dirt([
      asset({ id: "dark", name: "Dark logo", tags: ["logo-dark"], fileRef: "data:image/png;base64,DARK" }),
      asset({ id: "light", name: "Primary logo", tags: ["logo", "primary"], fileRef: "data:image/png;base64,LIGHT" }),
      asset({ id: "photo", name: "Bench", category: "photo_video", tags: [], fileRef: "data:image/png;base64,PHOTO" }),
    ]);
    expect(clientLogo(project, "light")?.src).toBe("data:image/png;base64,LIGHT");
    expect(clientLogo(project, "dark")?.src).toBe("data:image/png;base64,DARK");
  });
});

describe("action spacing", () => {
  const view: CompetitorView = {
    id: "kiln",
    name: "Kiln & Co",
    badge: "DIRECT",
    platforms: "Instagram",
    owns: "Finished rooms",
    themes: "Timber",
    change: "New series",
    metrics: ["18.4k followers"],
    summary: "A workshop",
    why: "They sell the same room",
    positioning: "Craft",
    posts: [],
    language: "",
    social: "",
    evidence: "",
  };
  const opportunity: OpportunityView = {
    id: "opp",
    index: "01",
    title: "Show the joint",
    why: "The work is in the making",
    move: "Film the bench",
    could: "A short series",
    saved: false,
  };

  it("wraps action groups and keeps modal actions in a separated footer", () => {
    const group = renderToStaticMarkup(
      <ActionGroup>
        <button type="button">Save</button>
        <button type="button">Dismiss</button>
      </ActionGroup>,
    );
    expect(group).toContain('class="action-group"');
    const dialog = renderToStaticMarkup(
      <RemoveClientDialog name="DIRT" typed="" onCancel={() => undefined} onConfirm={() => undefined} />,
    );
    expect(dialog).toContain("action-footer");
    expect(dialog).toContain("Remove client");
    expect(dialog).toContain("Cancel");
    expect(dialog).toContain("layer-body");
    expect(css).toMatch(/\.action-group,\s*\n\.studio-row \{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.action-group,\s*\n\.studio-row \{[\s\S]*gap:\s*var\(--action-gap\)/);
    expect(css).toMatch(/\.action-footer \{[\s\S]*border-top:/);
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toMatch(/@media \(max-width: 520px\) \{[\s\S]*\.action-footer \{[\s\S]*flex-direction:\s*column/);
  });

  it("wraps badges and keeps competitor and opportunity actions reachable", () => {
    const badges = renderToStaticMarkup(
      <BadgeRow>
        <p className="card-badge">DIRECT</p>
        <p className="card-badge">LIVE</p>
      </BadgeRow>,
    );
    expect(badges).toContain('class="badge-row"');
    expect(css).toMatch(/\.badge-row \{[\s\S]*flex-wrap:\s*wrap/);
    const competitors = renderToStaticMarkup(
      <CompetitorBoard views={[view]} busy={false} failed={false} onFind={() => undefined} onAdd={() => undefined} />,
    );
    expect(competitors).toContain("badge-row");
    expect(competitors).toContain("DIRECT");
    expect(competitors).toContain('role="button"');
    expect(competitors).toContain('tabindex="0"');
    expect(competitors).toContain("card-actions");
    expect(competitors).toContain("View");
    expect(competitors).toContain("Find more");
    const opportunities = renderToStaticMarkup(
      <OpportunityBoard items={[opportunity]} onSave={() => undefined} onDismiss={() => undefined} />,
    );
    expect(opportunities).toContain("action-group card-actions");
    expect(opportunities).toContain("data-testid=\"save-opportunity\"");
    expect(opportunities).toContain("Dismiss");
  });

  it("lets the manager nav wrap and keeps keyboard focus visible", () => {
    expect(css).toMatch(/@media \(max-width: 800px\) \{[\s\S]*\.studio-nav \{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.studio-nav \{[\s\S]*gap:\s*0\.7rem var\(--action-gap-x\)/);
    expect(css).toContain("focus-visible");
    expect(css).toMatch(/\.studio-nav button:focus-visible[\s\S]*outline:\s*2px solid/);
    expect(css).toMatch(/\.client-mark img \{[\s\S]*object-fit:\s*contain/);
    expect(css).not.toMatch(/\.studio-nav button[\s\S]{0,180}font-size:\s*0\.6rem/);
  });
});
