import type { BriefProject } from "../../types/project";
import type { NormalizedSocialPost, SocialAccountCandidate } from "../../types/marketDiscovery";
import type { MonitoredCompetitor } from "../../types/intelligence";

export interface SocialStat {
  platform: string;
  handle: string;
  followers: string;
  url: string;
}

export interface MetricLine {
  label: string;
  value: string;
}

export interface PostLine {
  text: string;
  detail: string;
}

export interface CompetitorStats {
  website: string;
  websiteUrl: string;
  accounts: SocialStat[];
  metrics: MetricLine[];
  changes: string[];
  themes: string;
  topPosts: PostLine[];
  monitoredSince: string;
  updated: string;
  historyNote: string;
  followersSeries: number[];
}

export interface MarketFacts {
  competitors: number;
  posts: number;
  facts: string[];
  growing: string[];
  declining: string[];
  topics: string[];
  interpretation: string[];
}

export function compactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function trackedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function trackingNote(iso: string): string {
  const when = trackedOn(iso);
  if (!when) return "Trends will appear as Brief collects more data.";
  return `Tracking started ${when}. Trends will appear as Brief collects more data.`;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMean(value: number): string {
  if (value >= 1000) return compactCount(value);
  if (value >= 10) return String(Math.round(value));
  return value.toFixed(1).replace(/\.0$/, "");
}

export function postsPerWeek(posts: Array<{ publishedAt: string | null }>): string {
  const times = posts
    .map((post) => post.publishedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (times.length < 2) return "";
  const span = times[times.length - 1]! - times[0]!;
  if (span < 86_400_000) return "";
  const rate = times.length / (span / (7 * 86_400_000));
  return rate.toFixed(1).replace(/\.0$/, "");
}

function engagement(followers: number | null, posts: NormalizedSocialPost[]): string {
  if (!followers || followers <= 0) return "";
  const rates: number[] = [];
  for (const post of posts) {
    const likes = typeof post.likes === "number" ? post.likes : null;
    const comments = typeof post.comments === "number" ? post.comments : null;
    if (likes === null && comments === null) continue;
    rates.push((((likes ?? 0) + (comments ?? 0)) / followers) * 100);
  }
  const value = mean(rates);
  if (value === null) return "";
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function averageOf(posts: NormalizedSocialPost[], key: "likes" | "comments" | "views"): string {
  const values = posts.map((post) => post[key]).filter((value): value is number => typeof value === "number");
  const value = mean(values);
  return value === null ? "" : formatMean(value);
}

export function themeList(posts: Array<{ hashtags?: string[] }>, limit = 3): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const post of posts) {
    for (const tag of post.hashtags ?? []) {
      const clean = tag.replace(/^#/, "").trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      const current = counts.get(key);
      counts.set(key, { label: current?.label ?? (clean.charAt(0).toUpperCase() + clean.slice(1)), count: (current?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((item) => item.label);
}

function platformName(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("youtube")) return "YouTube";
  return "";
}

function websiteParts(raw: string): { website: string; websiteUrl: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { website: "", websiteUrl: "" };
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return { website: new URL(href).host.replace(/^www\./, ""), websiteUrl: href };
  } catch {
    return { website: "", websiteUrl: "" };
  }
}

function metricLines(posts: NormalizedSocialPost[], followers: number | null): MetricLine[] {
  const lines: MetricLine[] = [];
  const rate = postsPerWeek(posts);
  if (rate) lines.push({ label: "Posts / week", value: rate });
  const engaged = engagement(followers, posts);
  if (engaged) lines.push({ label: "Avg engagement", value: engaged });
  const likes = averageOf(posts, "likes");
  if (likes) lines.push({ label: "Avg likes", value: likes });
  const comments = averageOf(posts, "comments");
  if (comments) lines.push({ label: "Avg comments", value: comments });
  const views = averageOf(posts, "views");
  if (views) lines.push({ label: "Avg views", value: views });
  return lines;
}

function postLines(posts: NormalizedSocialPost[]): PostLine[] {
  return posts
    .map((post) => {
      const text = (post.caption ?? "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      const bits = [
        typeof post.likes === "number" ? `${compactCount(post.likes)} likes` : "",
        typeof post.comments === "number" ? `${compactCount(post.comments)} comments` : "",
        typeof post.views === "number" ? `${compactCount(post.views)} views` : "",
      ].filter(Boolean);
      return { text: text.length > 140 ? `${text.slice(0, 139).trim()}…` : text, detail: bits.join(" · ") };
    })
    .filter((item): item is PostLine => item !== null)
    .slice(0, 3);
}

export function statsForCandidate(candidate: SocialAccountCandidate, since: string): CompetitorStats {
  const platform = platformName(candidate.platform);
  const followers = typeof candidate.followers === "number" && candidate.followers > 0 ? compactCount(candidate.followers) : "";
  const site = websiteParts(candidate.website);
  const themes = themeList(candidate.recentPosts);
  return {
    ...site,
    accounts: platform ? [{
      platform,
      handle: candidate.handle?.replace(/^@/, "") ?? "",
      followers,
      url: candidate.profileUrl || "",
    }] : [],
    metrics: metricLines(candidate.recentPosts, typeof candidate.followers === "number" ? candidate.followers : null),
    changes: [],
    themes: themes.join(" · "),
    topPosts: postLines(candidate.recentPosts),
    monitoredSince: trackedOn(since),
    updated: trackedOn(candidate.retrievedAt),
    historyNote: trackingNote(since),
    followersSeries: [],
  };
}

function followerNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function statsForWatch(competitor: MonitoredCompetitor, since: string): CompetitorStats {
  const snapshots = competitor.snapshots ?? [];
  const series = snapshots.map((snapshot) => followerNumber(snapshot.metrics.followers)).filter((value): value is number => value !== null);
  const latest = series[series.length - 1] ?? null;
  const previous = series.length >= 2 ? series[0]! : null;
  const changes: string[] = [];
  if (previous !== null && latest !== null && latest > previous) changes.push("Followers up");
  if (previous !== null && latest !== null && latest < previous) changes.push("Followers down");
  const accounts = [...new Set(competitor.socialHandles.map(platformName).filter(Boolean))].map((platform) => ({
    platform,
    handle: "",
    followers: latest ? compactCount(latest) : "",
    url: "",
  }));
  const site = websiteParts(competitor.website);
  return {
    ...site,
    accounts,
    metrics: [],
    changes,
    themes: "",
    topPosts: [],
    monitoredSince: trackedOn(snapshots[0]?.at || since),
    updated: trackedOn(competitor.lastCheckedAt || since),
    historyNote: series.length >= 2 ? "" : trackingNote(snapshots[0]?.at || since),
    followersSeries: series.length >= 2 ? series : [],
  };
}

export function mergeStats(current: CompetitorStats | undefined, next: CompetitorStats | undefined): CompetitorStats | undefined {
  if (!current) return next;
  if (!next) return current;
  const accounts = [...current.accounts];
  for (const account of next.accounts) {
    const key = `${account.platform}:${account.handle}`.toLowerCase();
    if (!accounts.some((item) => `${item.platform}:${item.handle}`.toLowerCase() === key)) accounts.push(account);
  }
  const metrics = [...current.metrics];
  for (const metric of next.metrics) {
    if (!metrics.some((item) => item.label === metric.label)) metrics.push(metric);
  }
  const themes = [...new Set(`${current.themes} · ${next.themes}`.split(" · ").map((item) => item.trim()).filter(Boolean))].slice(0, 4);
  return {
    website: current.website || next.website,
    websiteUrl: current.websiteUrl || next.websiteUrl,
    accounts,
    metrics,
    changes: [...new Set([...current.changes, ...next.changes])],
    themes: themes.join(" · "),
    topPosts: [...current.topPosts, ...next.topPosts].slice(0, 3),
    monitoredSince: current.monitoredSince || next.monitoredSince,
    updated: next.updated || current.updated,
    historyNote: (current.followersSeries.length >= 2 || next.followersSeries.length >= 2) ? "" : (current.historyNote || next.historyNote),
    followersSeries: current.followersSeries.length >= 2 ? current.followersSeries : next.followersSeries,
  };
}

export function marketFacts(project: BriefProject): MarketFacts {
  const candidates = project.marketDiscovery?.candidates ?? [];
  const names = new Set<string>();
  for (const candidate of candidates) names.add((candidate.displayName || candidate.handle || "").trim().toLowerCase());
  for (const competitor of project.watch?.competitors ?? []) names.add(competitor.name.trim().toLowerCase());
  for (const competitor of project.competitors ?? []) names.add(competitor.name.trim().toLowerCase());
  names.delete("");
  const posts = candidates.flatMap((candidate) => candidate.recentPosts ?? []);
  const video = posts.filter((post) => post.mediaType === "video").length;
  const topics = themeList(posts, 5);
  const facts: string[] = [];
  if (names.size > 0) facts.push(`${names.size} ${names.size === 1 ? "competitor" : "competitors"} tracked`);
  if (posts.length > 0) facts.push(`${posts.length} ${posts.length === 1 ? "post" : "posts"} analysed`);
  if (video > 0) facts.push(`${video} video ${video === 1 ? "post" : "posts"}`);
  const rate = postsPerWeek(posts);
  if (rate) facts.push(`Average posting frequency ${rate} / week`);
  const interpretation: string[] = [];
  if (posts.length > 0 && video > 0) {
    interpretation.push(`${video} of the ${posts.length} posts Brief has collected are video.`);
  }
  if (topics[0]) {
    const tag = topics[0].toLowerCase();
    const talking = candidates.filter((candidate) => (candidate.recentPosts ?? []).some((post) => (post.hashtags ?? []).some((item) => item.replace(/^#/, "").toLowerCase() === tag)));
    if (talking.length > 0) {
      interpretation.push(`${talking.length} of the ${Math.max(candidates.length, talking.length)} competitors Brief is tracking have posted about ${tag}.`);
    }
  }
  const ranked = posts.filter((post) => typeof post.likes === "number" && post.caption?.trim());
  ranked.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  const strongest = ranked[0];
  if (strongest?.caption) {
    const caption = strongest.caption.replace(/\s+/g, " ").trim();
    interpretation.push(`The strongest post Brief has collected, by likes, says: ${caption.length > 120 ? `${caption.slice(0, 119).trim()}…` : caption}`);
  }
  return {
    competitors: names.size,
    posts: posts.length,
    facts,
    growing: [],
    declining: [],
    topics,
    interpretation,
  };
}
