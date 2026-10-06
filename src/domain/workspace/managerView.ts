import { splitNames } from "../market/context";
import { emptyMarketDiscovery, prominentAssessments } from "../market/review";
import { clientFacingCopy } from "../languageGuard";
import { formatFollowers } from "./marketCards";
import { mergeStats, statsForCandidate, statsForWatch, type CompetitorStats } from "./plainAnalytics";
import { textValue } from "../../state/textEvidence";
import type { BriefProject, CompetitorInput, CompetitorProfile, Opportunity, ProjectIntelligence } from "../../types/project";
import type { MarketAccountType, SocialAccountCandidate } from "../../types/marketDiscovery";
import type { MonitoredCompetitor } from "../../types/intelligence";

export type CompetitorBadge = "DIRECT" | "INDIRECT" | "REFERENCE" | "WATCH" | "EMERGING" | "NAMED";

export interface CompetitorView {
  id: string;
  name: string;
  badge: CompetitorBadge;
  platforms: string;
  owns: string;
  themes: string;
  change: string;
  metrics: string[];
  summary: string;
  why: string;
  positioning: string;
  posts: string[];
  language: string;
  social: string;
  evidence: string;
  stats?: CompetitorStats;
}

export interface MarketCardView {
  id: string;
  title: string;
  text: string;
  share: string;
  ratio: number | null;
}

export interface MatterCard {
  id: string;
  kicker: string;
  text: string;
}

export interface OpportunityView {
  id: string;
  index: string;
  title: string;
  why: string;
  move: string;
  could: string;
  saved: boolean;
  basis?: string[];
}

export interface OriginalResponse {
  label: string;
  text: string;
}

const COULD: Record<string, string> = {
  positioning: "Positioning",
  proof: "Proof",
  content: "Campaign · Post",
  channel: "Channel",
  visual: "Visual",
  gap: "Contrast",
  campaign: "Campaign",
  format: "Format",
};

function clip(text: string, max = 180): string {
  const clean = clientFacingCopy(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
}

const BADGE_LABEL: Record<CompetitorBadge, string> = {
  DIRECT: "Direct competitor",
  INDIRECT: "Indirect",
  REFERENCE: "Reference",
  WATCH: "Watch",
  EMERGING: "Emerging",
  NAMED: "Named",
};

export function badgeLabel(badge: CompetitorBadge): string {
  return BADGE_LABEL[badge];
}

function badgeFor(value: string): CompetitorBadge {
  if (value === "direct" || value === "direct_competitor") return "DIRECT";
  if (value === "indirect" || value === "indirect_competitor") return "INDIRECT";
  if (value === "market_reference" || value === "substitute") return "REFERENCE";
  if (value === "watch_account") return "WATCH";
  if (value === "emerging_account") return "EMERGING";
  return "NAMED";
}

function hiddenIds(project: BriefProject): Set<string> {
  return new Set(
    (project.watch?.reactions ?? [])
      .filter((item) => item.action === "dismiss" || item.action === "not_relevant" || item.action === "reject")
      .map((item) => item.targetId),
  );
}

function savedIds(project: BriefProject): Set<string> {
  return new Set((project.watch?.reactions ?? []).filter((item) => item.action === "save").map((item) => item.targetId));
}

export function theRead(intelligence: ProjectIntelligence): string {
  const text = intelligence.clientBrain.output.clientRead.trim();
  if (!text || /no model reading/i.test(text)) return "";
  const parts = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return clientFacingCopy((parts.length > 0 ? parts : [text]).slice(0, 3).join("\n\n"));
}

export function matterCards(project: BriefProject, intelligence: ProjectIntelligence): MatterCard[] {
  const cards: MatterCard[] = [];
  for (const item of intelligence.clientBrain.output.observations) {
    if (!item.body.trim() || /no model/i.test(item.body)) continue;
    cards.push({ id: item.id, kicker: item.title || "Note", text: clip(item.body, 240) });
  }
  const reading = project.watch?.readings[0];
  for (const item of reading?.importantChanges ?? []) {
    if (cards.length >= 5) break;
    const body = [item.headline, item.whyItMatters].filter(Boolean).join(" ");
    cards.push({ id: item.id, kicker: item.eyebrow || "Now", text: clip(body, 240) });
  }
  const statement = intelligence.strategy.positioning?.statement?.trim() ?? "";
  if (cards.length < 2 && statement) {
    cards.unshift({ id: "positioning", kicker: "Positioning", text: clip(statement, 240) });
  }
  return cards.slice(0, 5);
}

export function overviewNeedsResearch(project: BriefProject): boolean {
  const origin = project.marketDiscovery?.origin ?? "idle";
  const watched = (project.watch?.competitors?.length ?? 0) > 0 || (project.marketDiscovery?.candidates.length ?? 0) > 0;
  return !watched && origin === "idle";
}

function platformName(value: string): string {
  const text = value.toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("linkedin")) return "LinkedIn";
  return "";
}

function fromCandidate(candidate: SocialAccountCandidate | undefined, classification: MarketAccountType | "named", id: string, name: string, why: string, summary: string): CompetitorView {
  const platform = candidate ? platformName(candidate.platform) : "";
  const followers = candidate?.followers ? formatFollowers(String(candidate.followers)) : "";
  const posts = (candidate?.recentPosts ?? []).map((post) => clip(post.caption ?? "", 140)).filter(Boolean).slice(0, 3);
  return {
    id,
    name,
    badge: badgeFor(classification),
    platforms: platform,
    owns: clip(summary || candidate?.bio || why || "Named during discovery."),
    themes: "",
    change: "",
    metrics: platform && followers ? [`${platform} ${followers}`] : [],
    summary: clip(summary || candidate?.bio || "", 320),
    why: clip(why, 320),
    positioning: clip(summary, 320),
    posts,
    language: clip(candidate?.bio ?? "", 220),
    social: [platform, candidate?.handle ? `@${candidate.handle}` : ""].filter(Boolean).join(" "),
    evidence: clip(why, 320),
    stats: candidate ? statsForCandidate(candidate, candidate.retrievedAt) : undefined,
  };
}

function fromListed(input: CompetitorInput, profile: CompetitorProfile | undefined): CompetitorView {
  const owns = clip(profile?.apparentPositioning || input.notes || "");
  return {
    id: input.id,
    name: input.name,
    badge: "DIRECT",
    platforms: "",
    owns,
    themes: "",
    change: "",
    metrics: [],
    summary: owns,
    why: clip(profile?.differentiation || input.notes || ""),
    positioning: owns,
    posts: [],
    language: clip(profile?.language || "", 220),
    social: "",
    evidence: clip(profile?.proof || input.notes || "", 320),
  };
}

function fromWatched(competitor: MonitoredCompetitor, profiles: ProjectIntelligence["competitors"], project: BriefProject): CompetitorView {
  const profile = profiles.find((item) => item.name.toLowerCase() === competitor.name.toLowerCase());
  const researched = (project.watch?.competitors ?? []).find((item) => item.id === competitor.id) ?? competitor;
  const signals = (project.watch?.signals ?? []).filter((signal) => signal.entityId === researched.id || signal.entity === researched.name);
  const ordered = [...signals].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const themeSkip = new Set(["followers", "follower", "headline", "demo", "sample", "metric"]);
  const themes = [...new Set(ordered.flatMap((signal) => (signal.metadata.themes ?? "").split(/[,·]/).map((item) => item.trim()).filter((item) => item && !themeSkip.has(item.toLowerCase()))))].slice(0, 4);
  const latest = researched.snapshots[researched.snapshots.length - 1];
  const handles = researched.socialHandles.map(platformName).filter(Boolean);
  const platforms = [...new Set(handles)];
  const rawFollowers = latest?.metrics.followers ?? "";
  const followers = formatFollowers(rawFollowers);
  const newest = ordered[0];
  const metric = followers ? `${followers}${/demo/i.test(rawFollowers) ? " · demo" : ""}` : "";
  const stats = statsForWatch(researched, researched.lastCheckedAt || project.updatedAt);
  stats.themes = themes.map((theme) => theme.charAt(0).toUpperCase() + theme.slice(1)).join(" · ");
  const change = newest?.title ? clip(newest.title, 80) : "";
  if (change && !/demo/i.test(change)) stats.changes = [...stats.changes, change];
  return {
    id: researched.id,
    name: researched.name,
    badge: badgeFor(researched.relationship),
    platforms: platforms.join(" · "),
    owns: clip(profile?.apparentPositioning || profile?.offer || latest?.note || "Being watched."),
    themes: themes.map((theme) => theme.charAt(0).toUpperCase() + theme.slice(1)).join(" · "),
    change: clip(newest?.title || latest?.note || "", 120),
    metrics: metric ? [metric] : [],
    summary: clip(profile?.headline || profile?.apparentPositioning || newest?.description || "", 320),
    why: clip(profile?.differentiation || newest?.description || "", 320),
    positioning: clip(profile?.apparentPositioning || "", 320),
    posts: ordered.slice(0, 3).map((signal) => clip(signal.title, 140)),
    language: clip(profile?.language || "", 220),
    social: platforms.join(" · "),
    evidence: clip(newest?.evidence?.join(" ") || profile?.proof || "", 320),
    stats,
  };
}

function mergeCompetitor(current: CompetitorView, next: CompetitorView): CompetitorView {
  return {
    ...current,
    platforms: [...new Set(`${current.platforms} · ${next.platforms}`.split(" · ").map((item) => item.trim()).filter(Boolean))].join(" · "),
    themes: current.themes || next.themes,
    stats: mergeStats(current.stats, next.stats),
    posts: [...current.posts, ...next.posts].slice(0, 3),
  };
}

export function competitorViews(project: BriefProject, intelligence: ProjectIntelligence): CompetitorView[] {
  const record = project.marketDiscovery ?? emptyMarketDiscovery(project.updatedAt);
  const views: CompetitorView[] = [];
  const index = new Map<string, number>();
  const place = (view: CompetitorView) => {
    const key = view.name.trim().toLowerCase();
    if (!key) return;
    const existing = index.get(key);
    if (existing === undefined) {
      index.set(key, views.length);
      views.push(view);
      return;
    }
    views[existing] = mergeCompetitor(views[existing]!, view);
  };
  for (const assessment of prominentAssessments(record)) {
    const candidate = record.candidates.find((item) => item.id === assessment.candidateId);
    const name = candidate?.displayName || candidate?.handle || "Account";
    place(fromCandidate(candidate, assessment.classification, assessment.candidateId, name, assessment.whyItMatters, assessment.summary));
  }
  for (const competitor of project.watch?.competitors ?? []) {
    place(fromWatched(competitor, intelligence.competitors, project));
  }
  for (const input of project.competitors ?? []) {
    const profile = intelligence.competitors.find((item) => item.name.toLowerCase() === input.name.toLowerCase());
    place(fromListed(input, profile));
  }
  const named = splitNames(project.discovery?.strategyInputs?.neighbours?.state === "evidence" ? project.discovery.strategyInputs.neighbours.evidence.raw : "");
  for (const name of named) {
    place(fromCandidate(undefined, "named", `named-${name}`, name, "Named during discovery. Not checked.", "Named during discovery."));
  }
  return views;
}

function marketTitle(title: string, statement: string): string {
  const quoted = statement.match(/"([^"]+)"/);
  const word = quoted?.[1]?.trim();
  if (word && /^category pattern$|^visual pattern$/i.test(title)) return word;
  return title;
}

export function marketCards(intelligence: ProjectIntelligence): MarketCardView[] {
  return (intelligence.category?.patterns ?? []).filter((pattern) => pattern.title.trim() && pattern.statement.trim()).map((pattern) => {
    const ratio = pattern.total > 0 ? Math.max(0, Math.min(1, pattern.count / pattern.total)) : null;
    return {
      id: pattern.id,
      title: marketTitle(pattern.title, pattern.statement),
      text: clip(pattern.statement, 240),
      share: pattern.total > 0 ? `${pattern.count} of ${pattern.total}` : "",
      ratio,
    };
  });
}

export function opportunityViews(project: BriefProject, intelligence: ProjectIntelligence): OpportunityView[] {
  const hidden = hiddenIds(project);
  const saved = savedIds(project);
  return intelligence.opportunities.filter((item) => !hidden.has(item.id)).slice(0, 8).map((item, index) => toOpportunity(item, index, saved.has(item.id)));
}

function toOpportunity(item: Opportunity, index: number, saved: boolean): OpportunityView {
  return {
    id: item.id,
    index: String(index + 1).padStart(2, "0"),
    title: item.title,
    why: clip(item.why, 280),
    move: clip(item.action, 220),
    could: COULD[item.type] ?? "A next piece of work",
    saved,
    basis: [...(item.clientEvidence ?? []), ...(item.marketEvidence ?? [])].map((line) => clip(line, 280)).filter(Boolean),
  };
}

export function originalResponses(project: BriefProject): OriginalResponse[] {
  const session = project.discovery;
  const inputs = session.strategyInputs;
  const lines: OriginalResponse[] = [];
  const push = (label: string, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) lines.push({ label, text: clean });
  };
  push("What they do", textValue(session.business.description));
  push("Name", textValue(session.business.name));
  for (const offer of inputs.offers) {
    push("Offer", [offer.name, offer.description, offer.priceLabel].filter(Boolean).join(" · "));
  }
  push("Come for", textValue(session.business.peopleComeFor));
  push("Difference", session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "");
  push("Audience", textValue(session.audience.bestCustomers));
  push("A year from now", textValue(session.goals.twelveMonthSuccess));
  push("Compared with", inputs.neighbours.state === "evidence" ? inputs.neighbours.evidence.raw : "");
  return lines;
}

export function researchFailed(project: BriefProject): boolean {
  const record = project.marketDiscovery;
  if (!record || record.candidates.length > 0) return false;
  return record.origin === "unavailable" || (record.message.trim().length > 0 && record.origin !== "idle");
}

export interface ResearchPartial {
  discovered: number;
  instagramFailed: boolean;
  tiktokFailed: boolean;
  classificationFailed: boolean;
}

/** A run that kept accounts from a stage that did finish. */
export function researchPartial(project: BriefProject): ResearchPartial | null {
  const record = project.marketDiscovery;
  const stages = record?.stages;
  if (!record || !stages || record.candidates.length === 0) return null;
  const instagramFailed = stages.instagram.status === "failed";
  const tiktokFailed = stages.tiktok.status === "failed";
  const classificationFailed = stages.classification.status === "failed";
  if (!instagramFailed && !tiktokFailed && !classificationFailed) return null;
  return { discovered: record.candidates.length, instagramFailed, tiktokFailed, classificationFailed };
}
