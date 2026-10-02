import { discoverPages } from "./discoverPages";
import { assembleSite, pageFromHtml, storedFromSite } from "./extractSite";
import type { ResearchPageRole, StoredResearch } from "../../../types/project";

/** A page the provider managed to retrieve. Empty html means the fetch failed. */
export interface PageFetch {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  retrievedAt: string;
  unavailableReason: string;
}

/**
 * Fetches public pages. Extraction and comparison stay outside the provider,
 * so a later search or browser provider can return the same page shape.
 */
export interface WebsiteResearchProvider {
  readonly id: string;
  fetchPage(url: string): Promise<PageFetch>;
}

export interface ResearchSiteOptions {
  maxPages?: number;
  businessName?: string;
  now?: string;
}

/**
 * Homepage, then a bounded set of internal pages. Failures are skipped.
 * Missing pages are not invented.
 */
export async function researchSite(
  provider: WebsiteResearchProvider,
  siteUrl: string,
  options: ResearchSiteOptions = {},
): Promise<StoredResearch> {
  const retrievedAt = options.now ?? new Date().toISOString();
  const home = await provider.fetchPage(siteUrl);
  if (!home.html.trim()) {
    return {
      url: home.finalUrl || siteUrl,
      retrievedAt,
      observation: null,
      site: null,
      unavailableReason: home.unavailableReason || "Research is unavailable.",
    };
  }
  const selected = discoverPages(home.html, home.finalUrl || siteUrl, options.maxPages ?? 8);
  const rest = selected.filter((page) => page.role !== "home");
  const fetched = await mapPool(rest, 4, (page) => provider.fetchPage(page.url));
  const pages = [
    toRecord(home.html, home.finalUrl || siteUrl, "home", "Homepage", retrievedAt),
    ...fetched.flatMap((page, index) => {
      const plan = rest[index];
      if (!plan || !page.html.trim()) return [];
      return toRecord(page.html, page.finalUrl || plan.url, plan.role, plan.label, retrievedAt);
    }),
  ].flat();
  if (pages.length === 0) {
    return {
      url: siteUrl,
      retrievedAt,
      observation: null,
      site: null,
      unavailableReason: "The page came back without a headline or readable text.",
    };
  }
  const site = assembleSite(home.finalUrl || siteUrl, options.businessName ?? "", retrievedAt, pages);
  return storedFromSite(site);
}

function toRecord(html: string, url: string, role: ResearchPageRole, label: string, retrievedAt: string) {
  const page = pageFromHtml(html, url, role, label, retrievedAt);
  return page ? [page] : [];
}

async function mapPool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
