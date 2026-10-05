import type {
  IdentityProposal,
  SocialAccountCandidate,
  SocialDiscoveryQuery,
} from "../../types/marketDiscovery";
import { MARKET_DISCOVERY_LIMITS } from "./limits";

export interface RankedCandidate {
  candidate: SocialAccountCandidate;
  /** Cheap ordering only. Not a relevance score and not shown to the manager. */
  order: number;
}

export function candidateId(platform: SocialAccountCandidate["platform"], handle: string): string {
  return `${platform}:${handle.replace(/^@/, "").toLowerCase()}`;
}

export function publicProfileUrl(platform: SocialAccountCandidate["platform"], handle: string): string {
  const name = handle.replace(/^@/, "");
  return platform === "instagram" ? `https://www.instagram.com/${name}/` : `https://www.tiktok.com/@${name}`;
}

export function dedupeCandidates(found: readonly SocialAccountCandidate[]): SocialAccountCandidate[] {
  const byId = new Map<string, SocialAccountCandidate>();
  for (const item of found) {
    const id = candidateId(item.platform, item.handle);
    const previous = byId.get(id);
    if (!previous) {
      byId.set(id, { ...item, id, handle: item.handle.replace(/^@/, ""), sourceQueries: unique(item.sourceQueries), discoveryFrequency: unique(item.sourceQueries).length });
      continue;
    }
    const sourceQueries = unique([...previous.sourceQueries, ...item.sourceQueries]);
    byId.set(id, {
      ...previous,
      displayName: previous.displayName || item.displayName,
      bio: previous.bio || item.bio,
      website: previous.website || item.website,
      followers: previous.followers ?? item.followers,
      following: previous.following ?? item.following,
      recentPosts: previous.recentPosts.length >= item.recentPosts.length ? previous.recentPosts : item.recentPosts,
      sourceQueries,
      discoveryFrequency: sourceQueries.length,
      clientClaim: previous.clientClaim || item.clientClaim,
      enriched: previous.enriched || item.enriched,
      providerStatus: previous.providerStatus === "unavailable" ? item.providerStatus : previous.providerStatus,
    });
  }
  return [...byId.values()];
}

export function preRank(candidates: readonly SocialAccountCandidate[], queries: readonly SocialDiscoveryQuery[], contextTerms: readonly string[]): RankedCandidate[] {
  const types = new Map(queries.map((item) => [item.id, item.queryType]));
  const terms = contextTerms.map(normalise).filter((item) => item.length > 3);
  return candidates
    .map((candidate) => ({ candidate, order: orderOf(candidate, types, terms) }))
    .sort((a, b) => b.order - a.order || b.candidate.discoveryFrequency - a.candidate.discoveryFrequency || a.candidate.handle.localeCompare(b.candidate.handle));
}

export function poolCandidates(ranked: readonly RankedCandidate[]): SocialAccountCandidate[] {
  return ranked.slice(0, MARKET_DISCOVERY_LIMITS.pool).map((item) => item.candidate);
}

export function chooseEnrichment(ranked: readonly RankedCandidate[]): SocialAccountCandidate[] {
  const chosen: SocialAccountCandidate[] = [];
  const counts = { instagram: 0, tiktok: 0 };
  const named = ranked.filter((item) => item.candidate.clientClaim);
  const rest = ranked.filter((item) => !item.candidate.clientClaim);
  for (const item of [...named, ...rest]) {
    if (chosen.length >= MARKET_DISCOVERY_LIMITS.enrichCap) break;
    if (counts[item.candidate.platform] >= MARKET_DISCOVERY_LIMITS.enrichPerPlatform && !item.candidate.clientClaim) continue;
    if (counts[item.candidate.platform] >= MARKET_DISCOVERY_LIMITS.enrichPerPlatform + 1) continue;
    counts[item.candidate.platform] += 1;
    chosen.push(item.candidate);
  }
  return chosen;
}

/**
 * Same handle on two platforms is not the same business.
 * A proposal needs the display name and a second signal: website or a bio that names the other handle.
 */
export function proposeIdentities(candidates: readonly SocialAccountCandidate[]): IdentityProposal[] {
  const proposals: IdentityProposal[] = [];
  const instagram = candidates.filter((item) => item.platform === "instagram");
  const tiktok = candidates.filter((item) => item.platform === "tiktok");
  const used = new Set<string>();
  for (const left of instagram) {
    for (const right of tiktok) {
      const pair = [left.id, right.id].sort().join("|");
      if (used.has(pair)) continue;
      const reason = matchReason(left, right);
      if (!reason) continue;
      used.add(pair);
      proposals.push({
        id: `identity-${pair.replace(/[^a-z0-9|]/gi, "")}`,
        name: left.displayName || right.displayName || left.handle,
        accountIds: [left.id, right.id],
        confidence: "proposed",
        reason,
      });
    }
  }
  return proposals;
}

export function clientClaimFor(name: string, handle: string, knownCompetitors: readonly string[]): string {
  const hit = knownCompetitors.some((item) => namesMatch(item, name) || namesMatch(item, handle));
  return hit ? "Client says this is a competitor." : "";
}

export function contextTerms(parts: readonly string[]): string[] {
  const words = parts.join(" ").toLowerCase().match(/[a-z][a-z0-9]{4,}/g) ?? [];
  return [...new Set(words)].slice(0, 24);
}

function orderOf(candidate: SocialAccountCandidate, types: Map<string, SocialDiscoveryQuery["queryType"]>, terms: string[]): number {
  const kinds = new Set(candidate.sourceQueries.map((id) => types.get(id)).filter(Boolean));
  let order = 0;
  if (candidate.clientClaim) order += 8;
  if (candidate.discoveryFrequency >= 2) order += 4;
  if (kinds.size >= 2) order += 2;
  const blob = normalise(`${candidate.displayName} ${candidate.bio} ${candidate.handle}`);
  if (terms.some((term) => blob.includes(term))) order += 2;
  return order;
}

function matchReason(left: SocialAccountCandidate, right: SocialAccountCandidate): string {
  const leftName = normalise(left.displayName);
  const rightName = normalise(right.displayName);
  if (leftName.length < 4 || leftName !== rightName) return "";
  const leftHost = hostOf(left.website);
  const rightHost = hostOf(right.website);
  if (leftHost && leftHost === rightHost) return "Same display name and the same website.";
  const leftBio = normalise(left.bio);
  const rightBio = normalise(right.bio);
  if (right.handle && leftBio.includes(normalise(right.handle))) return "Same display name, and the Instagram bio names the TikTok handle.";
  if (left.handle && rightBio.includes(normalise(left.handle))) return "Same display name, and the TikTok bio names the Instagram handle.";
  return "";
}

export function namesMatch(known: string, value: string): boolean {
  const left = normalise(known);
  const right = normalise(value);
  if (left.length < 4 || right.length < 4) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
