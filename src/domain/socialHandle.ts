/**
 * Local handle cleanup for the platforms EnsembleData currently covers.
 * This must not call a provider. Verification happens later, when research is run on purpose.
 */

export type SupportedSocial = "instagram" | "tiktok";

export interface NormalisedHandle {
  handle: string;
  valid: boolean;
}

export function normaliseHandle(raw: string): NormalisedHandle {
  let text = raw.trim();
  if (!text) return { handle: "", valid: true };
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const part = url.pathname.split("/").filter(Boolean)[0] ?? "";
      text = part;
    } catch {
      return { handle: "", valid: false };
    }
  }
  text = text.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(text)) return { handle: "", valid: false };
  return { handle: text, valid: true };
}

export function profileUrl(platform: SupportedSocial, handle: string): string {
  const name = handle.replace(/^@/, "");
  return platform === "tiktok" ? `https://www.tiktok.com/@${name}` : `https://instagram.com/${name}`;
}
