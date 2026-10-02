import type { CategoryPattern, ResearchTension, SiteResearchResult, SourceQuote } from "../../../types/project";

export interface MarketDiscovery {
  description: string;
  audience: string;
  difference: string;
  offer: string;
}

export interface ResearchedCompetitor {
  id: string;
  name: string;
  site: SiteResearchResult;
}

export interface MarketComparison {
  patterns: CategoryPattern[];
  tensions: ResearchTension[];
  summary: string;
}

const CRAFT = /craftsmanship|hand-?crafted|artisan|artisanal|\bcrafted\b/i;
const PROCESS = /\b(process|workshop|joinery|joints?|construction|making)\b/i;
const DURABILITY = /durab|generations|lifetime|made to last|repairab/i;
const PROOF = /award|certified|since\s+\d{4}|\d+\s+years?|testimonial|reviewed by|repair/i;
const HOMEOWNERS = /\bhomeowners?\b/i;
const ARCHITECTS = /\barchitects?\b/i;

/** How often a concept showed up, in words. Never a percentage. */
export function prevalence(count: number, total: number): string {
  if (total <= 0 || count <= 0) return "none of the sites researched";
  if (count === 1) return "only one observed";
  if (count === total) return total === 1 ? "only one observed" : "all researched competitors";
  return `${count} of ${total} researched competitors`;
}

export function compareMarket(input: {
  businessName: string;
  discovery: MarketDiscovery;
  clientSite: SiteResearchResult | null;
  competitors: ResearchedCompetitor[];
}): MarketComparison {
  const competitors = input.competitors.filter((item) => item.site.pages.length > 0);
  const patterns = categoryPatterns(input.businessName, input.discovery, input.clientSite, competitors);
  const tensions = findTensions(input.businessName, input.discovery, input.clientSite, competitors);
  const summary = marketSummary(competitors.length, patterns);
  return { patterns, tensions, summary };
}

export function describeClientSite(site: SiteResearchResult): { says: string; emphasises: string[] } {
  const text = siteText(site);
  const emphasises: string[] = [];
  if (isProminent(site, CRAFT)) emphasises.push("craft");
  if (isProminent(site, PROCESS)) emphasises.push("process");
  if (isProminent(site, DURABILITY)) emphasises.push("longevity");
  if (/(?:\$|£|€)\s?\d|\bfrom\s+\d|\bpricing\b/i.test(text)) emphasises.push("price");
  if (site.verbalCharacter.includes("functional")) emphasises.push("technical language");
  if (site.verbalCharacter.includes("emotional")) emphasises.push("emotional language");
  return { says: site.summary, emphasises };
}

function categoryPatterns(
  businessName: string,
  discovery: MarketDiscovery,
  clientSite: SiteResearchResult | null,
  competitors: ResearchedCompetitor[],
): CategoryPattern[] {
  if (competitors.length < 2) return [];
  const total = competitors.length;
  const patterns: CategoryPattern[] = [];
  const craft = supporters(competitors, CRAFT);
  if (craft.length >= 2) {
    const cliche = craft.length / total >= 0.6;
    const clientUses = clientSite ? isProminent(clientSite, CRAFT) : false;
    patterns.push(pattern({
      id: cliche ? "pattern-cliche-craftsmanship" : "pattern-claim-craftsmanship",
      title: "Craftsmanship",
      patternType: cliche ? "category_cliche" : "common_claim",
      count: craft.length,
      total,
      statement: cliche
        ? `Craftsmanship is prominent across ${prevalence(craft.length, total)}. Those pages use craftsmanship, handcrafted, artisan, or closely related language.${clientUses ? ` ${businessName} also uses this language on the pages read.` : ""}`
        : `Craftsmanship language is prominent for ${prevalence(craft.length, total)}.`,
      implication: cliche
        ? "Hypothesis: this may be necessary category language, but it is unlikely to differentiate the business on its own."
        : "Hypothesis: the repetition is real, and it is not yet common enough to treat as wallpaper.",
      evidenceIds: craft.flatMap((item) => [`competitor.${item.id}`]),
      competitorsSupporting: craft.map((item) => item.name),
      quotes: craft.flatMap((item) => quotesFrom(item.site, item.name, CRAFT, 1)),
    }));
  }

  const making = supporters(competitors, PROCESS);
  const clientMaking = discoveryMentions(discovery, PROCESS);
  if (making.length <= 1 && clientMaking) {
    const names = making.map((item) => item.name);
    const scope = making.length === 1
      ? `only ${names[0] ?? "one competitor"} meaningfully explains construction on the pages read.`
      : "we found little emphasis on how the work is made.";
    patterns.push(pattern({
      id: "pattern-process-invisible",
      title: "Process is largely invisible",
      patternType: "whitespace_hypothesis",
      count: making.length,
      total,
      statement: `Across the ${total} competitor sites researched, ${scope} ${businessName}'s discovery keeps returning to making.`,
      implication: "Hypothesis: making the construction process visible could become a distinctive proof and content system.",
      evidenceIds: ["business.description", ...competitors.map((item) => `competitor.${item.id}`)],
      competitorsSupporting: names,
      quotes: [
        ...making.flatMap((item) => quotesFrom(item.site, item.name, PROCESS, 1)),
        ...competitors.filter((item) => !making.includes(item)).slice(0, 3).flatMap((item) => leadQuote(item)),
      ],
    }));
  }

  const homeowners = competitors.filter((item) => mentions(item.site, HOMEOWNERS));
  if (homeowners.length >= 2) {
    patterns.push(pattern({
      id: "pattern-audience-homeowners",
      title: "Written for homeowners",
      patternType: "audience_pattern",
      count: homeowners.length,
      total,
      statement: `Homeowners are named by ${prevalence(homeowners.length, total)}.`,
      implication: "This describes who the pages address. It does not prove who pays.",
      evidenceIds: homeowners.map((item) => `competitor.${item.id}`),
      competitorsSupporting: homeowners.map((item) => item.name),
      quotes: homeowners.flatMap((item) => quotesFrom(item.site, item.name, HOMEOWNERS, 1)),
    }));
  }

  const withProof = competitors.filter((item) => item.site.proof.length > 0);
  if (withProof.length >= 2) {
    patterns.push(pattern({
      id: "pattern-proof-lines",
      title: "Proof on the page",
      patternType: "proof_pattern",
      count: withProof.length,
      total,
      statement: `${prevalence(withProof.length, total)} publish a concrete proof line, such as an award, a year, or a testimonial. The others do not, on the pages read.`,
      implication: "Where proof is missing, a claim is being asked to stand alone.",
      evidenceIds: withProof.map((item) => `competitor.${item.id}`),
      competitorsSupporting: withProof.map((item) => item.name),
      quotes: withProof.flatMap((item) => {
        const line = item.site.proof[0];
        return line ? [{ who: item.name, page: "Proof", url: item.site.siteUrl, text: line }] : [];
      }),
    }));
  } else if (withProof.length === 0) {
    patterns.push(pattern({
      id: "pattern-proof-thin",
      title: "Proof is thin",
      patternType: "proof_pattern",
      count: 0,
      total,
      statement: `Across the ${total} competitor sites researched, we found little concrete proof: no award, year count, or testimonial on the pages read.`,
      implication: "Hypothesis: proof is scarce in this set, so a specific one could be distinctive. This is not a claim about the whole market.",
      evidenceIds: competitors.map((item) => `competitor.${item.id}`),
      competitorsSupporting: [],
      quotes: competitors.slice(0, 3).flatMap((item) => leadQuote(item)),
    }));
  }

  const differ = craft.length >= 2 && craft.length < total ? competitors.filter((item) => !craft.includes(item)) : [];
  for (const item of differ.slice(0, 2)) {
    patterns.push(pattern({
      id: `pattern-differs-${item.id}`,
      title: `${item.name} says something else`,
      patternType: "differentiation_signal",
      count: 1,
      total,
      statement: `${item.name} does not use the craftsmanship language on the pages read. The homepage leads with “${item.site.positioning}”.`,
      implication: "This is a difference inside the set that was read, not a verdict on the category.",
      evidenceIds: [`competitor.${item.id}`],
      competitorsSupporting: [item.name],
      quotes: leadQuote(item),
    }));
  }

  if (clientSite && isProminent(clientSite, PROCESS) && making.length === 0) {
    patterns.push(pattern({
      id: "pattern-client-process",
      title: "The client already shows the making",
      patternType: "differentiation_signal",
      count: 0,
      total,
      statement: `Across the ${total} competitor sites researched, we found little emphasis on construction. ${businessName}'s own pages do explain it.`,
      implication: "Hypothesis: the client already has material the category set is not using.",
      evidenceIds: ["website.headline", ...competitors.map((item) => `competitor.${item.id}`)],
      competitorsSupporting: [],
      quotes: quotesFrom(clientSite, businessName, PROCESS, 2),
    }));
  }

  return patterns;
}

function findTensions(
  businessName: string,
  discovery: MarketDiscovery,
  clientSite: SiteResearchResult | null,
  competitors: ResearchedCompetitor[],
): ResearchTension[] {
  const tensions: ResearchTension[] = [];
  const discoveryText = [discovery.description, discovery.audience, discovery.difference, discovery.offer].filter(Boolean).join(" ");

  if (clientSite && discoveryMentions(discovery, PROCESS) && !isProminent(clientSite, PROCESS)) {
    tensions.push(tension({
      id: "tension-making-site",
      kind: "discovery_website",
      title: "Making is in the discovery and barely on the site",
      statement: `${businessName} describes the work through making. The pages read barely explain construction. That gap is worth showing the manager.`,
      evidenceIds: ["business.description", "website.headline"],
      quotes: [
        discoveryQuote(businessName, discovery.description || discovery.offer),
        ...leadQuote({ id: "client", name: businessName, site: clientSite }),
      ],
    }));
  }

  if (clientSite && ARCHITECTS.test(discoveryText) && mentions(clientSite, HOMEOWNERS) && !mentions(clientSite, ARCHITECTS)) {
    tensions.push(tension({
      id: "tension-audience-site",
      kind: "discovery_website",
      title: "Discovery names architects. The site talks to homeowners",
      statement: "Discovery says the work is mostly with architects. The pages read address homeowners. That is not automatically a problem. It is a difference between what was said and what was published.",
      evidenceIds: ["audience.current", "website.headline"],
      quotes: [
        discoveryQuote(businessName, discovery.audience || discovery.description),
        ...quotesFrom(clientSite, businessName, HOMEOWNERS, 1),
      ],
    }));
  }

  if (clientSite && /\bapproachable\b/i.test(discoveryText) && /architectur|specification|bespoke commission/i.test(siteText(clientSite))) {
    const formalCategory = competitors.filter((item) => /architectur|specification|bespoke/i.test(siteText(item.site))).length;
    tensions.push(tension({
      id: "tension-approachable",
      kind: "audience_language",
      title: "The stated personality disappears into the category voice",
      statement: formalCategory >= 2
        ? `${businessName} wants to feel approachable. The site, and ${prevalence(formalCategory, competitors.length)}, use a more formal register.`
        : `${businessName} wants to feel approachable. The pages read use a more formal register.`,
      evidenceIds: ["audience.current", "website.headline"],
      quotes: [discoveryQuote(businessName, discovery.audience || discovery.description), ...leadQuote({ id: "client", name: businessName, site: clientSite })],
    }));
  }

  const makingCategory = supporters(competitors, PROCESS).length;
  if (competitors.length >= 2 && discoveryMentions(discovery, PROCESS) && makingCategory <= 1) {
    tensions.push(tension({
      id: "tension-making-category",
      kind: "discovery_category",
      title: "Discovery cares about making. The category set mostly shows the finished work",
      statement: `Discovery keeps returning to how the work is made. Across the ${competitors.length} competitor sites researched, we found little emphasis on construction. There may be an unclaimed chance to make construction part of the buying story. This is a hypothesis.`,
      evidenceIds: ["business.description", ...competitors.map((item) => `competitor.${item.id}`)],
      quotes: [discoveryQuote(businessName, discovery.description), ...competitors.slice(0, 2).flatMap((item) => leadQuote(item))],
    }));
  }

  if (clientSite && isProminent(clientSite, DURABILITY) && !clientSite.proof.some((line) => PROOF.test(line) || /material|repair|construction/i.test(line))) {
    tensions.push(tension({
      id: "tension-longevity-proof",
      kind: "claim_proof",
      title: "Longevity is claimed without proof",
      statement: `${businessName} says the work is made to last. The pages read provide little concrete durability proof. The claim may still be true. The marketing currently asks the customer to take it on trust.`,
      evidenceIds: ["website.headline"],
      quotes: quotesFrom(clientSite, businessName, DURABILITY, 2),
    }));
  }

  return tensions.filter((item) => item.quotes.some((quote) => quote.text.trim()));
}

function marketSummary(total: number, patterns: CategoryPattern[]): string {
  if (total < 2 || patterns.length === 0) return "";
  const cliche = patterns.find((item) => item.patternType === "category_cliche");
  const space = patterns.find((item) => item.patternType === "whitespace_hypothesis");
  const lines = [`Compared ${total} competitor sites that were read.`];
  if (cliche) lines.push(cliche.statement);
  if (space) lines.push(space.statement);
  if (!cliche && !space) lines.push(patterns[0]?.statement ?? "");
  return lines.filter(Boolean).join(" ");
}

function supporters(competitors: ResearchedCompetitor[], test: RegExp): ResearchedCompetitor[] {
  return competitors.filter((item) => isProminent(item.site, test));
}

function mentions(site: SiteResearchResult, test: RegExp): boolean {
  return countMatches(siteText(site), test) > 0;
}

function isProminent(site: SiteResearchResult, test: RegExp): boolean {
  if (site.pages.some((page) => test.test(page.headline))) return true;
  if (site.recurringLanguage.some((word) => test.test(word))) return true;
  return countMatches(siteText(site), test) >= 2;
}

function discoveryMentions(discovery: MarketDiscovery, test: RegExp): boolean {
  return test.test([discovery.description, discovery.difference, discovery.offer, discovery.audience].join(" "));
}

function siteText(site: SiteResearchResult): string {
  return site.pages.map((page) => `${page.headline} ${page.description} ${page.excerpt} ${page.headings.join(" ")}`).join("\n");
}

function quotesFrom(site: SiteResearchResult, who: string, test: RegExp, limit: number): SourceQuote[] {
  const found: SourceQuote[] = [];
  for (const page of site.pages) {
    const sentences = `${page.headline}. ${page.excerpt}`.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const text = sentence.replace(/\s+/g, " ").trim();
      if (text.length < 8 || !test.test(text)) continue;
      found.push({ who, page: page.label, url: page.url, text: text.slice(0, 220) });
      if (found.length >= limit) return found;
    }
  }
  return found;
}

function leadQuote(item: ResearchedCompetitor): SourceQuote[] {
  const page = item.site.pages.find((entry) => entry.role === "home") ?? item.site.pages[0];
  if (!page?.headline) return [];
  return [{ who: item.name, page: page.label, url: page.url, text: page.headline }];
}

function discoveryQuote(who: string, text: string): SourceQuote {
  return { who, page: "Discovery", url: "", text: text.replace(/\s+/g, " ").trim().slice(0, 220) };
}

function countMatches(text: string, test: RegExp): number {
  const flags = test.flags.includes("g") ? test.flags : `${test.flags}g`;
  return text.match(new RegExp(test.source, flags))?.length ?? 0;
}

function pattern(input: {
  id: string;
  title: string;
  patternType: NonNullable<CategoryPattern["patternType"]>;
  count: number;
  total: number;
  statement: string;
  implication: string;
  evidenceIds: string[];
  competitorsSupporting: string[];
  quotes: SourceQuote[];
}): CategoryPattern {
  return {
    id: input.id,
    title: input.title,
    statement: input.statement,
    count: input.count,
    total: input.total,
    evidenceIds: input.evidenceIds,
    epistemicStatus: "hypothesis",
    patternType: input.patternType,
    competitorsSupporting: input.competitorsSupporting,
    prevalence: prevalence(input.count, input.total),
    implication: input.implication,
    quotes: input.quotes,
  };
}

function tension(input: Omit<ResearchTension, "epistemicStatus">): ResearchTension {
  return { ...input, epistemicStatus: "hypothesis" };
}
