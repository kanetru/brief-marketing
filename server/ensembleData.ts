import { SOCIAL_INTELLIGENCE_PROVIDER } from "../src/domain/intelligence/providers";

/** Server-only. Do not prefix the env name with VITE_ and do not return it to client JavaScript. */
export function readEnsembleToken(): string {
  const value = process.env[SOCIAL_INTELLIGENCE_PROVIDER.tokenEnv];
  return typeof value === "string" ? value.trim() : "";
}

export function ensembleDataConfigured(): boolean {
  return readEnsembleToken().length > 0;
}
