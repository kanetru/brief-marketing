/** Removes keys, tokens, and token-bearing URLs from text that might be shown or logged. */
export function sanitiseLog(value: string, secrets: readonly string[] = []): string {
  let next = value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/([?&](?:token|api_key|apikey|key)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]");
  for (const secret of secrets) {
    if (secret.length < 6) continue;
    next = next.split(secret).join("[redacted]");
  }
  return next;
}
