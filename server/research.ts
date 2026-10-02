import { extractPageObservations, observationHasSubstance } from "../src/domain/project/pageExtract";
import { researchSite, type PageFetch, type WebsiteResearchProvider } from "../src/domain/project/research/provider";
import type { StoredResearch } from "../src/types/project";

const BLOCKED = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\])/;

const htmlProvider: WebsiteResearchProvider = {
  id: "html",
  fetchPage: fetchHtml,
};

export async function researchPage(rawUrl: string): Promise<StoredResearch> {
  const fetched = await fetchHtml(rawUrl);
  if (!fetched.html.trim()) return empty(fetched.finalUrl || rawUrl, fetched.retrievedAt, fetched.unavailableReason || "Research is unavailable.");
  const observation = extractPageObservations(fetched.html, fetched.finalUrl, fetched.retrievedAt);
  if (!observationHasSubstance(observation)) {
    return empty(fetched.finalUrl, fetched.retrievedAt, "The page came back without a headline or readable text.");
  }
  return { url: fetched.finalUrl, retrievedAt: fetched.retrievedAt, observation, unavailableReason: "" };
}

/** Homepage, then a bounded set of internal pages. */
export function researchSiteUrl(rawUrl: string, businessName = ""): Promise<StoredResearch> {
  return researchSite(htmlProvider, rawUrl, { businessName, maxPages: 8 });
}

async function fetchHtml(rawUrl: string): Promise<PageFetch> {
  const retrievedAt = new Date().toISOString();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return missed(rawUrl, retrievedAt, "That address could not be read.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return missed(url.toString(), retrievedAt, "Only a public web page can be read.");
  }
  if (BLOCKED.test(url.hostname)) {
    return missed(url.toString(), retrievedAt, "Brief does not fetch private addresses.");
  }
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html" },
    });
    if (!response.ok) return missed(response.url || url.toString(), retrievedAt, `The page returned ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.includes("html") && !type.includes("text")) {
      return missed(response.url || url.toString(), retrievedAt, "The address did not return a page of text.");
    }
    const html = (await response.text()).slice(0, 200_000);
    return { requestedUrl: rawUrl, finalUrl: response.url || url.toString(), html, retrievedAt, unavailableReason: "" };
  } catch {
    return missed(url.toString(), retrievedAt, "The page could not be reached. Research is unavailable.");
  }
}

function missed(finalUrl: string, retrievedAt: string, unavailableReason: string): PageFetch {
  return { requestedUrl: finalUrl, finalUrl, html: "", retrievedAt, unavailableReason };
}

function empty(url: string, retrievedAt: string, unavailableReason: string): StoredResearch {
  return { url, retrievedAt, observation: null, unavailableReason };
}
