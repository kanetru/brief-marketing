import type { ChannelId } from "../../../types/strategy";

/** A future live source for platform behaviour. Nothing here is allowed to invent demographics. */
export interface PlatformNote {
  channel: ChannelId;
  retrievedAt: string;
  source: string;
  statement: string;
}

export interface PlatformIntelligenceProvider {
  id: string;
  lookup(channel: ChannelId): PlatformNote | null;
}

export const unavailablePlatformIntelligence: PlatformIntelligenceProvider = {
  id: "unavailable",
  lookup: () => null,
};
