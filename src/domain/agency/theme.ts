import type { CSSProperties } from "react";
import type { AgencyTheme } from "../../types/agency";

export const POWERED_BY = "Powered by Brief by Lover Lover";

const FONTS = [
  { name: "Satoshi", stack: '"Satoshi", Arial, "Avenir Next", sans-serif' },
  { name: "Fraunces", stack: '"Fraunces", "Times New Roman", serif' },
  { name: "Newsreader", stack: '"Newsreader", "Times New Roman", serif' },
  { name: "Libre Baskerville", stack: '"Libre Baskerville", "Times New Roman", serif' },
] as const;

export const APPROVED_FONTS = FONTS.map((font) => font.name);

export function appliedFont(requested: string): string {
  const name = requested.replace(/["']/g, "").split(",")[0]?.trim().toLowerCase() ?? "";
  const known = FONTS.find((font) => font.name.toLowerCase() === name || font.stack.toLowerCase().includes(name));
  return known?.stack ?? FONTS[0].stack;
}

function channel(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return null;
  const value = match[1];
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function pivot(value: number): number {
  const channelValue = value / 255;
  return channelValue <= 0.03928 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(a: string, b: string): number {
  const left = channel(a);
  const right = channel(b);
  if (!left || !right) return 1;
  const luminance = (rgb: [number, number, number]) => 0.2126 * pivot(rgb[0]) + 0.7152 * pivot(rgb[1]) + 0.0722 * pivot(rgb[2]);
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

function inkFor(background: string): string {
  const dark = "#1C1A17";
  const light = "#F7F4EF";
  return contrastRatio(dark, background) >= contrastRatio(light, background) ? dark : light;
}

/** Keeps the chosen colours, and replaces a pair that cannot be read. */
export function correctTheme(theme: AgencyTheme): AgencyTheme {
  const background = channel(theme.colourBackground) ? theme.colourBackground : "#F4F1EA";
  const surface = channel(theme.colourSurface) ? theme.colourSurface : background;
  let text = channel(theme.colourText) ? theme.colourText : inkFor(background);
  if (contrastRatio(text, background) < 4.5) text = inkFor(background);
  let muted = channel(theme.colourMuted) ? theme.colourMuted : text;
  if (contrastRatio(muted, background) < 3) muted = text;
  const primary = channel(theme.colourPrimary) ? theme.colourPrimary : text;
  const accent = channel(theme.colourAccent) ? theme.colourAccent : primary;
  return {
    ...theme,
    colourBackground: background,
    colourSurface: surface,
    colourText: text,
    colourMuted: muted,
    colourPrimary: primary,
    colourAccent: accent,
    headingFont: appliedFont(theme.headingFont),
    bodyFont: appliedFont(theme.bodyFont),
    optionalThemeMetadata: {
      ...theme.optionalThemeMetadata,
      requestedHeadingFont: theme.headingFont,
      onPrimary: inkFor(primary),
      onAccent: inkFor(accent),
    },
  };
}

export function themeVars(theme: AgencyTheme): CSSProperties {
  const safe = correctTheme(theme);
  const onPrimary = safe.optionalThemeMetadata.onPrimary || inkFor(safe.colourPrimary);
  const onAccent = safe.optionalThemeMetadata.onAccent || inkFor(safe.colourAccent);
  const border = `color-mix(in srgb, ${safe.colourText} 22%, transparent)`;
  return {
    "--paper": safe.colourBackground,
    "--pearl": safe.colourBackground,
    "--paper-deep": safe.colourSurface,
    "--color-bg": safe.colourBackground,
    "--color-surface": safe.colourSurface,
    "--color-text": safe.colourText,
    "--color-muted": safe.colourMuted,
    "--color-accent": safe.colourAccent,
    "--color-border": border,
    "--color-focus": safe.colourAccent,
    "--ink": safe.colourText,
    "--choc": safe.colourText,
    "--ink-soft": safe.colourMuted,
    "--muted": safe.colourMuted,
    "--accent": safe.colourAccent,
    "--ember": safe.colourAccent,
    "--chocolate": safe.colourPrimary,
    "--cream": onPrimary,
    "--cream-ink": onPrimary,
    "--on-accent": onAccent,
    "--line": border,
    "--client-bg": safe.colourBackground,
    "--client-surface": safe.colourSurface,
    "--client-text": safe.colourText,
    "--client-muted": safe.colourMuted,
    "--client-primary": safe.colourPrimary,
    "--client-secondary": safe.colourAccent,
    "--client-accent": safe.colourAccent,
    "--client-border": border,
    "--client-selection": safe.colourPrimary,
    "--client-focus": safe.colourAccent,
    "--font-display": safe.headingFont,
    "--font-body": safe.bodyFont,
    "--sans": safe.bodyFont,
    "--serif": safe.headingFont,
    "--display": safe.headingFont,
    "--radius-frame": safe.radiusCharacter || "0px",
  } as CSSProperties;
}

export function openingLogo(theme: { logo?: string; logoDark?: string }, surface: "light" | "dark"): string {
  if (surface === "dark" && theme.logoDark?.trim()) return theme.logoDark;
  return theme.logo?.trim() || "";
}

export function initialsMark(name: string, colour: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><text x="0" y="34" font-family="Georgia, serif" font-size="28" fill="${colour}">${initials || "—"}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
