import { extractPageObservations, observationHasSubstance } from "../src/domain/project/pageExtract";
import type { StoredResearch } from "../src/types/project";

const BLOCKED = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\])/;

export async function researchPage(rawUrl: string): Promise<StoredResearch> {
  const retrievedAt = new Date().toISOString();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return empty(rawUrl, retrievedAt, "That address could not be read.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return empty(url.toString(), retrievedAt, "Only a public web page can be read.");
  }
  if (BLOCKED.test(url.hostname)) {
    return empty(url.toString(), retrievedAt, "Brief does not fetch private addresses.");
  }
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html" },
    });
    if (!response.ok) return empty(url.toString(), retrievedAt, `The page returned ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.includes("html") && !type.includes("text")) {
      return empty(url.toString(), retrievedAt, "The address did not return a page of text.");
    }
    const html = (await response.text()).slice(0, 200_000);
    const observation = extractPageObservations(html, url.toString(), retrievedAt);
    if (!observationHasSubstance(observation)) {
      return empty(url.toString(), retrievedAt, "The page came back without a headline or readable text.");
    }
    return { url: url.toString(), retrievedAt, observation, unavailableReason: "" };
  } catch {
    return empty(url.toString(), retrievedAt, "The page could not be reached. Research is unavailable.");
  }
}

function empty(url: string, retrievedAt: string, unavailableReason: string): StoredResearch {
  return { url, retrievedAt, observation: null, unavailableReason };
}
