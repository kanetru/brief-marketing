import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AGENCY_KEY, demoAgencyBrand, loadBrands, saveBrands } from "../agency/brand";
import { PROJECTS_KEY, projectByToken } from "../../state/projectStore";
import { ProjectProvider } from "../../state/ProjectContext";
import { SessionProvider } from "../../state/SessionContext";
import { ClientProjectGate } from "../../screens/studio/gates";
import { ProjectList } from "../../screens/studio/ProjectList";
import { ProjectWorkspace } from "../../screens/studio/ProjectWorkspace";
import { RemoveClientDialog, RemoveClientSection } from "../../screens/studio/RemoveClient";
import { emptyMarketDiscovery } from "../market/review";
import { clientRemovalName, nameMatches, withoutProject } from "./removeClient";
import { createProject } from "../../state/projectStore";

const NOW = "2026-10-05T12:00:00.000Z";

describe("client removal", () => {
  it("requires the exact client name and leaves Cancel as a separate action", () => {
    expect(clientRemovalName({ businessName: "DIRT", clientName: "Ada" })).toBe("DIRT");
    expect(clientRemovalName({ businessName: "  ", clientName: "" })).toBe("Untitled");
    expect(nameMatches("DIRT", "DIRT")).toBe(true);
    expect(nameMatches("DIRT", " DIRT ")).toBe(true);
    expect(nameMatches("DIRT", "dirt")).toBe(false);
    expect(nameMatches("DIRT", "")).toBe(false);
    const blocked = renderToStaticMarkup(<RemoveClientDialog name="DIRT" typed="dirt" onCancel={() => undefined} onConfirm={() => undefined} />);
    expect(blocked).toContain("Remove DIRT?");
    expect(blocked).toContain("Type DIRT to confirm");
    expect(blocked).toContain("This cannot be undone.");
    expect(blocked).toContain("disabled");
    expect(blocked).toContain("Cancel");
    const ready = renderToStaticMarkup(<RemoveClientDialog name="DIRT" typed="DIRT" onCancel={() => undefined} onConfirm={() => undefined} />);
    expect(ready).not.toContain("disabled");
    const section = renderToStaticMarkup(<RemoveClientSection name="DIRT" onRemove={() => undefined} />);
    expect(section).toContain("Remove client");
    expect(section).toContain("Permanently remove this client and their Brief data.");
    expect(section).not.toContain("Remove DIRT?");
    const source = readFileSync(new URL("../../screens/studio/RemoveClient.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("window.confirm");
  });

  it("removes the client record and leaves the other client, the workspace, and agency branding", () => {
    const dirt = {
      ...createProject({ businessName: "DIRT", clientName: "Ada", now: NOW, discoveryStatus: "submitted" }),
      competitors: [{ id: "c1", name: "FarmLab", website: "", notes: "Named" }],
      library: [],
      marketDiscovery: {
        ...emptyMarketDiscovery(NOW),
        origin: "live" as const,
        candidates: [],
        message: "",
      },
      history: [{ at: NOW, version: 1, kind: "project_created" as const, note: "Project created" }],
    };
    const other = createProject({ businessName: "North Workshop", now: NOW });
    const brand = demoAgencyBrand(NOW);
    const memory = new Map<string, string>();
    const store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
    };
    saveBrands(store, { [brand.workspaceId]: brand });
    memory.set(PROJECTS_KEY, JSON.stringify([dirt, other]));
    const openai = process.env.OPENAI_API_KEY;
    const ensemble = process.env.ENSEMBLEDATA_API_TOKEN;
    process.env.OPENAI_API_KEY = "sk-stays";
    process.env.ENSEMBLEDATA_API_TOKEN = "token-stays";
    const next = withoutProject([dirt, other], dirt.id);
    memory.set(PROJECTS_KEY, JSON.stringify(next));
    expect(next).toHaveLength(1);
    expect(next[0]).toBe(other);
    expect(other.businessName).toBe("North Workshop");
    expect(other.managerId).toBe(dirt.managerId);
    expect(other.workspaceId).toBe(dirt.workspaceId);
    expect(projectByToken(next, dirt.shareToken)).toBeNull();
    expect(projectByToken(next, other.shareToken)?.id).toBe(other.id);
    expect(loadBrands(store)[brand.workspaceId]?.name).toBe("Jane Smith Marketing");
    expect(memory.get(AGENCY_KEY)).toContain("Jane Smith Marketing");
    expect(process.env.OPENAI_API_KEY).toBe("sk-stays");
    expect(process.env.ENSEMBLEDATA_API_TOKEN).toBe("token-stays");
    if (openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = openai;
    if (ensemble === undefined) delete process.env.ENSEMBLEDATA_API_TOKEN;
    else process.env.ENSEMBLEDATA_API_TOKEN = ensemble;
  });

  it("shows the studio notice and an unavailable discovery link after removal", () => {
    const list = renderToStaticMarkup(
      <MemoryRouter initialEntries={[{ pathname: "/studio", state: { removed: "DIRT" } }]}>
        <ProjectProvider>
          <ProjectList />
        </ProjectProvider>
      </MemoryRouter>,
    );
    expect(list).toContain("DIRT removed.");
    expect(list).toContain("Your clients");
    const missing = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/studio/deleted-id"]}>
        <ProjectProvider>
          <Routes>
            <Route path="/studio/:projectId" element={<ProjectWorkspace />} />
          </Routes>
        </ProjectProvider>
      </MemoryRouter>,
    );
    expect(missing).toContain("That project isn&#x27;t on this machine.");
    const link = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/c/deleted-token/start"]}>
        <SessionProvider>
          <ProjectProvider>
            <Routes>
              <Route path="/c/:token/*" element={<ClientProjectGate />} />
            </Routes>
          </ProjectProvider>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(link).toContain("This discovery link doesn&#x27;t match a project.");
    const workspace = readFileSync(new URL("../../screens/studio/ProjectWorkspace.tsx", import.meta.url), "utf8");
    expect(workspace).toContain('navigate("/studio"');
    expect(workspace).not.toContain("window.confirm");
  });
});
