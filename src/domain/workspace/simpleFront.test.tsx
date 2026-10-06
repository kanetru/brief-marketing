import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ExperiencePreview } from "../../components/ExperiencePreview";
import { ProjectProvider } from "../../state/ProjectContext";
import { createProject } from "../../state/projectStore";
import { createSession } from "../../state/createSession";
import { DEMO_ACCOUNT } from "../project/account";
import { contrastRatio, correctTheme, themeVars } from "../agency/theme";
import { clientRecord } from "./clientRecord";
import { compactCount, marketFacts, statsForCandidate, statsForWatch, trackingNote } from "./plainAnalytics";
import { ProjectList } from "../../screens/studio/ProjectList";
import { FilesPanel, IdeasPanel, NotesPanel } from "../../screens/studio/WorkPlaces";
import type { AgencyTheme } from "../../types/agency";
import type { SocialAccountCandidate } from "../../types/marketDiscovery";
import type { ContentIdea, LibraryAsset, WorkNote } from "../../types/project";
import type { MonitoredCompetitor } from "../../types/intelligence";

const AT = "2026-10-06T00:00:00.000Z";
const globalCss = readFileSync(new URL("../../styles/global.css", import.meta.url), "utf8");
const studioCss = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");

function theme(patch: Partial<AgencyTheme> = {}): AgencyTheme {
  return {
    logo: "data:image/svg+xml,yellow",
    mark: "",
    colourPrimary: "#111111",
    colourAccent: "#1D4ED8",
    colourBackground: "#FFE14A",
    colourSurface: "#FFF3A3",
    colourText: "#111111",
    colourMuted: "#333333",
    headingFont: "Fraunces",
    bodyFont: "Satoshi",
    radiusCharacter: "0px",
    welcomeLine: "",
    optionalThemeMetadata: {},
    ...patch,
  };
}

function post(partial: Partial<SocialAccountCandidate["recentPosts"][number]>): SocialAccountCandidate["recentPosts"][number] {
  return {
    platform: "instagram",
    postId: "p",
    accountId: "c",
    publishedAt: null,
    caption: null,
    hashtags: [],
    mentions: [],
    mediaType: null,
    likes: null,
    comments: null,
    views: null,
    shares: null,
    url: null,
    retrievedAt: AT,
    ...partial,
  };
}

function candidate(partial: Partial<SocialAccountCandidate> = {}): SocialAccountCandidate {
  return {
    id: "c",
    platform: "instagram",
    handle: "farmlab",
    displayName: "FarmLab",
    bio: "Soil testing",
    profileUrl: "https://instagram.com/farmlab",
    website: "https://farmlab.example",
    followers: 18400,
    following: null,
    recentPosts: [
      post({ postId: "1", publishedAt: "2026-10-01T00:00:00.000Z", caption: "How a soil test changes the next season", hashtags: ["Soil", "Testing"], mediaType: "video", likes: 120, views: 4000 }),
      post({ postId: "2", publishedAt: "2026-09-01T00:00:00.000Z", caption: "A quiet field", hashtags: ["Soil"], mediaType: "image", likes: null, comments: null, views: null }),
    ],
    sourceQueries: [],
    discoveryFrequency: 1,
    providerStatus: "live",
    retrievedAt: AT,
    clientClaim: "",
    enriched: true,
    ...partial,
  };
}

describe("studio home", () => {
  it("welcomes the manager and offers the two primary actions", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProjectProvider>
          <ProjectList />
        </ProjectProvider>
      </MemoryRouter>,
    );
    expect(html).toContain(`Welcome, ${DEMO_ACCOUNT.name.split(" ")[0]}`);
    expect(html).toContain("Your clients");
    expect(html).toContain("Onboard new client");
    expect(html).toContain('href="/studio/look"');
    expect(html).toContain("Make Brief your own");
    expect(html).toContain("client-grid");
    expect(html).not.toContain("Client experience");
  });
});

describe("client record", () => {
  it("uses practical discovery information and omits what is unknown", () => {
    const discovery = createSession(AT);
    discovery.business.description = { state: "evidence", evidence: { raw: "Handmade ceramics for cooks.", capturedAt: AT } };
    discovery.audience.bestCustomers = { state: "evidence", evidence: { raw: "Home cooks.", capturedAt: AT } };
    discovery.goals.twelveMonthSuccess = { state: "evidence", evidence: { raw: "Increase direct sales.", capturedAt: AT } };
    const project = createProject({
      clientName: "Ada",
      businessName: "Kiln & Co",
      website: "https://kilnandco.com.au",
      category: "Ceramics",
      discovery,
      now: AT,
    });
    project.socials = [{ platform: "instagram", handle: "kilnandco" }];
    project.profile = {
      description: "",
      audience: "",
      goal: "",
      offers: [{ name: "Dinnerware", description: "Handmade ceramic tableware", priceLabel: "From $120" }],
    };
    const record = clientRecord(project);
    expect(record.name).toBe("Kiln & Co");
    expect(record.description).toBe("Handmade ceramics for cooks.");
    expect(record.website?.value).toBe("kilnandco.com.au");
    expect(record.socials.map((item) => item.label)).toEqual(["Instagram"]);
    expect(record.socials[0]?.value).toBe("@kilnandco");
    expect(record.offers[0]).toMatchObject({ name: "Dinnerware", priceLabel: "From $120" });
    expect(record.audience).toBe("Home cooks.");
    expect(record.goal).toBe("Increase direct sales.");
    expect(record.socials.map((item) => item.label)).not.toContain("TikTok");
  });
});

describe("competitor and market data", () => {
  it("shows real metrics and omits missing ones", () => {
    const stats = statsForCandidate(candidate(), AT);
    expect(stats.accounts[0]).toMatchObject({ platform: "Instagram", handle: "farmlab", followers: "18.4k" });
    expect(stats.metrics.find((item) => item.label === "Avg likes")?.value).toBe("120");
    expect(stats.metrics.find((item) => item.label === "Avg views")?.value).toBe("4k");
    expect(stats.metrics.some((item) => item.label === "Avg comments")).toBe(false);
    expect(stats.metrics.some((item) => item.value === "0")).toBe(false);
    expect(stats.themes).toContain("Soil");
    expect(stats.historyNote).toBe(trackingNote(AT));
    expect(stats.followersSeries).toEqual([]);
    const empty = statsForCandidate(candidate({ followers: null, recentPosts: [post({ caption: "No numbers" })] }), AT);
    expect(empty.accounts[0]?.followers).toBe("");
    expect(empty.metrics).toEqual([]);
    expect(compactCount(0)).toBe("");
    const shared: MonitoredCompetitor = {
      id: "late",
      name: "Late Timber",
      website: "https://late.example",
      socialHandles: ["Instagram", "TikTok"],
      relationship: "direct",
      monitoredSources: [],
      lastCheckedAt: AT,
      origin: "demo",
      snapshots: [{ at: AT, origin: "demo", note: "", metrics: { followers: "18400 demo" } }],
    };
    const watched = statsForWatch(shared, AT);
    expect(watched.accounts.map((account) => account.followers)).toEqual(["", ""]);
    expect(watched.metrics).toEqual([{ label: "Followers", value: "18.4k" }]);
    const single = statsForWatch({ ...shared, socialHandles: ["Instagram"] }, AT);
    expect(single.accounts[0]?.followers).toBe("18.4k");
    expect(single.metrics).toEqual([]);
  });

  it("grounds the market summary in collected posts", () => {
    const project = createProject({ businessName: "Kiln & Co", now: AT });
    project.marketDiscovery = {
      ...project.marketDiscovery!,
      candidates: [
        candidate(),
        candidate({ id: "t", platform: "tiktok", handle: "other", displayName: "Other", followers: null, recentPosts: [post({ postId: "3", caption: "Measure the soil", hashtags: ["Soil"], mediaType: "video", likes: 10 })] }),
      ],
    };
    const facts = marketFacts(project);
    expect(facts.competitors).toBe(2);
    expect(facts.posts).toBe(3);
    expect(facts.facts.join(" ")).toContain("2 competitors tracked");
    expect(facts.facts.join(" ")).toContain("3 posts analysed");
    expect(facts.topics[0]).toBe("Soil");
    expect(facts.interpretation.join(" ")).toContain("2 of the 2 competitors");
    expect(facts.interpretation.join(" ")).toContain("video");
    expect(facts.growing).toEqual([]);
    expect(facts.facts.join(" ")).not.toMatch(/\+\d+%/);
  });
});

describe("working places", () => {
  it("lists a file and the controls to add or remove it", () => {
    const asset: LibraryAsset = {
      id: "file",
      name: "2026 Social Media Agreement.pdf",
      category: "proof",
      description: "",
      fileRef: "data:application/pdf,abc",
      tags: ["contract"],
      notes: "",
      createdAt: AT,
      updatedAt: AT,
      approval: "unreviewed",
      relatedOpportunityId: null,
    };
    const html = renderToStaticMarkup(<FilesPanel assets={[asset]} onAdd={() => undefined} onRemove={() => undefined} />);
    expect(html).toContain("Files");
    expect(html).toContain("2026 Social Media Agreement.pdf");
    expect(html).toContain("Add file");
    expect(html).toContain("Remove");
    expect(html).toContain("Open");
    expect(html).toContain("Contract");
    expect(html).not.toContain("PROOF");
    const contracts = renderToStaticMarkup(<FilesPanel assets={[asset]} category="contracts" onAdd={() => undefined} onRemove={() => undefined} />);
    expect(contracts).toContain("Contracts");
    expect(contracts).toContain("2026 Social Media Agreement.pdf");
  });

  it("renders content ideas and notes with edit and delete", () => {
    const idea: ContentIdea = { id: "i", title: "Harvest history reel", body: "Show the same paddock.", status: "idea", at: AT };
    const ideas = renderToStaticMarkup(<IdeasPanel ideas={[idea]} onChange={() => undefined} />);
    expect(ideas).toContain("Content ideas");
    expect(ideas).toContain("Harvest history reel");
    expect(ideas).toContain("Add idea");
    expect(ideas).toContain("Edit");
    expect(ideas).toContain("Delete");
    expect(ideas).not.toContain("Content territories");
    const note: WorkNote = { id: "n", text: "Call the grower before filming.", at: AT };
    const notes = renderToStaticMarkup(<NotesPanel notes={[note]} legacy="" onChange={() => undefined} onLegacy={() => undefined} />);
    expect(notes).toContain("Notes");
    expect(notes).toContain("Call the grower before filming.");
    expect(notes).toContain("Add note");
  });
});

describe("agency theme", () => {
  it("keeps a readable custom palette and applies it to every onboarding surface", () => {
    const safe = correctTheme(theme());
    expect(safe.colourBackground).toBe("#FFE14A");
    expect(safe.colourText).toBe("#111111");
    expect(contrastRatio(safe.colourText, safe.colourBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(safe.optionalThemeMetadata.onAccent, safe.colourAccent)).toBeGreaterThanOrEqual(4.5);
    const repaired = correctTheme(theme({ colourText: "#FFE14A" }));
    expect(repaired.colourBackground).toBe("#FFE14A");
    expect(contrastRatio(repaired.colourText, repaired.colourBackground)).toBeGreaterThanOrEqual(4.5);
    const vars = themeVars(theme());
    expect(vars["--client-bg" as keyof typeof vars]).toBe("#FFE14A");
    expect(String(vars["--font-display" as keyof typeof vars])).toContain("Fraunces");
    expect(String(vars["--on-accent" as keyof typeof vars])).toBeTruthy();
    const agency = globalCss.slice(globalCss.indexOf("Agency onboarding"));
    expect(agency).toContain(".shell[data-agency]");
    expect(agency).toContain("background: var(--client-bg)");
    expect(agency).toContain(".shell[data-agency].is-dark");
    expect(agency).toContain("var(--client-accent)");
    expect(agency).toContain("var(--client-selection)");
    expect(agency).toContain("filter: none");
    expect(agency).toContain(".preview-button.is-solid");
    expect(agency).toContain(".compare-panel");
    expect(agency).toContain(".statement");
    expect(agency).not.toContain("#422424");
    expect(agency).not.toContain("#74040f");
    const preview = renderToStaticMarkup(
      <ExperiencePreview
        brand={{ workspaceId: "yellow", name: "Yellow", website: "", contactName: "Ada", contactDetails: "", theme: theme(), updatedAt: AT }}
        frame="desktop"
        view="choices"
      />,
    );
    expect(preview).toContain('data-agency="yellow"');
    expect(preview).toContain("agency-frame");
    expect(preview).toContain('data-preview="choices"');
    expect(preview).toContain('aria-pressed="true"');
    expect(preview).toContain("data:image/svg+xml,yellow");
    expect(preview).toContain("--client-bg:");
    const question = renderToStaticMarkup(
      <ExperiencePreview
        brand={{ workspaceId: "yellow", name: "Yellow", website: "", contactName: "Ada", contactDetails: "", theme: theme(), updatedAt: AT }}
        frame="mobile"
        view="question"
      />,
    );
    expect(question).toContain('data-preview="question"');
    expect(question).toContain("What does the business do?");
    expect(studioCss).toMatch(/\.client-grid,\s*\n\.card-grid \{[\s\S]*grid-template-columns:\s*1fr/);
    expect(studioCss).toMatch(/@media \(max-width: 520px\)/);
  });
});
