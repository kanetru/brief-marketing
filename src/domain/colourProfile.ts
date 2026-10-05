import { COLOUR_PALETTES, nuanceHeld, paletteById } from "./palettes";
import type { ColourPreferences } from "../types/discovery";

export interface ColourPreferenceProfile {
  warmth: string;
  saturation: string;
  contrast: string;
  brightness: string;
  earthiness: string;
  softness: string;
  accentAppetite: string;
  families: string[];
  avoidedFamilies: string[];
  selectedBoards: string[];
  rejectedBoards: string[];
  /** A sentence for the strategist. Hex values are evidence of taste, not the brand colours. */
  summary: string;
}

const WARM = new Set(["warm-earth", "sun-washed", "soft-editorial", "clay-cream-ink", "tobacco-pearl-olive", "rust-sand-chocolate", "ochre-bone-charcoal"]);
const COOL = new Set(["cool-structured", "quiet-neutral", "fog-slate-copper", "ink-paper-oxide"]);

export function colourProfile(preferences: ColourPreferences): ColourPreferenceProfile {
  const selected = [...preferences.preferredPaletteIds, ...preferences.closerBoardIds];
  const names = selected.map((id) => paletteById(id)?.name ?? id);
  const warm = selected.filter((id) => WARM.has(id)).length;
  const cool = selected.filter((id) => COOL.has(id)).length;
  const nuance = preferences.nuanceIds;
  const warmth = nuanceHeld(nuance, "warmer") ? "warm" : nuanceHeld(nuance, "cooler") ? "cool" : warm > cool ? "warm" : cool > warm ? "cool" : "unsettled";
  const saturation = nuanceHeld(nuance, "richer") ? "richer" : nuanceHeld(nuance, "quieter") ? "quiet" : "unset";
  const contrast = nuanceHeld(nuance, "sharper") ? "sharper" : nuanceHeld(nuance, "softer") ? "soft" : "unset";
  const brightness = nuanceHeld(nuance, "dark") ? "dark" : nuanceHeld(nuance, "light") ? "light" : preferences.colourPush === "darker" ? "dark" : preferences.colourPush === "brighter" ? "light" : "unset";
  const summary = names.length
    ? `Drawn toward ${names.join(", ")}. Warmth ${warmth}, saturation ${saturation}, contrast ${contrast}, brightness ${brightness}. These are taste signals. They are not the brand colours.`
    : "Colour taste is still unknown. No hex has been chosen as a brand colour.";
  return {
    warmth,
    saturation,
    contrast,
    brightness,
    families: COLOUR_PALETTES.filter((item) => preferences.preferredPaletteIds.includes(item.id)).map((item) => item.name),
    avoidedFamilies: COLOUR_PALETTES.filter((item) => preferences.avoidedPaletteIds.includes(item.id)).map((item) => item.name),
    selectedBoards: names,
    earthiness: selected.some((id) => WARM.has(id)) ? "earthy" : "unset",
    softness: nuanceHeld(nuance, "softer") ? "soft" : "unset",
    accentAppetite: nuanceHeld(nuance, "accent-strong") ? "strong" : nuanceHeld(nuance, "accent-quiet") ? "quiet" : "unset",
    rejectedBoards: preferences.avoidedPaletteIds.map((id) => paletteById(id)?.name ?? id),
    summary,
  };
}
