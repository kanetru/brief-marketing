export const MANAGER_NAV = [
  { id: "intelligence", label: "Intelligence" },
  { id: "brand", label: "Brand" },
  { id: "market", label: "Market" },
  { id: "strategy", label: "Strategy" },
  { id: "content", label: "Content" },
  { id: "needs", label: "Assets" },
  { id: "history", label: "History" },
  { id: "pack", label: "Use in AI" },
] as const;

export type ManagerPanel = (typeof MANAGER_NAV)[number]["id"];

/** Opening a client lands here. */
export const DEFAULT_PANEL: ManagerPanel = "intelligence";

export const LAST_CLIENT_KEY = "lover-lover.last-client";
