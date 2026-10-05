import { SOCIAL_INTELLIGENCE_PROVIDER } from "../src/domain/intelligence/providers";

export type EnsembleDataStatus = "available" | "not_configured";

/**
 * Whether the next social provider can run.
 * The token itself is not part of this object.
 * A missing token is not_configured. It does not turn demo social into live data.
 */
export interface EnsembleDataConfig {
  configured: boolean;
  status: EnsembleDataStatus;
}

/** Server-only. Do not prefix the env name with VITE_ and do not return it to client JavaScript. */
export function readEnsembleToken(): string {
  const value = process.env[SOCIAL_INTELLIGENCE_PROVIDER.tokenEnv];
  return typeof value === "string" ? value.trim() : "";
}

export function ensembleDataConfigured(): boolean {
  return readEnsembleToken().length > 0;
}

export function getEnsembleDataConfig(): EnsembleDataConfig {
  const configured = ensembleDataConfigured();
  return {
    configured,
    status: configured ? "available" : "not_configured",
  };
}
