export interface PaletteDefinition {
  id: string;
  /** Accessible name. Kept off the card face so the colour does the choosing. */
  name: string;
  swatches: readonly [string, string, string, string, string];
}

export const COLOUR_PALETTES: readonly PaletteDefinition[] = [
  {
    id: "warm-earth",
    name: "Warm earth",
    swatches: ["#6B3A2A", "#C4A484", "#E6D3B3", "#3E2C23", "#8C5A3C"],
  },
  {
    id: "quiet-neutral",
    name: "Quiet neutral",
    swatches: ["#E7E2DA", "#C8C2B8", "#8E8880", "#2C2A28", "#F7F4EF"],
  },
  {
    id: "high-contrast",
    name: "High contrast",
    swatches: ["#111111", "#F4F1EA", "#C81D25", "#F4F1EA", "#111111"],
  },
  {
    id: "sun-washed",
    name: "Sun-washed",
    swatches: ["#F6E7C1", "#E7A04A", "#D46A4C", "#F7F3E8", "#6E8F78"],
  },
  {
    id: "deep-botanical",
    name: "Deep botanical",
    swatches: ["#1C3A2E", "#2F5D50", "#8BA888", "#D5DDD0", "#C4A35A"],
  },
  {
    id: "soft-editorial",
    name: "Soft editorial",
    swatches: ["#F3E6E1", "#C9A9A6", "#6E4C4A", "#1E1A19", "#E7D5C9"],
  },
  {
    id: "bright-optimistic",
    name: "Bright optimistic",
    swatches: ["#F7F4EF", "#E24B2A", "#F0C43A", "#2E2A4F", "#3E9E78"],
  },
  {
    id: "cool-structured",
    name: "Cool structured",
    swatches: ["#1B3A4B", "#4F7C8A", "#D6E2E6", "#102833", "#C45C26"],
  },
];

export function paletteById(id: string): PaletteDefinition | undefined {
  return COLOUR_PALETTES.find((palette) => palette.id === id);
}

export function normaliseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split("")
      .map((character) => character + character)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}
