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

function channel(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function paint(red: number, green: number, blue: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(red), clamp(green), clamp(blue)].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function mix(hex: string, toward: string, amount: number): string {
  const [red, green, blue] = channel(hex);
  const [towardRed, towardGreen, towardBlue] = channel(toward);
  return paint(red + (towardRed - red) * amount, green + (towardGreen - green) * amount, blue + (towardBlue - blue) * amount);
}

function tint(hex: string, redShift: number, greenShift: number, blueShift: number): string {
  const [red, green, blue] = channel(hex);
  return paint(red + redShift, green + greenShift, blue + blueShift);
}

/** Round-three colour cuts. Same structure, shifted so the client reacts to colour, not a word. */
export function nuanceBoards(base: PaletteDefinition): PaletteDefinition[] {
  const shift = (apply: (hex: string, index: number) => string): PaletteDefinition["swatches"] =>
    base.swatches.map(apply) as unknown as PaletteDefinition["swatches"];
  return [
    { id: "warmer", name: "Warmer", swatches: shift((hex) => tint(hex, 36, 10, -22)) },
    { id: "cooler", name: "Cooler", swatches: shift((hex) => tint(hex, -22, 8, 34)) },
    { id: "quieter", name: "Quieter", swatches: shift((hex) => mix(hex, "#C8C2B8", 0.45)) },
    { id: "richer", name: "Richer", swatches: shift((hex, index) => (index === 4 ? hex : mix(hex, "#000000", 0.2))) },
    { id: "softer", name: "Softer contrast", swatches: shift((hex) => mix(hex, "#E7E2DA", 0.38)) },
    { id: "sharper", name: "Sharper contrast", swatches: shift((hex, index) => (index === 0 || index === 3 ? mix(hex, "#111111", 0.55) : mix(hex, "#F7F4EF", 0.28))) },
    { id: "light", name: "Mostly light", swatches: shift((hex) => mix(hex, "#F7F4EF", 0.55)) },
    { id: "dark", name: "Mostly dark", swatches: shift((hex, index) => (index === 4 ? hex : mix(hex, "#1A1614", 0.62))) },
  ];
}

export function nuanceStem(id: string): string {
  const parts = id.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : id;
}

export function nuanceHeld(ids: readonly string[], stem: string): boolean {
  return ids.some((id) => id !== `not:${stem}` && (id === stem || id === `love:${stem}` || id === `interesting:${stem}`));
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

export interface ColourPreferenceProfile {
  worlds: string[];
  nuance: string[];
  summary: string;
}

export function colourPreferenceProfile(worldIds: readonly string[], nuanceIds: readonly string[]): ColourPreferenceProfile {
  const worlds = worldIds.map((id) => paletteById(id)?.name ?? id);
  const nuance = nuanceIds.map((id) => {
    const stem = nuanceStem(id);
    const name = COLOUR_NUANCE.find(([key]) => key === stem)?.[1] ?? stem;
    if (id.startsWith("not:")) return `not ${name}`;
    if (id.startsWith("interesting:")) return `interesting ${name}`;
    return name;
  });
  const summary = worlds.length
    ? `Colour leaning ${worlds.join(", ")}${nuance.length ? `, pushed ${nuance.join(", ")}` : ""}. Not a finished palette.`
    : "Colour taste is still open.";
  return { worlds, nuance, summary };
}
