import { useState } from "react";

interface EnsembleProbeResult {
  configured: boolean;
  ok: boolean;
  httpStatus?: number;
  accounts?: number;
  units?: number;
  message: string;
}

interface OpenAIProbeResult {
  configured: boolean;
  ok: boolean;
  httpStatus?: number;
  queriesParse: boolean;
  classificationParse: boolean;
  message: string;
}

export function DevProviderChecks() {
  const [ensemble, setEnsemble] = useState<EnsembleProbeResult | null>(null);
  const [openai, setOpenAI] = useState<OpenAIProbeResult | null>(null);
  const [busy, setBusy] = useState<"ensemble" | "openai" | null>(null);

  async function runEnsemble() {
    setBusy("ensemble");
    setEnsemble(await post<EnsembleProbeResult>("/api/dev/ensemble"));
    setBusy(null);
  }

  async function runOpenAI() {
    setBusy("openai");
    setOpenAI(await post<OpenAIProbeResult>("/api/dev/openai"));
    setBusy(null);
  }

  return (
    <section className="studio-panel" data-screen="dev-provider-checks">
      <h2>Development checks</h2>
      <p className="studio-meta">One request each. These do not run during discovery.</p>
      <div className="studio-row">
        <button type="button" className="studio-button" disabled={busy !== null} onClick={() => void runEnsemble()}>{busy === "ensemble" ? "Testing…" : "Test EnsembleData"}</button>
        <button type="button" className="studio-button" disabled={busy !== null} onClick={() => void runOpenAI()}>{busy === "openai" ? "Testing…" : "Test OpenAI"}</button>
      </div>
      {ensemble ? <EnsembleReport result={ensemble} /> : null}
      {openai ? <OpenAIReport result={openai} /> : null}
    </section>
  );
}

function EnsembleReport({ result }: { result: EnsembleProbeResult }) {
  return (
    <div data-screen="ensemble-probe">
      <p>EnsembleData</p>
      <p>Configured: {result.configured ? "yes" : "no"}</p>
      <p>Connection: {result.ok ? "successful" : "failed"}</p>
      {result.ok && result.accounts !== undefined ? (
        <>
          <p>Instagram search:</p>
          <p>{result.accounts} accounts returned</p>
        </>
      ) : null}
      {result.units !== undefined ? (
        <>
          <p>Units:</p>
          <p>{result.units}</p>
        </>
      ) : null}
      {!result.ok && result.httpStatus ? <p>HTTP {result.httpStatus}</p> : null}
      {!result.ok ? <p>{result.message}</p> : null}
    </div>
  );
}

function OpenAIReport({ result }: { result: OpenAIProbeResult }) {
  return (
    <div data-screen="openai-probe">
      <p>OpenAI</p>
      <p>Configured: {result.configured ? "yes" : "no"}</p>
      <p>Connection: {result.ok ? "successful" : "failed"}</p>
      <p>Market queries: {result.queriesParse ? "parsed" : "not parsed"}</p>
      <p>Market classification: {result.classificationParse ? "parsed" : "not parsed"}</p>
      {!result.ok && result.httpStatus ? <p>HTTP {result.httpStatus}</p> : null}
      {!result.ok ? <p>{result.message}</p> : null}
    </div>
  );
}

async function post<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  return await response.json() as T;
}
