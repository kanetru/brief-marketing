import type { DiscoverySession } from "../types/discovery";
import type {
  CompositionStyle,
  CreativeTerritory,
  ImageAssetRole,
  ImageTreatment,
  PaletteRole,
  TerritoryImageAsset,
  TerritoryTypeface,
  TerritoryVisualSpec,
  TypefaceCandidate,
} from "../types/brandIntelligence";
import { TYPEFACE_CATALOGUE } from "./typefaceCatalogue";

interface VisualRecipe {
  compositionStyle: CompositionStyle;
  imageTreatment: ImageTreatment;
  texture: TerritoryVisualSpec["texture"];
  borderStyle: TerritoryVisualSpec["borderStyle"];
  spacingCharacter: TerritoryVisualSpec["spacingCharacter"];
  typographyScale: TerritoryVisualSpec["typographyScale"];
  graphicMotifs: string[];
  graphic: string;
  headingKind: "serif" | "sans" | "display";
  polish: TerritoryVisualSpec["axes"]["polish"];
  expression: TerritoryVisualSpec["axes"]["expression"];
  typography: TerritoryVisualSpec["axes"]["typography"];
}

const RECIPES: Record<string, VisualRecipe> = {
  "grounded-editorial": {
    compositionStyle: "editorial",
    imageTreatment: "documentary",
    texture: "paper",
    borderStyle: "hairline",
    spacingCharacter: "generous",
    typographyScale: "editorial",
    graphicMotifs: ["Quiet rule", "Asymmetric crop", "Serif statement"],
    graphic: "editorial",
    headingKind: "serif",
    polish: "restrained",
    expression: "restrained",
    typography: "serif",
  },
  "raw-humanism": {
    compositionStyle: "raw",
    imageTreatment: "raw",
    texture: "grain",
    borderStyle: "rough",
    spacingCharacter: "tight",
    typographyScale: "oversized",
    graphicMotifs: ["Imperfect crop", "Oversized type", "Visible mark"],
    graphic: "tactile",
    headingKind: "display",
    polish: "raw",
    expression: "expressive",
    typography: "display",
  },
  "precise-structure": {
    compositionStyle: "grid",
    imageTreatment: "precise",
    texture: "none",
    borderStyle: "frame",
    spacingCharacter: "measured",
    typographyScale: "controlled",
    graphicMotifs: ["Grid", "Geometric frame", "Controlled crop"],
    graphic: "geometric",
    headingKind: "sans",
    polish: "polished",
    expression: "restrained",
    typography: "sans",
  },
  "warm-precision": {
    compositionStyle: "warm-structure",
    imageTreatment: "clear",
    texture: "paper",
    borderStyle: "hairline",
    spacingCharacter: "measured",
    typographyScale: "controlled",
    graphicMotifs: ["Warm paper ground", "Simple components", "Type over graphics"],
    graphic: "structured",
    headingKind: "sans",
    polish: "restrained",
    expression: "restrained",
    typography: "sans",
  },
  "playful-signal": {
    compositionStyle: "expressive",
    imageTreatment: "graphic",
    texture: "none",
    borderStyle: "none",
    spacingCharacter: "dense",
    typographyScale: "display",
    graphicMotifs: ["One loud colour", "Type as the graphic", "Hard crop"],
    graphic: "graphic",
    headingKind: "display",
    polish: "polished",
    expression: "expressive",
    typography: "display",
  },
  "quiet-authority": {
    compositionStyle: "classic",
    imageTreatment: "formal",
    texture: "paper",
    borderStyle: "hairline",
    spacingCharacter: "generous",
    typographyScale: "classic",
    graphicMotifs: ["Traditional margin", "A single rule", "Still frame"],
    graphic: "classic",
    headingKind: "serif",
    polish: "polished",
    expression: "restrained",
    typography: "serif",
  },
};

const FALLBACK_RECIPE = RECIPES["grounded-editorial"] as VisualRecipe;

const FALLBACK_SERIF: TerritoryTypeface = {
  id: "fraunces",
  name: "Fraunces",
  fontFamily: '"Fraunces Variable", Georgia, serif',
  license: "SIL Open Font License",
  source: "Google Fonts",
};

const FALLBACK_SANS: TerritoryTypeface = {
  id: "nunito-sans",
  name: "Nunito Sans",
  fontFamily: '"Nunito Sans", "Avenir Next", sans-serif',
  license: "SIL Open Font License",
  source: "Google Fonts",
};

const WARM_PALETTES = new Set(["warm-earth", "soft-editorial", "sun-washed", "deep-botanical", "bright-optimistic"]);
const COOL_PALETTES = new Set(["cool-structured"]);
const ROLES: ImageAssetRole[] = ["hero", "detail", "context", "texture"];

export function visualRecipe(archetypeId: string): VisualRecipe {
  return RECIPES[archetypeId] ?? FALLBACK_RECIPE;
}

export function buildTerritoryVisualSpec(session: DiscoverySession, territory: CreativeTerritory): TerritoryVisualSpec {
  const recipe = visualRecipe(territory.id);
  const palette = assignPaletteRoles(territory.colourDirection.swatches);
  const heading = toFace(pickHeading(territory.typeDirection.candidates, recipe.headingKind), recipe.headingKind === "sans" ? FALLBACK_SANS : FALLBACK_SERIF);
  const body = toFace(pickBody(territory.typeDirection.candidates, heading.id), FALLBACK_SANS);
  const businessName = readEvidence(session.business.name) || "The business";
  const description = readEvidence(session.business.description);
  const examplePhrase = territory.examplePhrases[0] || territory.oneLineIdea;
  const supportingLine = territory.examplePhrases[1] || firstSentence(description) || territory.voiceDirection.summary;
  const temperature = temperatureOf(territory.colourDirection.id, palette);
  const assets = imageAssets(territory, recipe.imageTreatment);
  const versionKey = `${territory.id}:${hashText(assets.map((asset) => asset.prompt).join("\n"))}:${territory.colourDirection.id}:${heading.id}`;

  return {
    territoryId: territory.id,
    versionKey,
    paletteId: territory.colourDirection.id,
    paletteName: territory.colourDirection.name,
    palette,
    headingTypeface: heading,
    bodyTypeface: body,
    typographyScale: recipe.typographyScale,
    imageTreatment: recipe.imageTreatment,
    imageAssets: assets,
    texture: recipe.texture,
    borderStyle: recipe.borderStyle,
    spacingCharacter: recipe.spacingCharacter,
    compositionStyle: recipe.compositionStyle,
    graphicMotifs: recipe.graphicMotifs,
    examplePhrase,
    supportingLine,
    businessName,
    temperature,
    axes: {
      polish: recipe.polish,
      expression: recipe.expression,
      composition: recipe.compositionStyle,
      typography: headingKindOf(heading, recipe.typography),
      imagery: recipe.imageTreatment,
      colour: temperature,
      graphic: recipe.graphic,
      voice: territory.voiceDirection.cluster,
    },
  };
}

export function differingAxes(a: TerritoryVisualSpec, b: TerritoryVisualSpec): string[] {
  const keys = ["polish", "expression", "composition", "typography", "imagery", "colour", "graphic", "voice"] as const;
  return keys.filter((key) => a.axes[key] !== b.axes[key]);
}

export function visualForkIsClear(specs: TerritoryVisualSpec[]): boolean {
  const first = specs[0];
  const second = specs[1];
  if (!first || !second) return true;
  return differingAxes(first, second).length >= 3;
}

export function colourWords(swatches: readonly string[]): string[] {
  return assignPaletteRoles(swatches).map((role) => role.name);
}

export function assignPaletteRoles(swatches: readonly string[]): PaletteRole[] {
  const items = swatches.map((hex, index) => ({ hex, index, ...measures(hex) }));
  if (items.length === 0) {
    return [
      { hex: "#F3EEE6", name: "Warm paper", possibleRole: "Background" },
      { hex: "#1A1614", name: "Charcoal", possibleRole: "Primary type" },
    ];
  }
  const background = [...items].sort((a, b) => b.lum - a.lum || a.index - b.index)[0];
  const type = [...items].sort((a, b) => a.lum - b.lum || a.index - b.index)[0];
  const rest = items.filter((item) => item.index !== background?.index && item.index !== type?.index);
  const accent = [...rest].sort((a, b) => accentScore(b) - accentScore(a) || a.index - b.index)[0];
  const roles: PaletteRole[] = items.map((item) => ({
    hex: item.hex,
    name: colourName(item.hex),
    possibleRole: paletteRole(item.index, background?.index, type?.index, accent?.index),
  }));
  return disambiguateNames(roles, items);
}

function paletteRole(
  index: number,
  background: number | undefined,
  type: number | undefined,
  accent: number | undefined,
): PaletteRole["possibleRole"] {
  if (index === background) return "Background";
  if (index === type) return "Primary type";
  if (index === accent) return "Accent";
  return "Supporting";
}

function disambiguateNames(roles: PaletteRole[], items: Array<{ lum: number }>): PaletteRole[] {
  const groups = new Map<string, number[]>();
  roles.forEach((role, index) => {
    const indexes = groups.get(role.name) ?? [];
    indexes.push(index);
    groups.set(role.name, indexes);
  });
  for (const [name, indexes] of groups) {
    if (indexes.length < 2) continue;
    const ordered = [...indexes].sort((a, b) => (items[b]?.lum ?? 0) - (items[a]?.lum ?? 0));
    ordered.forEach((index, order) => {
      const role = roles[index];
      if (!role) return;
      if (order === 0) role.name = `Pale ${name.toLowerCase()}`;
      else if (order === ordered.length - 1) role.name = `Deep ${name.toLowerCase()}`;
    });
  }
  return roles;
}

function imageAssets(territory: CreativeTerritory, treatment: ImageTreatment): TerritoryImageAsset[] {
  return ROLES.map((role, index) => ({
    role,
    source: "fallback" as const,
    prompt: territory.generatedImagePrompts[index] || `${treatment} photograph for the ${role} frame.`,
    treatment,
    status: "fallback" as const,
    url: null,
    provider: null,
    model: null,
  }));
}

function pickHeading(candidates: TypefaceCandidate[], kind: VisualRecipe["headingKind"]): TypefaceCandidate | null {
  const ranked = candidates.map((candidate) => ({ candidate, entry: TYPEFACE_CATALOGUE.find((item) => item.id === candidate.id) }));
  if (kind === "display") {
    return (
      ranked.find((item) => item.entry?.classification === "display")?.candidate ??
      ranked.find((item) => item.entry?.energy === "expressive")?.candidate ??
      candidates[0] ??
      null
    );
  }
  if (kind === "sans") {
    return (
      ranked.find((item) => (item.entry?.signals.geometric ?? 0) >= 0.6)?.candidate ??
      ranked.find((item) => item.entry?.classification === "sans" && item.entry.warmth === "cool")?.candidate ??
      ranked.find((item) => item.entry?.classification === "sans")?.candidate ??
      candidates[0] ??
      null
    );
  }
  return (
    ranked.find((item) => item.entry?.classification === "serif" && item.entry.energy === "restrained")?.candidate ??
    ranked.find((item) => item.entry?.classification === "serif")?.candidate ??
    candidates[0] ??
    null
  );
}

function pickBody(candidates: TypefaceCandidate[], headingId: string): TypefaceCandidate | null {
  const sans = candidates.find((candidate) => candidate.id !== headingId && TYPEFACE_CATALOGUE.find((item) => item.id === candidate.id)?.classification === "sans");
  if (sans) return sans;
  return candidates.find((candidate) => candidate.id !== headingId) ?? null;
}

function toFace(candidate: TypefaceCandidate | null, fallback: TerritoryTypeface): TerritoryTypeface {
  if (!candidate) return fallback;
  return {
    id: candidate.id,
    name: candidate.name,
    fontFamily: candidate.fontFamily,
    license: candidate.license,
    source: candidate.source,
  };
}

function headingKindOf(face: TerritoryTypeface, fallback: TerritoryVisualSpec["axes"]["typography"]): TerritoryVisualSpec["axes"]["typography"] {
  const entry = TYPEFACE_CATALOGUE.find((item) => item.id === face.id);
  if (entry?.classification === "display") return "display";
  if (entry?.classification === "sans") return "sans";
  if (entry?.classification === "serif") return "serif";
  return fallback;
}

function temperatureOf(paletteId: string, palette: PaletteRole[]): TerritoryVisualSpec["temperature"] {
  if (WARM_PALETTES.has(paletteId)) return "warm";
  if (COOL_PALETTES.has(paletteId)) return "cool";
  const hues = palette.map((role) => measures(role.hex).hue);
  const average = hues.reduce((sum, hue) => sum + hue, 0) / Math.max(1, hues.length);
  if (average < 70 || average > 330) return "warm";
  if (average > 170 && average < 250) return "cool";
  return "neutral";
}

function measures(hex: string): { lum: number; sat: number; hue: number } {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return { lum: l, sat: s, hue: h };
}

function accentScore(item: { sat: number; lum: number }): number {
  const usable = item.lum > 0.82 || item.lum < 0.16 ? 0.35 : 1;
  return item.sat * usable;
}

function colourName(hex: string): string {
  const { lum, sat, hue } = measures(hex);
  const light = lum * 100;
  if (light > 86) {
    if (sat < 0.12) return "Warm paper";
    if (hue >= 170 && hue < 230) return "Mist";
    return "Warm cream";
  }
  if ((hue < 22 || hue >= 340) && light > 60) return "Dusty rose";
  if (light < 18) return sat < 0.18 ? "Charcoal" : "Ink";
  if (light < 30 && sat < 0.22) return "Charcoal";
  if (sat < 0.12) return light > 55 ? "Warm grey" : "Stone";
  if (hue < 18 || hue >= 345) return light > 52 ? "Blush" : "Clay";
  if (hue < 45) return light > 58 ? "Sand" : "Clay";
  if (hue < 72) return light > 64 ? "Warm cream" : "Ochre";
  if (hue < 165) return light > 48 ? "Sage" : "Olive";
  if (hue < 200) return light > 52 ? "Mist" : "Slate";
  if (hue < 260) return light > 50 ? "Pale blue" : "Ink blue";
  return light > 50 ? "Mauve" : "Plum";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "").trim();
  const value = raw.length === 3 ? raw.split("").map((character) => character + character).join("") : raw;
  return {
    r: Number.parseInt(value.slice(0, 2), 16) || 0,
    g: Number.parseInt(value.slice(2, 4), 16) || 0,
    b: Number.parseInt(value.slice(4, 6), 16) || 0,
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: hue * 60, s: saturation, l: lightness };
}

export function readEvidence(value: { state: string; evidence?: { raw: string } }): string {
  if (value.state !== "evidence" || !value.evidence) return "";
  return value.evidence.raw.trim();
}

function firstSentence(text: string): string {
  const sentence = text.split(/(?<=\.)\s/)[0]?.trim() ?? "";
  if (sentence.length <= 140) return sentence;
  return `${sentence.slice(0, 137).trim()}…`;
}

export function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
