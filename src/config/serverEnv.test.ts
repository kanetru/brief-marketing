import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateClientReading } from "../../server/clientStrategist";
import { getEnsembleDataConfig, readEnsembleToken } from "../../server/ensembleData";
import { applyServerEnv, assignServerEnv, providerStatus, providerStatusLines } from "../../server/env";
import { capabilityFor } from "../domain/intelligence/providers";

const KEYS = ["OPENAI_API_KEY", "ENSEMBLEDATA_API_TOKEN", "OPENAI_MODEL", "VITE_OPENAI_API_KEY", "VITE_ENSEMBLEDATA_API_TOKEN"] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  globalThis.fetch = originalFetch;
});

function clearSecrets() {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ENSEMBLEDATA_API_TOKEN;
  delete process.env.VITE_OPENAI_API_KEY;
  delete process.env.VITE_ENSEMBLEDATA_API_TOKEN;
}

describe("server env", () => {
  it("reads .env.local for the server and reports status without the values", () => {
    clearSecrets();
    const dir = mkdtempSync(join(tmpdir(), "brief-env-"));
    writeFileSync(join(dir, ".env.local"), [
      "OPENAI_API_KEY=test-openai",
      "ENSEMBLEDATA_API_TOKEN=test-ensemble",
      "VITE_OPENAI_API_KEY=browser-openai",
      "VITE_ENSEMBLEDATA_API_TOKEN=browser-ensemble",
      "OPENAI_MODEL=gpt-5.6-sol",
    ].join("\n"));
    applyServerEnv("development", dir);
    expect(process.env.OPENAI_API_KEY).toBe("test-openai");
    expect(process.env.ENSEMBLEDATA_API_TOKEN).toBe("test-ensemble");
    expect(process.env.OPENAI_MODEL).toBe("gpt-5.6-sol");
    expect(process.env.VITE_OPENAI_API_KEY).toBeUndefined();
    expect(process.env.VITE_ENSEMBLEDATA_API_TOKEN).toBeUndefined();
    expect(providerStatusLines()).toEqual([
      "OpenAI: configured",
      "EnsembleData: configured",
    ]);
    const published = JSON.stringify(providerStatus());
    expect(published).not.toContain("test-openai");
    expect(published).not.toContain("test-ensemble");
    expect(published).toContain('"configured":true');
  });

  it("reports both providers missing and leaves demo social as demo", () => {
    clearSecrets();
    assignServerEnv({});
    expect(providerStatusLines()).toEqual([
      "OpenAI: not configured",
      "EnsembleData: not configured",
    ]);
    expect(getEnsembleDataConfig()).toEqual({ configured: false, status: "not_configured" });
    expect(capabilityFor("demo-social")?.mode).toBe("demo");
  });

  it("keeps a configured EnsembleData token off the public config and off demo data", () => {
    clearSecrets();
    assignServerEnv({ ENSEMBLEDATA_API_TOKEN: "test-ensemble" });
    const config = getEnsembleDataConfig();
    expect(config).toEqual({ configured: true, status: "available" });
    expect(Object.keys(config)).toEqual(["configured", "status"]);
    expect(JSON.stringify(config)).not.toContain("test-ensemble");
    expect(readEnsembleToken()).toBe("test-ensemble");
    expect(capabilityFor("demo-social")?.mode).toBe("demo");
  });

  it("does not replace a server value that is already set", () => {
    clearSecrets();
    process.env.OPENAI_API_KEY = "already-set";
    assignServerEnv({ OPENAI_API_KEY: "from-file" });
    expect(process.env.OPENAI_API_KEY).toBe("already-set");
  });

  it("keeps the strategist on the local fallback when OpenAI is missing", async () => {
    clearSecrets();
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const result = await generateClientReading({ packet: "A client.", evidenceIds: ["e1"] });
    expect(called).toBe(false);
    expect(result.failureCode).toBe("not_configured");
    expect(result.source).toBe("local_fallback");
    expect(providerStatus().openai.configured).toBe(false);
  });
});
