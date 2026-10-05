export const PRIMARY_NAV = [
  { id: "overview", label: "Overview" },
  { id: "competitors", label: "Competitors" },
  { id: "market", label: "Market" },
  { id: "opportunities", label: "Opportunities" },
] as const;

export const MORE_NAV = [
  { id: "brand", label: "Brand details" },
  { id: "strategy", label: "Strategy detail" },
  { id: "content", label: "Content" },
  { id: "responses", label: "Original responses" },
  { id: "websites", label: "Site research" },
  { id: "needs", label: "Assets" },
  { id: "history", label: "History" },
  { id: "pack", label: "Use in AI" },
  { id: "settings", label: "Client settings" },
] as const;

export const MANAGER_NAV = [...PRIMARY_NAV, ...MORE_NAV] as const;

export type ManagerPanel = (typeof MANAGER_NAV)[number]["id"];

/** Opening a client lands on the read, not an internal desk. */
export const DEFAULT_PANEL: ManagerPanel = "overview";

export const LAST_CLIENT_KEY = "lover-lover.last-client";
