import type { BriefProject, LibraryAsset } from "../../types/project";

export interface ClientLogoSource {
  src: string;
  /** Dark artwork, kept for a dark surface. Light cards prefer the primary file. */
  variant: "primary" | "dark";
}

const DISPLAYABLE = /^(?:data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,]|blob:|https?:\/\/|\/(?!\/))\S+$/i;

/** Two letters for a single word (DIRT → DI), otherwise the first letter of the first two words. */
export function clientInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function displayableImage(value: string): boolean {
  const src = value.trim();
  return src.length > 0 && DISPLAYABLE.test(src);
}

function isDarkVariant(asset: LibraryAsset): boolean {
  const tags = asset.tags.map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag === "logodark" || tag === "logo-dark" || tag === "dark-logo" || tag === "on-dark")) return true;
  return /\bdark\b/i.test(asset.name);
}

function mentionsLogo(asset: LibraryAsset): boolean {
  const tags = asset.tags.map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag === "logo" || tag === "wordmark" || tag === "logomark" || tag === "primary-logo" || tag === "logodark" || tag === "logo-dark" || tag === "dark-logo")) {
    return true;
  }
  return /\b(logo|wordmark|logomark)\b/i.test(asset.name);
}

function isLogo(asset: LibraryAsset): boolean {
  if (!displayableImage(asset.fileRef)) return false;
  return mentionsLogo(asset) || asset.category === "brand";
}

function logoRank(asset: LibraryAsset): number {
  const tags = asset.tags.map((tag) => tag.toLowerCase());
  let score = asset.category === "brand" ? 1 : 0;
  if (mentionsLogo(asset)) score += 4;
  if (tags.includes("primary") || tags.includes("primary-logo") || /\bprimary\b/i.test(asset.name)) score += 2;
  return score;
}

/**
 * The client's own logo, from the project library.
 * Agency branding is a different store and is never used here.
 * A filename that is not an image URL is ignored so the card can fall back.
 */
export function clientLogo(project: Pick<BriefProject, "library">, surface: "light" | "dark" = "light"): ClientLogoSource | null {
  const logos = (project.library ?? []).filter(isLogo).sort((a, b) => logoRank(b) - logoRank(a));
  if (logos.length === 0) return null;
  const dark = logos.filter(isDarkVariant);
  const primary = logos.filter((asset) => !isDarkVariant(asset));
  const chosen = surface === "dark"
    ? (dark[0] ?? primary[0] ?? logos[0])
    : (primary[0] ?? dark[0] ?? logos[0]);
  if (!chosen) return null;
  return {
    src: chosen.fileRef.trim(),
    variant: isDarkVariant(chosen) ? "dark" : "primary",
  };
}
