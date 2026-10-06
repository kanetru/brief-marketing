import type { NormalizedSocialPost, SocialAccountCandidate, SocialPlatform } from "../src/types/marketDiscovery";

export interface ParsedSearchHit {
  platform: SocialPlatform;
  handle: string;
  displayName: string;
  bio: string;
  followers: number | null;
  following: number | null;
  providerId: string;
}

export function parseInstagramSearch(payload: unknown): ParsedSearchHit[] {
  const data = unwrap(payload);
  const users = arrayAt(data, "users");
  return users.flatMap((item) => {
    const user = objectOf(objectOf(item)?.user) ?? objectOf(item) ?? {};
    const handle = text(user.username);
    if (!handle) return [];
    return [{
      platform: "instagram" as const,
      handle,
      displayName: text(user.full_name),
      bio: "",
      followers: null,
      following: null,
      providerId: text(user.pk) || text(user.id),
    }];
  });
}

export function parseTikTokUserSearch(payload: unknown): ParsedSearchHit[] {
  const data = unwrap(payload);
  const users = arrayAt(data, "users");
  return users.flatMap((item) => {
    const node = record(item);
    const user = objectOf(node.user_info) ?? objectOf(node.user) ?? node;
    const handle = text(user.unique_id) || text(user.uniqueId) || text(user.username);
    if (!handle) return [];
    return [{
      platform: "tiktok" as const,
      handle,
      displayName: text(user.nickname) || text(user.nick_name),
      bio: text(user.signature),
      followers: count(user.follower_count, user.followerCount),
      following: count(user.following_count, user.followingCount),
      providerId: text(user.uid) || text(user.id),
    }];
  });
}

export function parseTikTokKeywordAuthors(payload: unknown): ParsedSearchHit[] {
  const data = unwrap(payload);
  const nested = record(data.data);
  const posts = arrayAt(data, "data").concat(arrayAt(data, "aweme_list"), arrayAt(nested, "aweme_list"));
  return posts.flatMap((item) => {
    const node = record(item);
    const aweme = record(node.aweme_info);
    const author = record(aweme.author ?? node.author);
    const handle = text(author.unique_id) || text(author.uniqueId);
    if (!handle) return [];
    return [{
      platform: "tiktok" as const,
      handle,
      displayName: text(author.nickname),
      bio: text(author.signature),
      followers: count(author.follower_count),
      following: null,
      providerId: text(author.uid) || text(author.sec_uid),
    }];
  });
}

export function parseInstagramDetailed(payload: unknown, retrievedAt: string): Partial<SocialAccountCandidate> & { posts: NormalizedSocialPost[] } {
  const data = unwrap(payload);
  const user = objectOf(data.user) ?? data;
  const handle = text(user.username);
  const posts = instagramPosts(user, handle, retrievedAt);
  return {
    handle,
    displayName: text(user.full_name),
    bio: text(user.biography) || text(user.bio),
    website: text(user.external_url),
    followers: count(record(user.edge_followed_by).count, user.follower_count, user.followerCount),
    following: count(record(user.edge_follow).count, user.following_count, user.followingCount),
    posts,
  };
}

export function parseTikTokInfo(payload: unknown): Partial<SocialAccountCandidate> {
  const data = unwrap(payload);
  const user = objectOf(data.user) ?? data;
  const stats = record(data.stats);
  return {
    handle: text(user.uniqueId) || text(user.unique_id),
    displayName: text(user.nickname),
    bio: text(user.signature),
    website: text(user.bioLink) || text(record(user.bioLink).link) || "",
    followers: count(stats.followerCount, user.follower_count),
    following: count(stats.followingCount, user.following_count),
  };
}

export function parseTikTokPosts(payload: unknown, handle: string, retrievedAt: string): NormalizedSocialPost[] {
  const data = unwrap(payload);
  const posts = arrayAt(data, "data").concat(arrayAt(data, "aweme_list"));
  return posts.slice(0, 12).flatMap((item) => tiktokPost(record(item), handle, retrievedAt));
}

export function reportedUnits(payload: unknown, headers: { get(name: string): string | null }): number | undefined {
  const header = headers.get("units") ?? headers.get("x-units-charged") ?? headers.get("x-units");
  if (header && /^\d+$/.test(header.trim())) return Number(header.trim());
  const body = record(payload);
  const value = body.units ?? body.units_charged ?? body.unitsCharged;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function instagramPosts(user: Record<string, unknown>, handle: string, retrievedAt: string): NormalizedSocialPost[] {
  const media = record(user.edge_owner_to_timeline_media);
  const edges = arrayAt(media, "edges");
  const fromEdges = edges.flatMap((edge) => instagramPost(record(record(edge).node), handle, retrievedAt));
  if (fromEdges.length > 0) return fromEdges;
  return arrayAt(user, "posts").flatMap((item) => instagramPost(record(item), handle, retrievedAt));
}

function instagramPost(node: Record<string, unknown>, handle: string, retrievedAt: string): NormalizedSocialPost[] {
  const captionEdge = arrayAt(record(node.edge_media_to_caption), "edges")[0];
  const caption = text(record(record(captionEdge).node).text) || text(node.caption) || text(record(node.caption).text);
  const id = text(node.id) || text(node.shortcode) || text(node.pk);
  if (!id && !caption) return [];
  const shortcode = text(node.shortcode);
  const taken = count(node.taken_at_timestamp, node.taken_at);
  const video = node.is_video === true || text(node.__typename) === "GraphVideo";
  const carousel = text(node.__typename) === "GraphSidecar" || node.media_type === 8;
  return [{
    platform: "instagram",
    postId: id || shortcode,
    accountId: `instagram:${handle.toLowerCase()}`,
    publishedAt: taken === null ? null : new Date(taken * 1000).toISOString(),
    caption: caption || null,
    hashtags: tagsFrom(caption),
    mentions: mentionsFrom(caption),
    mediaType: carousel ? "carousel" : video ? "video" : node.is_video === false || text(node.__typename) === "GraphImage" ? "image" : null,
    likes: count(record(node.edge_liked_by).count, record(node.edge_media_preview_like).count, node.like_count),
    comments: count(record(node.edge_media_to_comment).count, node.comment_count),
    views: count(node.video_view_count, node.view_count, node.play_count),
    shares: count(node.share_count),
    url: shortcode ? `https://www.instagram.com/p/${shortcode}/` : null,
    retrievedAt,
  }];
}

function tiktokPost(item: Record<string, unknown>, handle: string, retrievedAt: string): NormalizedSocialPost[] {
  const stats = record(item.statistics).digg_count !== undefined ? record(item.statistics) : record(item.stats);
  const caption = text(item.desc) || text(item.description);
  const id = text(item.aweme_id) || text(item.id);
  if (!id && !caption) return [];
  const extra = arrayAt(item, "text_extra").map((entry) => text(record(entry).hashtag_name)).filter(Boolean);
  const taken = count(item.create_time, item.createTime);
  return [{
    platform: "tiktok",
    postId: id,
    accountId: `tiktok:${handle.toLowerCase()}`,
    publishedAt: taken === null ? null : new Date(taken * 1000).toISOString(),
    caption: caption || null,
    hashtags: unique([...extra, ...tagsFrom(caption)]),
    mentions: mentionsFrom(caption),
    mediaType: "video",
    likes: count(stats.digg_count, stats.diggCount),
    comments: count(stats.comment_count, stats.commentCount),
    views: count(stats.play_count, stats.playCount),
    shares: count(stats.share_count, stats.shareCount),
    url: text(item.share_url) || (id ? `https://www.tiktok.com/@${handle}/video/${id}` : null),
    retrievedAt,
  }];
}

function tagsFrom(caption: string): string[] {
  return unique((caption.match(/#([a-z0-9_]+)/gi) ?? []).map((item) => item.slice(1).toLowerCase()));
}

function mentionsFrom(caption: string): string[] {
  return unique((caption.match(/@([a-z0-9._]+)/gi) ?? []).map((item) => item.slice(1)));
}

function unwrap(payload: unknown): Record<string, unknown> {
  const body = record(payload);
  const data = body.data;
  return data && typeof data === "object" ? record(data) : body;
}

function arrayAt(value: unknown, key: string): unknown[] {
  const found = record(value)[key];
  return Array.isArray(found) ? found : [];
}

function objectOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function record(value: unknown): Record<string, unknown> {
  return objectOf(value) ?? {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function count(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
