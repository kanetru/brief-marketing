import type { StoredBrandAsset } from "../../types/agency";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BrandAssetStorageProvider {
  put(asset: StoredBrandAsset): StoredBrandAsset;
  get(id: string): StoredBrandAsset | null;
  list(workspaceId: string): StoredBrandAsset[];
}

const KEY = "lover-lover.brand-assets.v1";

function readAll(store: KeyValueStore): StoredBrandAsset[] {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as StoredBrandAsset[] : [];
  } catch {
    return [];
  }
}

export function createLocalBrandAssetStorage(store: KeyValueStore): BrandAssetStorageProvider {
  return {
    put(asset) {
      const next = readAll(store).filter((item) => item.id !== asset.id);
      next.push(asset);
      store.setItem(KEY, JSON.stringify(next));
      return asset;
    },
    get(id) {
      return readAll(store).find((item) => item.id === id) ?? null;
    },
    list(workspaceId) {
      return readAll(store).filter((item) => item.workspaceId === workspaceId);
    },
  };
}

export function browserStore(): KeyValueStore | null {
  const storage = (globalThis as { localStorage?: KeyValueStore }).localStorage;
  return storage ?? null;
}
