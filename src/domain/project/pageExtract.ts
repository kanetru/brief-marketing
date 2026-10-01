import type { PageObservation } from "../../types/project";

const STOP = new Set(["about", "their", "which", "there", "these", "those", "where", "while", "would", "could", "should", "other", "after", "before", "people", "business", "company", "brand"]);

/**
 * Reads only what is in the HTML. Missing tags stay empty.
 * A headline is what the page says, not a fact about the company.
 */
export function extractPageObservations(html: string, url: string, retrievedAt: string): PageObservation {
  const title = textContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "description");
  const headline = textContent(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || title;
  const excerpt = visibleText(html).slice(0, 700);
  const callsToAction = callToActions(html);
  const recurringLanguage = repeatedWords(excerpt);
  return {
    url,
    retrievedAt,
    headline,
    description,
    excerpt,
    callsToAction,
    recurringLanguage,
  };
}

export function observationHasSubstance(observation: PageObservation | null | undefined): boolean {
  if (!observation) return false;
  return Boolean(observation.headline.trim() || observation.description.trim() || observation.excerpt.trim());
}

function metaContent(html: string, name: string): string {
  const pattern = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const swapped = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`, "i");
  return decode(pattern.exec(html)?.[1] || swapped.exec(html)?.[1] || "");
}

function textContent(html: string, pattern: RegExp): string {
  const raw = pattern.exec(html)?.[1] ?? "";
  return decode(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function visibleText(html: string): string {
  const without = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decode(without).replace(/\s+/g, " ").trim();
}

function callToActions(html: string): string[] {
  const found: string[] = [];
  const pattern = /<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  let match = pattern.exec(html);
  while (match) {
    const label = decode(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (label.length > 1 && label.length < 48 && !found.includes(label)) found.push(label);
    if (found.length >= 6) break;
    match = pattern.exec(html);
  }
  return found;
}

function repeatedWords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z]{5,}/g) ?? []) {
    if (STOP.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 3).map(([word]) => word).slice(0, 6);
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
