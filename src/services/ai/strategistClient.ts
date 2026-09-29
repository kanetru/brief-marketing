import { strategistRequest } from "../../domain/strategistBrief";
import type { BrandIntelligence } from "../../types/brandIntelligence";
import type { CreativeReading } from "../../types/creativeReading";
import type { DiscoverySession } from "../../types/discovery";

export interface StrategistClientResult {
  reading: CreativeReading | null;
  failureCode: string | null;
}

/** Asks the server strategist. A missing model leaves the fallback reading in place. */
export async function requestStrategist(session: DiscoverySession, intelligence: BrandIntelligence): Promise<StrategistClientResult> {
  try {
    const response = await fetch("/api/discovery/strategist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(strategistRequest(session, intelligence)),
    });
    const body = (await response.json()) as { reading?: CreativeReading | null; failureCode?: string | null };
    if (body.reading && body.reading.source === "strategist") return { reading: body.reading, failureCode: null };
    return { reading: null, failureCode: body.failureCode ?? "unavailable" };
  } catch {
    return { reading: null, failureCode: "unavailable" };
  }
}
