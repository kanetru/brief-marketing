import { extractPageObservations, observationHasSubstance } from "../pageExtract";
import type { ResearchObservation, ResearchPageRecord, ResearchPageRole, SiteResearchResult, StoredResearch } from "../../../types/project";

const AUDIENCE = /\b(homeowners?|architects?|families|designers?|developers?|trade)\b/i;
const PROOF = /award|certified|since\s+\d{4}|\d+\s+years?|testimonial|reviewed by/i;
const PRICE = /(?:\$|£|€)\s?\d|\bpricing\b|\bfrom\s+\d/i;

export function pageFromHtml(
  html: string,
  url: string,
  role: ResearchPageRole,
  label: string,
  retrievedAt: string,
): ResearchPageRecord | null {
  const basic = extractPageObservations(html, url, retrievedAt);
  if (!observationHasSubstance(basic)) return null;
  const excerpt = visibleText(html).slice(0, 1200);
  return {
    url,
    role,
    label,
    headline: basic.headline,
    description: basic.description,
    excerpt,
    headings: headings(html),
    callsToAction: basic.callsToAction,
    proofLines: proofLines(excerpt),
    recurringLanguage: basic.recurringLanguage,
    retrievedAt,
    visualResearch: "limited",
  };
}

export function assembleSite(
  siteUrl: string,
  businessName: string,
  researchedAt: string,
  pages: ResearchPageRecord[],
): SiteResearchResult {
  const home = pages.find((page) => page.role === "home") ?? pages[0];
  const text = pages.map((page) => `${page.headline} ${page.description} ${page.excerpt} ${page.headings.join(" ")}`).join("\n");
  const observations = observationsFrom(pages);
  const offers = unique(pages.filter((page) => page.role === "products" || page.role === "services").flatMap((page) => page.headings)).slice(0, 6);
  const audienceSignals = audienceFrom(text);
  const proof = unique(pages.flatMap((page) => page.proofLines)).slice(0, 6);
  const roles = new Set(pages.map((page) => page.role));
  const contentPatterns = [
    roles.has("process") ? "A process page was among the pages read." : "",
    roles.has("work") ? "Project or portfolio pages were among the pages read." : "",
    roles.has("journal") ? "A journal or notes page was among the pages read." : "",
    roles.has("testimonials") ? "A testimonials page was among the pages read." : "",
  ].filter(Boolean);
  const unanswered = [
    roles.has("pricing") || PRICE.test(text) ? "" : "Pricing was not stated on the pages read.",
    proof.length === 0 ? "The pages read did not include a concrete proof line." : "",
    !roles.has("process") ? "No process page was in the set that was read." : "",
  ].filter(Boolean);
  const summary = home?.headline
    ? `The homepage leads with “${home.headline}”. ${pages.length === 1 ? "Only that page came back." : `${pages.length} pages were read.`}`
    : "The pages that came back did not include a clear headline.";
  return {
    siteUrl,
    businessName,
    researchedAt,
    pages,
    observations,
    summary,
    positioning: home?.headline ?? "",
    offers,
    audienceSignals,
    claims: unique(pages.filter((page) => page.role === "home").flatMap((page) => page.headings)).slice(0, 5),
    proof,
    callsToAction: home?.callsToAction ?? [],
    recurringLanguage: languageAcross(pages),
    themes: [],
    contentPatterns,
    visualObservations: [],
    verbalCharacter: verbalCharacter(text),
    unansweredQuestions: unanswered,
    researchLimitations: [
      "Visual research is limited. The pictures were not read.",
      pages.length < 2 ? "Only one page came back, so the rest of the site is unknown." : "",
    ].filter(Boolean),
  };
}

export function storedFromSite(site: SiteResearchResult | null, unavailableReason = ""): StoredResearch {
  const home = site?.pages.find((page) => page.role === "home") ?? site?.pages[0];
  return {
    url: site?.siteUrl || "",
    retrievedAt: site?.researchedAt || new Date().toISOString(),
    observation: home
      ? {
          url: home.url,
          retrievedAt: home.retrievedAt,
          headline: home.headline,
          description: home.description,
          excerpt: home.excerpt.slice(0, 700),
          callsToAction: home.callsToAction,
          recurringLanguage: home.recurringLanguage,
        }
      : null,
    site,
    unavailableReason,
  };
}

export function pagesFromHtml(
  entries: Array<{ url: string; html: string; role: ResearchPageRole; label: string }>,
  retrievedAt: string,
): ResearchPageRecord[] {
  return entries.flatMap((entry) => {
    const page = pageFromHtml(entry.html, entry.url, entry.role, entry.label, retrievedAt);
    return page ? [page] : [];
  });
}

function observationsFrom(pages: ResearchPageRecord[]): ResearchObservation[] {
  const found: ResearchObservation[] = [];
  for (const page of pages) {
    if (page.headline) {
      found.push(observation(page, "positioning", `“${page.headline}” is the lead line on ${page.label}.`, page.headline));
    }
    for (const line of page.proofLines) {
      found.push(observation(page, "proof", `${page.label} offers this as proof: “${trim(line)}”.`, line));
    }
    for (const signal of audienceFrom(`${page.headline} ${page.excerpt}`)) {
      found.push(observation(page, "audience", `${page.label} addresses ${signal}.`, signal));
    }
    if (found.length >= 24) break;
  }
  return found.slice(0, 24);
}

function observation(page: ResearchPageRecord, type: ResearchObservation["observationType"], text: string, evidenceText: string): ResearchObservation {
  return {
    id: `${page.role}-${type}-${foundId(evidenceText)}`,
    observation: text,
    sourceUrl: page.url,
    sourcePage: page.label,
    evidenceText: trim(evidenceText),
    observationType: type,
    epistemicStatus: "inference",
    claimScope: "published_copy",
  };
}

function audienceFrom(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.match(new RegExp(AUDIENCE, "gi")) ?? []) found.add(match.toLowerCase());
  return [...found].slice(0, 4);
}

function proofLines(excerpt: string): string[] {
  return excerpt
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12 && line.length < 220 && PROOF.test(line))
    .slice(0, 3);
}

function headings(html: string): string[] {
  const found: string[] = [];
  const pattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match = pattern.exec(html);
  while (match) {
    const text = decode(match[1]?.replace(/<[^>]+>/g, " ") ?? "").replace(/\s+/g, " ").trim();
    if (text && text.length < 80 && !found.includes(text)) found.push(text);
    if (found.length >= 8) break;
    match = pattern.exec(html);
  }
  return found;
}

function languageAcross(pages: ResearchPageRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const words = new Set(`${page.headline} ${page.excerpt}`.toLowerCase().match(/[a-z]{6,}/g) ?? []);
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([word]) => word).slice(0, 8);
}

function verbalCharacter(text: string): string {
  if (text.trim().length < 80) return "";
  const functional = (text.match(/material|joinery|specification|construction|process|detail/gi) ?? []).length;
  const emotional = (text.match(/love|beautiful|dream|feel|heart|joy/gi) ?? []).length;
  if (functional === 0 && emotional === 0) return "";
  if (functional > emotional) return "On the pages read, the language is more functional than emotional.";
  if (emotional > functional) return "On the pages read, the language is more emotional than functional.";
  return "";
}

function visibleText(html: string): string {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decode(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function trim(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function foundId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "line";
}
