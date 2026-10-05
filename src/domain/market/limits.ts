/**
 * Trial-sized caps. Generating a search is free. Sending it is not.
 * A manager click runs the live cap. Saved searches run one at a time.
 */
export const MARKET_DISCOVERY_LIMITS = {
  generatedPerPlatform: 8,
  maxQueriesPerPlatform: 12,
  livePerPlatform: 3,
  hardCapPerPlatform: 6,
  pool: 16,
  enrichPerPlatform: 2,
  enrichCap: 6,
  postsPerAccount: 8,
} as const;
