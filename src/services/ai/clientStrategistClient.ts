import type { ClientStrategistOutput, StrategistSource } from "../../types/clientRead";

export interface ClientStrategistCall {
  source: StrategistSource;
  failureCode: string | null;
  provider: string | null;
  model: string | null;
  output: ClientStrategistOutput | null;
}

export async function requestClientReading(packet: string, evidenceIds: string[]): Promise<ClientStrategistCall> {
  try {
    const response = await fetch("/api/client-strategist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet, evidenceIds }),
    });
    const body = (await response.json()) as ClientStrategistCall;
    if (body.output && body.source === "live_model") return body;
    return { source: "local_fallback", failureCode: body.failureCode ?? "unavailable", provider: body.provider ?? null, model: body.model ?? null, output: null };
  } catch {
    return { source: "local_fallback", failureCode: "unavailable", provider: null, model: null, output: null };
  }
}
