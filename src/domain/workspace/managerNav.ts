export const PRIMARY_NAV = [
  { id: "overview", label: "Overview" },
  { id: "competitors", label: "Competitors" },
  { id: "market", label: "Market" },
  { id: "opportunities", label: "Opportunities" },
] as const;

export const MORE_NAV = [
  { id: "files", label: "Files" },
  { id: "ideas", label: "Content ideas" },
  { id: "brand", label: "Brand" },
  { id: "contracts", label: "Contracts" },
  { id: "notes", label: "Notes" },
  { id: "onboarding", label: "Onboarding" },
  { id: "responses", label: "Responses" },
  { id: "pack", label: "Use in AI" },
  { id: "settings", label: "Client settings" },
] as const;

export const MANAGER_NAV = [...PRIMARY_NAV, ...MORE_NAV] as const;

export type ManagerPanel = (typeof MANAGER_NAV)[number]["id"];

/** Opening a client lands on the read, not an internal desk. */
export const DEFAULT_PANEL: ManagerPanel = "overview";

export const LAST_CLIENT_KEY = "lover-lover.last-client";
