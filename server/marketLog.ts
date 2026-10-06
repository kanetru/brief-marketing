import { sanitiseLog } from "../src/domain/market/sanitise";

export { sanitiseLog };

/** Development diagnostics. Never includes a key, a token, or a token-bearing URL. */
export function marketLog(line: string, options?: { log?: (line: string) => void; secrets?: readonly string[] }): void {
  const clean = sanitiseLog(line, options?.secrets ?? []);
  if (options?.log) {
    options.log(clean);
    return;
  }
  if (process.env.VITEST || process.env.NODE_ENV === "production") return;
  console.info(clean);
}
