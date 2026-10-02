import { describe, expect, it } from "vitest";
import { buildProjectIntelligence } from "./assemble";
import { profileCompetitor } from "./competitors";
import { acceptOpportunity } from "./opportunities";
import { compareMarket, prevalence } from "./research/compare";
import { discoverPages } from "./research/discoverPages";
import { assembleSite, pageFromHtml, pagesFromHtml, storedFromSite } from "./research/extractSite";
import { researchSite } from "./research/provider";
import { createProject, inviteDiscovery, markDiscoveryOpened, submitDiscovery, withCompetitor, withCompetitorResearch, withWebsiteResearch } from "../../state/projectStore";
import type { ResearchPageRole, SiteResearchResult, StoredResearch } from "../../types/project";
import { organicFixture } from "../../fixtures/brandFixtures";

const AT = "2026-04-02T12:00:00.000Z";

function html(headline: string, body: string, links: string[] = []): string {
  const nav = links.map((href) => `<a href="${href}">${href.split("/").pop()}</a>`).join("");
  return `<html><head><title>${headline}</title><meta name="description" content="${headline}"></head><body><h1>${headline}</h1><p>${body}</p>${nav}</body></html>`;
}

function site(url: string, pages: Array<{ path: string; role: ResearchPageRole; label: string; headline: string; body: string }>): SiteResearchResult {
  const records = pagesFromHtml(pages.map((page) => ({
    url: `${url}${page.path}`,
    role: page.role,
    label: page.label,
    html: html(page.headline, page.body),
  })), AT);
  return assembleSite(url, "Example", AT, records);
}

describe("bounded site research", () => {
  it("selects useful internal pages and skips utility ones", () => {
    const home = html("Home", "A workshop.", [
      "/about",
      "/process",
      "/furniture",
      "/work",
      "/journal",
      "/contact",
      "/cart",
      "/privacy",
      "/blog/page/2",
      "/tag/oak",
      "https://other.example/about",
      "/account/login",
    ]);
    const found = discoverPages(home, "https://north.example", 8).map((page) => page.role);
    expect(found[0]).toBe("home");
    expect(found).toContain("about");
    expect(found).toContain("process");
    expect(found).toContain("products");
    expect(found).toContain("journal");
    expect(found).not.toContain("other");
    expect(found.join(" ")).not.toMatch(/cart|privacy|login/);
    const many = html("Home", "Shop.", Array.from({ length: 20 }, (_, index) => `/products/${index + 1}`));
    expect(discoverPages(many, "https://north.example", 30)).toHaveLength(12);
  });

  it("reads several pages through a provider and leaves unseen fields empty", async () => {
    const pages: Record<string, string> = {
      "https://north.example": html("Made in the workshop", "Benches and tables.", ["/about", "/cart", "/privacy"]),
      "https://north.example/about": html("About the workshop", "We cut the joint by hand for architects.", []),
      "https://north.example/cart": html("Cart", "Your bag is empty.", []),
    };
    const stored = await researchSite({
      id: "fake",
      fetchPage: async (url) => ({
        requestedUrl: url,
        finalUrl: url,
        html: pages[url] ?? "",
        retrievedAt: AT,
        unavailableReason: pages[url] ? "" : "missing",
      }),
    }, "https://north.example", { businessName: "North Workshop", now: AT, maxPages: 6 });
    expect(stored.site?.pages.map((page) => page.role)).toEqual(["home", "about"]);
    expect(stored.site?.visualObservations).toEqual([]);
    expect(stored.site?.pages.every((page) => page.visualResearch === "limited")).toBe(true);
    expect(stored.site?.researchLimitations.join(" ")).toMatch(/pictures were not read/i);
    expect(stored.site?.audienceSignals).toContain("architects");
    expect(stored.observation?.headline).toBe("Made in the workshop");
    expect(stored.site?.observations.every((item) => item.claimScope === "published_copy" && item.epistemicStatus === "inference")).toBe(true);
    expect(stored.site?.offers).toEqual([]);
  });

  it("does not treat one incidental word as a category cliché", () => {
    const plain = (headline: string, body: string) => site("https://example.test", [
      { path: "", role: "home", label: "Homepage", headline, body },
    ]);
    const competitors = [
      { id: "a", name: "A", site: plain("Quiet tables", "The word crafted appears once in a caption and nowhere else.") },
      { id: "b", name: "B", site: plain("Rooms", "Finished furniture for a dining room.") },
      { id: "c", name: "C", site: plain("Chairs", "A chair for a long table.") },
    ];
    const compared = compareMarket({
      businessName: "North",
      discovery: { description: "A workshop making furniture.", audience: "", difference: "", offer: "" },
      clientSite: null,
      competitors,
    });
    expect(compared.patterns.some((pattern) => pattern.patternType === "category_cliche")).toBe(false);
    expect(compared.summary).not.toMatch(/\d+%/);
  });

  it("counts a cliché from the sites that were actually read", () => {
    const craft = (id: string, name: string, headline: string) => ({
      id,
      name,
      site: site(`https://${id}.example`, [{ path: "", role: "home", label: "Homepage", headline, body: "Finished interiors for homeowners." }]),
    });
    const competitors = [
      craft("a", "North & Sons", "Handcrafted furniture"),
      craft("b", "Kiln", "Artisan craftsmanship"),
      craft("c", "Late", "Bespoke crafted pieces"),
      craft("d", "Elm", "Craftsmanship for the home"),
      { id: "e", name: "Field", site: site("https://e.example", [{ path: "", role: "home", label: "Homepage", headline: "Ready in six weeks.", body: "Tables from the shop." }]) },
    ];
    const client = site("https://north.example", [{
      path: "",
      role: "home",
      label: "Homepage",
      headline: "Furniture for the home",
      body: "Each piece is crafted to order. Every bench is crafted in the room.",
    }]);
    const compared = compareMarket({
      businessName: "North Workshop",
      discovery: { description: "A workshop making furniture.", audience: "Households.", difference: "", offer: "Pieces that feel made." },
      clientSite: client,
      competitors,
    });
    const cliche = compared.patterns.find((pattern) => pattern.id === "pattern-cliche-craftsmanship");
    expect(cliche?.prevalence).toBe("4 of 5 researched competitors");
    expect(cliche?.statement).toContain("4 of 5");
    expect(cliche?.statement).not.toContain("3 of 5");
    expect(cliche?.implication).toMatch(/hypothesis/i);
    expect(cliche?.quotes?.length).toBeGreaterThan(0);
    const space = compared.patterns.find((pattern) => pattern.id === "pattern-process-invisible");
    expect(space?.statement).toMatch(/across the 5 competitor sites researched/i);
    expect(space?.statement).toMatch(/little emphasis|only /i);
    expect(space?.implication).toMatch(/hypothesis/i);
    expect(space?.statement).not.toMatch(/no competitors do/i);
    expect(prevalence(5, 5)).toBe("all researched competitors");
    expect(prevalence(1, 5)).toBe("only one observed");
  });

  it("opens a discovery tension and a claim without proof only when both sides exist", () => {
    const client = site("https://north.example", [{
      path: "",
      role: "home",
      label: "Homepage",
      headline: "Furniture, made to last for generations.",
      body: "Homeowners commission one crafted piece. Every table is crafted to order.",
    }]);
    const competitors = ["a", "b", "c"].map((id) => ({
      id,
      name: id,
      site: site(`https://${id}.example`, [{ path: "", role: "home", label: "Homepage", headline: "Handcrafted finished interiors", body: "A finished room for homeowners." }]),
    }));
    const compared = compareMarket({
      businessName: "North Workshop",
      discovery: { description: "A small workshop making furniture.", audience: "We mostly work with architects.", difference: "", offer: "" },
      clientSite: client,
      competitors,
    });
    expect(compared.tensions.some((item) => item.id === "tension-making-site")).toBe(true);
    expect(compared.tensions.some((item) => item.id === "tension-audience-site")).toBe(true);
    const proof = compared.tensions.find((item) => item.kind === "claim_proof");
    expect(proof?.statement).toMatch(/take it on trust/i);
    expect(proof?.epistemicStatus).toBe("hypothesis");
    const aligned = compareMarket({
      businessName: "North Workshop",
      discovery: { description: "A small workshop making furniture.", audience: "", difference: "", offer: "" },
      clientSite: site("https://north.example", [
        { path: "", role: "home", label: "Homepage", headline: "The workshop", body: "Making is the point." },
        { path: "/process", role: "process", label: "Process", headline: "How the joint is cut", body: "The joint is cut in the workshop." },
      ]),
      competitors,
    });
    expect(aligned.tensions.some((item) => item.id === "tension-making-site")).toBe(false);
  });

  it("keeps a single retrieved page from inventing an audience", () => {
    const page = pageFromHtml(html("Made in the workshop", "Benches and tables."), "https://oak.example", "home", "Homepage", AT);
    expect(page?.visualResearch).toBe("limited");
    const research: StoredResearch = storedFromSite(page ? assembleSite("https://oak.example", "Oak", AT, [page]) : null);
    const profile = profileCompetitor({ id: "c1", name: "Oak", website: "https://oak.example", notes: "" }, research);
    expect(profile.basis).toBe("research");
    expect(profile.audience).toBe("");
    expect(profile.visualConventions).toBe("");
    expect(profile.offer).toBe("");
  });

  it("ties a longevity opportunity to the claim and the missing proof", () => {
    const project = researchedProject();
    const intelligence = buildProjectIntelligence(project, AT);
    expect(intelligence.tensions.length).toBeGreaterThan(0);
    const longevity = intelligence.opportunities.find((item) => item.id === "opp-longevity");
    expect(longevity?.evidenceIds.length).toBeGreaterThan(0);
    expect(longevity?.websiteEvidence?.length).toBeGreaterThan(0);
    expect(longevity?.hypothesis).toMatch(/proof/i);
    expect(longevity?.requiredAssets?.length).toBeGreaterThan(0);
    const making = intelligence.opportunities.find((item) => item.id === "opp-making");
    expect(making?.evidenceIds).toContain("business.description");
    expect(making?.marketEvidence?.length).toBeGreaterThan(0);
    for (const item of intelligence.opportunities) expect(acceptOpportunity(item)).toBe(true);
    const headline = intelligence.evidence.find((item) => item.id === "website.headline");
    expect(headline?.claimScope).toBe("published_copy");
    expect(headline?.epistemicStatus).not.toBe("fact");
    expect(intelligence.understanding.fields.some((field) => /made to last/i.test(field.text))).toBe(false);
  });
});

function researchedProject() {
  const discovery = organicFixture();
  discovery.audience.bestCustomers = { state: "evidence", evidence: { raw: "We mostly work with architects.", capturedAt: AT } };
  let project = createProject({
    clientName: "North Workshop",
    businessName: "North Workshop",
    website: "https://northworkshop.example",
    category: "Furniture",
    discovery,
    now: AT,
  });
  project = inviteDiscovery(project, AT);
  project = markDiscoveryOpened(project, AT);
  project = submitDiscovery(project, AT);
  const client = storedFromSite(site("https://northworkshop.example", [{
    path: "",
    role: "home",
    label: "Homepage",
    headline: "Furniture, made to last for generations.",
    body: "Each piece is crafted to order. Every table is crafted for homeowners.",
  }]));
  project = withWebsiteResearch(project, client, AT);
  for (const id of ["a", "b"]) {
    project = withCompetitor(project, { id, name: id, website: `https://${id}.example`, notes: "" }, AT);
    project = withCompetitorResearch(project, id, storedFromSite(site(`https://${id}.example`, [{
      path: "",
      role: "home",
      label: "Homepage",
      headline: "Handcrafted finished interiors",
      body: "A finished room for homeowners.",
    }])), AT);
  }
  return project;
}
