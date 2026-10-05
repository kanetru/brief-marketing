import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Overlay } from "../../components/Overlay";
import { ExperiencePreview } from "../../components/ExperiencePreview";
import { managerWorkspaceAllowed, resolveSurface } from "../project/access";
import { clientCanSeeIntelligence } from "../project/clientAccess";
import { seedDemoWorkspace } from "../project/demoWorkspace";
import { buildProjectIntelligence } from "../project/assemble";
import { contrastRatio, correctTheme, openingLogo } from "../agency/theme";
import { demoAgencyBrand } from "../agency/brand";
import { resolveExperience } from "../agency/experience";
import { readEnsembleToken } from "../../../server/ensembleData";
import { SOCIAL_INTELLIGENCE_PROVIDER } from "../intelligence/providers";
import { clientCardModel } from "./clientCard";
import { DEFAULT_PANEL, MORE_NAV, PRIMARY_NAV } from "./managerNav";
import { relativeUpdate } from "./clientCard";
import { competitorCards } from "./marketCards";
import { ClientCard } from "../../screens/studio/ProjectList";
import { BrandBrainPanel, HistoryPanel, IntelligenceDesk } from "../../screens/studio/IntelligenceDesk";
import type { WorkspaceBrand } from "../../types/agency";

const AT = "2026-10-05T07:10:00.000Z";

function north() {
  const project = seedDemoWorkspace(AT).find((item) => item.businessName === "North Workshop");
  if (!project) throw new Error("missing north");
  return project;
}

describe("manager workspace", () => {
  it("renders a scannable client card and opens intelligence first", () => {
    const project = north();
    const card = clientCardModel(project);
    expect(card.name).toBe("North Workshop");
    expect(card.competitors).toMatch(/5 competitors/);
    expect(card.opportunities).toMatch(/opportunit/);
    expect(relativeUpdate(AT, new Date(AT))).toBe("Updated today");
    expect(card.watch).toMatch(/Instagram \+ TikTok/);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={project} />
      </MemoryRouter>,
    );
    expect(html).toContain("client-card");
    expect(html).toContain("surface-card");
    expect(html).toContain("North Workshop");
    expect(html).toContain(card.competitors);
    expect(html).not.toContain(card.status);
    expect(DEFAULT_PANEL).toBe("overview");
    expect(PRIMARY_NAV.map((item) => item.label)).toEqual(["Overview", "Competitors", "Market", "Opportunities"]);
    expect(MORE_NAV.map((item) => item.label)).toEqual([
      "Brand details",
      "Strategy detail",
      "Content",
      "Original responses",
      "Site research",
      "Assets",
      "History",
      "Use in AI",
      "Client settings",
    ]);
  });

  it("keeps the intelligence desk short and separates the evidence drawer", () => {
    const project = north();
    const intelligence = buildProjectIntelligence(project, AT);
    const html = renderToStaticMarkup(
      <IntelligenceDesk project={project} intelligence={intelligence} onReact={() => undefined} />,
    );
    expect(html).toContain("Latest");
    expect(html).toContain("Watching");
    expect(html).toContain("Opportunities");
    expect(html).toContain("Why it matters");
    expect(html).toContain("Brief suggests");
    expect(html).not.toMatch(/Here's what I noticed|has been watching the world|What Brief understands/);
    const brand = renderToStaticMarkup(<BrandBrainPanel project={project} intelligence={intelligence} />);
    expect(brand).toContain("What they do");
    expect(brand).toMatch(/Who they(&#x27;|')re talking to/);
    expect(brand).not.toMatch(/What Brief understands/);
    const history = renderToStaticMarkup(<HistoryPanel project={project} />);
    expect(history).toContain("timeline");
    expect(history).not.toMatch(/What changed, and why|Earlier reads stay/);
    const drawer = renderToStaticMarkup(
      <Overlay variant="drawer" title="Evidence" testId="evidence-drawer" onClose={() => undefined}>
        <p>Signal</p>
      </Overlay>,
    );
    expect(drawer).toContain("layer-backdrop");
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain("layer-drawer");
    expect(drawer).toContain("Close");
    const modal = renderToStaticMarkup(
      <Overlay variant="modal" title="Late Timber" testId="competitor-modal" onClose={() => undefined}>
        <p>Instagram</p>
      </Overlay>,
    );
    expect(modal).toContain("layer-modal");
    expect(modal).toContain('aria-modal="true"');
    const late = competitorCards(project).find((item) => item.name === "Late Timber");
    expect(late?.followers).toMatch(/18\.4k/);
    expect(late?.channel).toMatch(/Instagram/);
  });

  it("keeps a client out of the manager workspace", () => {
    expect(managerWorkspaceAllowed(resolveSurface("/studio", "client"))).toBe(false);
    expect(clientCanSeeIntelligence("strategy")).toBe(false);
    expect(clientCanSeeIntelligence("agent_pack")).toBe(false);
  });

  it("reads the EnsembleData token only from the server env name", () => {
    expect(SOCIAL_INTELLIGENCE_PROVIDER.tokenEnv).toBe("ENSEMBLEDATA_API_TOKEN");
    expect(SOCIAL_INTELLIGENCE_PROVIDER.tokenEnv.startsWith("VITE_")).toBe(false);
    const previous = process.env.ENSEMBLEDATA_API_TOKEN;
    process.env.ENSEMBLEDATA_API_TOKEN = "server-secret";
    expect(readEnsembleToken()).toBe("server-secret");
    if (previous === undefined) delete process.env.ENSEMBLEDATA_API_TOKEN;
    else process.env.ENSEMBLEDATA_API_TOKEN = previous;
  });
});

describe("client experience", () => {
  function branded(patch: WorkspaceBrand["experience"], theme: Partial<WorkspaceBrand["theme"]> = {}): WorkspaceBrand {
    const base = demoAgencyBrand();
    return { ...base, theme: { ...base.theme, ...theme }, experience: patch };
  }

  it("uses agency opening, button, introduction, and completion copy", () => {
    const hidden = resolveExperience(demoAgencyBrand());
    expect(hidden.openingHeading).toBe("Let's understand your business.");
    expect(hidden.openingButton).toBe("Begin");
    expect(hidden.expectationEnabled).toBe(false);
    expect(hidden.introEnabled).toBe(false);
    expect(hidden.chapters.business.heading).toBe("First, the business.");
    expect(hidden.chapters.audience.heading).toBe("Now, the people.");

    const brand = branded({
      openingHeading: "Come in.",
      openingButton: "Start",
      expectationEnabled: false,
      introEnabled: true,
      managerName: "Jane",
      introMessage: "Hi — Jane here.",
      completionHeading: "Done.",
      completionBody: "See you Thursday.",
      completionNext: "I'll review this before Thursday.",
    });
    const experience = resolveExperience(brand);
    expect(experience.openingHeading).toBe("Come in.");
    expect(experience.openingButton).toBe("Start");
    expect(experience.introMessage).toBe("Hi — Jane here.");
    expect(experience.completionHeading).toBe("Done.");
    expect(experience.completionBody).toBe("See you Thursday.");
    expect(experience.expectationEnabled).toBe(false);

    const opening = renderToStaticMarkup(<ExperiencePreview brand={brand} frame="desktop" view="opening" />);
    expect(opening).toContain("Come in.");
    expect(opening).toContain("Start");
    expect(opening).toContain("Hi — Jane here.");
    expect(opening).not.toContain("What happens next");
    const completion = renderToStaticMarkup(<ExperiencePreview brand={brand} frame="mobile" view="completion" />);
    expect(completion).toContain("Done.");
    expect(completion).toContain("See you Thursday.");
    expect(completion).toContain("agency-preview-mobile");
  });

  it("isolates logos, themes, and copy per workspace and keeps text readable", () => {
    const jane = branded({ openingHeading: "Jane's opening." }, { logo: "data:image/svg+xml,jane", logoDark: "data:image/svg+xml,jane-dark", mark: "data:image/svg+xml,jsm" });
    const other = branded({ openingHeading: "Other opening." }, { colourBackground: "#111111", colourText: "#f4f1ea", logo: "data:image/svg+xml,other" });
    other.workspaceId = "other-studio";
    expect(resolveExperience(jane).openingHeading).not.toBe(resolveExperience(other).openingHeading);
    expect(openingLogo(jane.theme, "dark")).toContain("jane-dark");
    expect(openingLogo(jane.theme, "light")).toContain("jane");
    expect(openingLogo(other.theme, "dark")).toContain("other");
    const left = renderToStaticMarkup(<ExperiencePreview brand={jane} frame="desktop" view="opening" />);
    const right = renderToStaticMarkup(<ExperiencePreview brand={other} frame="desktop" view="opening" />);
    expect(left).toMatch(/Jane(&#x27;|')s opening/);
    expect(left).not.toContain("Other opening.");
    expect(right).toContain("Other opening.");
    const corrected = correctTheme({ ...jane.theme, colourBackground: "#ffffff", colourText: "#ffff00" });
    expect(contrastRatio(corrected.colourText, corrected.colourBackground)).toBeGreaterThanOrEqual(4.5);
    expect(corrected.colourText.toLowerCase()).not.toBe("#ffff00");
  });

  it("substitutes only the default words", () => {
    const brand = branded({ terms: { business: "studio" }, openingHeading: "Hello there." });
    const experience = resolveExperience(brand);
    expect(experience.openingHeading).toBe("Hello there.");
    expect(experience.openingSupport.toLowerCase()).toContain("studio");
    expect(experience.openingSupport.toLowerCase()).not.toContain("business");
  });
});
