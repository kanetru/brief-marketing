import type { DiscoverySession } from "../types/discovery";
import { createSession } from "./createSession";

export const STORAGE_KEY = "lover-lover.discovery-session.v1";

function isSession(value: unknown): value is DiscoverySession {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DiscoverySession>;
  return (
    record.version === 1 &&
    typeof record.id === "string" &&
    !!record.progress &&
    !!record.business &&
    !!record.audience &&
    !!record.goals &&
    !!record.personality &&
    !!record.discoveryProfile &&
    !!record.agentObservations
  );
}

export function loadSession(): DiscoverySession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSession();
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return createSession();
    return parsed;
  } catch {
    return createSession();
  }
}

export function saveSession(session: DiscoverySession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
