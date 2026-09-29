import type { TerritoryImageAsset } from "../types/brandIntelligence";

const STORAGE_KEY = "lover-lover.territory-imagery.v1";

interface CacheFile {
  entries: Record<string, TerritoryImageAsset[]>;
}

export function readImageryCache(versionKey: string): TerritoryImageAsset[] | null {
  const file = readFile();
  const hit = file.entries[versionKey];
  if (!hit || hit.length === 0) return null;
  return hit;
}

export function writeImageryCache(versionKey: string, assets: TerritoryImageAsset[]): void {
  const file = readFile();
  file.entries[versionKey] = assets;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // A full cache should not break the territory.
  }
}

export function clearImageryCache(versionKey?: string): void {
  if (!versionKey) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const file = readFile();
  delete file.entries[versionKey];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
}

function readFile(): CacheFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {} };
    const parsed = JSON.parse(raw) as CacheFile;
    if (!parsed || typeof parsed !== "object" || !parsed.entries) return { entries: {} };
    return parsed;
  } catch {
    return { entries: {} };
  }
}
