import type { ResearchPageRole } from "../../../types/project";

export interface DiscoveredPage {
  url: string;
  role: ResearchPageRole;
  label: string;
  score: number;
}

const SKIP = /privacy|terms|cookie|cart|checkout|login|log-in|signin|sign-in|account|wp-admin|wp-login|tag\/|\/page\/\d|\/feed|sitemap|wishlist|search\/?$|\.(pdf|jpg|jpeg|png|gif|webp|zip|svg)(\?|$)/i;

const ROLES: Array<{ role: ResearchPageRole; score: number; test: RegExp; label: string }> = [
  { role: "about", score: 90, test: /about|our-story|story|who-we-are/, label: "About" },
  { role: "process", score: 88, test: /process|workshop|how-we|making|craft/, label: "Process" },
  { role: "services", score: 84, test: /services?/, label: "Services" },
  { role: "products", score: 82, test: /products?|collections?|shop|furniture/, label: "Products" },
  { role: "work", score: 80, test: /\/work|portfolio|projects?|case-stud/, label: "Work" },
  { role: "philosophy", score: 76, test: /philosoph|approach|values/, label: "Philosophy" },
  { role: "testimonials", score: 74, test: /testimonial|reviews?/, label: "Testimonials" },
  { role: "pricing", score: 70, test: /pricing|prices/, label: "Pricing" },
  { role: "faq", score: 66, test: /faq|questions/, label: "FAQ" },
  { role: "journal", score: 62, test: /journal|blog|news|notes/, label: "Journal" },
  { role: "contact", score: 55, test: /contact/, label: "Contact" },
];

/**
 * Picks a bounded set of internal pages from a homepage.
 * Utility, legal, and duplicate URLs are left unread.
 */
export function discoverPages(html: string, pageUrl: string, maxPages = 8): DiscoveredPage[] {
  const limit = Math.min(12, Math.max(1, maxPages));
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const home = normalise(base);
  const found = new Map<string, DiscoveredPage>();
  found.set(home, { url: home, role: "home", label: "Homepage", score: 100 });

  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = pattern.exec(html);
  while (match) {
    const href = match[1]?.trim() ?? "";
    const anchor = decode(match[2]?.replace(/<[^>]+>/g, " ") ?? "").replace(/\s+/g, " ").trim();
    const absolute = resolve(base, href);
    if (absolute && !found.has(absolute)) {
      const classified = classify(absolute, anchor);
      if (classified) found.set(absolute, classified);
    }
    match = pattern.exec(html);
  }

  const ranked = [...found.values()].filter((page) => page.role !== "home").sort((a, b) => b.score - a.score);
  const chosen: DiscoveredPage[] = [found.get(home)!];
  const usedRoles = new Set<ResearchPageRole>(["home"]);
  for (const page of ranked) {
    if (chosen.length >= limit) break;
    if (page.score < 50) continue;
    if (usedRoles.has(page.role) && page.role !== "work" && page.role !== "products") continue;
    usedRoles.add(page.role);
    chosen.push(page);
  }
  return chosen;
}

function classify(url: string, anchor: string): DiscoveredPage | null {
  const path = pathname(url);
  if (!path || SKIP.test(path) || SKIP.test(anchor)) return null;
  const blob = `${path} ${anchor}`.toLowerCase();
  const rule = ROLES.find((item) => item.test.test(blob));
  if (!rule) return null;
  return { url, role: rule.role, label: rule.label, score: rule.score };
}

function resolve(base: URL, href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return null;
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname !== base.hostname) return null;
    return normalise(url);
  } catch {
    return null;
  }
}

function normalise(url: URL): string {
  url.hash = "";
  url.search = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function pathname(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
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
