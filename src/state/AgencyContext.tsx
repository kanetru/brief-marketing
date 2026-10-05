import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { brandForWorkspace, ensureDemoBrand, loadBrands, saveBrands } from "../domain/agency/brand";
import { browserStore, createLocalBrandAssetStorage } from "../domain/agency/storage";
import type { StoredBrandAsset, WorkspaceBrand } from "../types/agency";

interface AgencyApi {
  brands: Record<string, WorkspaceBrand>;
  brandFor: (workspaceId: string) => WorkspaceBrand | null;
  saveBrand: (brand: WorkspaceBrand) => void;
  storeLogo: (workspaceId: string, dataUrl: string, kind?: StoredBrandAsset["kind"]) => StoredBrandAsset | null;
}

const AgencyContext = createContext<AgencyApi | null>(null);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Record<string, WorkspaceBrand>>(() => {
    const store = browserStore();
    if (!store) return ensureDemoBrand({});
    return ensureDemoBrand(loadBrands(store));
  });

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    saveBrands(store, brands);
  }, [brands]);

  const saveBrand = useCallback((brand: WorkspaceBrand) => {
    setBrands((current) => ({ ...current, [brand.workspaceId]: brand }));
  }, []);

  const storeLogo = useCallback((workspaceId: string, dataUrl: string, kind: StoredBrandAsset["kind"] = "logo") => {
    const store = browserStore();
    if (!store) return null;
    const asset: StoredBrandAsset = {
      id: `${workspaceId}-${kind}`,
      workspaceId,
      kind,
      url: dataUrl,
      createdAt: new Date().toISOString(),
    };
    return createLocalBrandAssetStorage(store).put(asset);
  }, []);

  const api = useMemo<AgencyApi>(() => ({
    brands,
    brandFor: (workspaceId) => brandForWorkspace(brands, workspaceId),
    saveBrand,
    storeLogo,
  }), [brands, saveBrand, storeLogo]);

  return <AgencyContext.Provider value={api}>{children}</AgencyContext.Provider>;
}

export function useAgency(): AgencyApi {
  const api = useContext(AgencyContext);
  if (!api) throw new Error("Agency provider missing");
  return api;
}
