import { loadEnv } from "vite";

/**
 * Server env names. These are copied from `.env.local` onto `process.env`
 * for the API routes. They are never given a VITE_ prefix, so Vite does not
 * put them on `import.meta.env`.
 */
export const SERVER_ENV_KEYS = [
  "OPENAI_API_KEY",
  "ENSEMBLEDATA_API_TOKEN",
  "OPENAI_MODEL",
  "OPENAI_MODEL_ANALYSIS",
  "OPENAI_MODEL_PROFILE",
  "OPENAI_MODEL_CREATIVE",
  "OPENAI_MODEL_RESEARCH",
  "TERRITORY_IMAGE_MODEL",
  "TERRITORY_IMAGE_PROVIDER",
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

/** Copies allowlisted values only. An already-set process value wins. Empty values stay unset. */
export function assignServerEnv(source: Record<string, string | undefined>): void {
  for (const key of SERVER_ENV_KEYS) {
    const value = source[key]?.trim() ?? "";
    if (!value) continue;
    if (process.env[key]?.trim()) continue;
    process.env[key] = value;
  }
}

/** Reads `.env`, `.env.local`, and mode-specific files the way Vite does, then keeps only server keys. */
export function applyServerEnv(mode: string, envDir: string | false): void {
  if (!envDir) return;
  assignServerEnv(loadEnv(mode, envDir, ""));
}

export interface ProviderStatus {
  openai: { configured: boolean };
  ensembleData: { configured: boolean; status: "available" | "not_configured" };
}

export function providerStatus(): ProviderStatus {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const ensemble = Boolean(process.env.ENSEMBLEDATA_API_TOKEN?.trim());
  return {
    openai: { configured: openai },
    ensembleData: {
      configured: ensemble,
      status: ensemble ? "available" : "not_configured",
    },
  };
}

/** Development status. Words only. */
export function providerStatusLines(): readonly string[] {
  const status = providerStatus();
  return [
    `OpenAI: ${status.openai.configured ? "configured" : "not configured"}`,
    `EnsembleData: ${status.ensembleData.configured ? "configured" : "not configured"}`,
  ];
}
