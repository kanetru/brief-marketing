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

export interface CloserBoard extends PaletteDefinition {
  parents: readonly string[];
}

/** Distinctions inside a first-round world. Not the same boards again. */
export const CLOSER_BOARDS: readonly CloserBoard[] = [
  { id: "clay-cream-ink", name: "Clay, cream, ink", parents: ["warm-earth", "soft-editorial"], swatches: ["#C47A5A", "#F3E6D6", "#1C1916", "#8C4A32", "#E7D3C4"] },
  { id: "tobacco-pearl-olive", name: "Tobacco, pearl, olive", parents: ["warm-earth", "deep-botanical"], swatches: ["#6B4A32", "#E7E0D4", "#6E7A4E", "#2C241C", "#C4B49A"] },
  { id: "rust-sand-chocolate", name: "Rust, sand, chocolate", parents: ["warm-earth", "sun-washed"], swatches: ["#A3472C", "#E6C9A2", "#3C241C", "#F4E6D4", "#7A3E2E"] },
  { id: "ochre-bone-charcoal", name: "Ochre, bone, charcoal", parents: ["sun-washed", "quiet-neutral"], swatches: ["#C4A15A", "#F4EFE6", "#2A2826", "#E7D7B0", "#6E624E"] },
  { id: "ink-paper-oxide", name: "Ink, paper, oxide", parents: ["high-contrast", "cool-structured"], swatches: ["#14181C", "#F4F1EA", "#B5523A", "#D7DDE2", "#2C3A44"] },
  { id: "fog-slate-copper", name: "Fog, slate, copper", parents: ["cool-structured", "quiet-neutral"], swatches: ["#D5DDE0", "#5C6B73", "#B87334", "#1C2428", "#E7EEF0"] },
  { id: "night-wine-bone", name: "Night, wine, bone", parents: ["high-contrast", "deep-botanical"], swatches: ["#14110F", "#6E2430", "#E7DCCE", "#2A2422", "#A67C52"] },
  { id: "butter-ink-leaf", name: "Butter, ink, leaf", parents: ["bright-optimistic", "deep-botanical"], swatches: ["#F0D56A", "#1A1C16", "#3E6B45", "#F7F3E4", "#C4552A"] },
];

export const COLOUR_NUANCE: ReadonlyArray<readonly [string, string]> = [
  ["warmer", "Warmer"],
  ["cooler", "Cooler"],
  ["quieter", "Quieter colour"],
  ["richer", "Richer colour"],
  ["softer", "Softer contrast"],
  ["sharper", "Sharper contrast"],
  ["light", "Mostly light"],
  ["dark", "Mostly dark"],
  ["accent-quiet", "Almost no accent"],
  ["accent-strong", "A strong accent"],
];

export function paletteById(id: string): PaletteDefinition | undefined {
  return COLOUR_PALETTES.find((palette) => palette.id === id) ?? CLOSER_BOARDS.find((palette) => palette.id === id);
}

export function closerBoardsFor(preferredIds: readonly string[]): readonly CloserBoard[] {
  const chosen = new Set(preferredIds);
  const matched = CLOSER_BOARDS.filter((board) => board.parents.some((parent) => chosen.has(parent)));
  return matched.length > 0 ? matched : CLOSER_BOARDS.slice(0, 4);
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
