import type { TypographyDirectionId } from "../types/discovery";
import type { TypefaceCandidate } from "../types/brandIntelligence";
import { MORE_TYPEFACES } from "./typefaceExpansion";

/**
 * Local catalogue of faces that can be named in a handover.
 * Licences are SIL Open Font License unless noted. We do not bundle the files
 * except for the handful already used as discovery specimens.
 * Source for all of these: Google Fonts.
 */
export interface TypefaceEntry {
  id: string;
  name: string;
  license: string;
  source: string;
  fontFamily: string;
  classification: "serif" | "sans" | "display";
  voice: string;
  contrast: "high" | "medium" | "low";
  formality: "formal" | "informal" | "mixed";
  energy: "expressive" | "restrained";
  use: "editorial" | "utilitarian" | "display";
  era: "classic" | "contemporary";
  warmth: "warm" | "cool" | "neutral";
  accessibility: string;
  directions: TypographyDirectionId[];
  signals: Record<string, number>;
  width: "condensed" | "normal" | "wide";
  xHeight: "small" | "medium" | "large";
  /** Humanist drawing versus constructed geometry. */
  geometry: "human" | "geometric" | "mixed";
  historical: string;
  pairingNote: string;
}

const CORE_TYPEFACES: readonly TypefaceEntry[] = [
  face("fraunces", "Fraunces", '"Fraunces Variable", Georgia, serif', "serif", "old-style", "high", "mixed", "expressive", "editorial", "contemporary", "warm", "Optical sizes help small text.", ["editorial_serif"], { editorial: 0.9, warm: 0.7, expressive: 0.6, organic: 0.4, classic: 0.3 }),
  face("newsreader", "Newsreader", "Newsreader, Georgia, serif", "serif", "transitional", "medium", "mixed", "restrained", "editorial", "contemporary", "warm", "Designed for long text.", ["editorial_serif"], { editorial: 0.85, restrained: 0.5, warm: 0.4, classic: 0.3 }),
  face("libre-baskerville", "Libre Baskerville", '"Libre Baskerville", Palatino, serif', "serif", "transitional", "medium", "formal", "restrained", "editorial", "classic", "neutral", "Sturdy at text sizes.", ["classic_serif"], { classic: 0.9, formal: 0.6, polished: 0.4, traditional: 0.5 }),
  face("source-serif-4", "Source Serif 4", '"Source Serif 4", Georgia, serif', "serif", "transitional", "medium", "mixed", "restrained", "editorial", "contemporary", "neutral", "Broad weight range.", ["editorial_serif", "classic_serif"], { editorial: 0.6, classic: 0.5, practical: 0.4, restrained: 0.4 }),
  face("lora", "Lora", "Lora, Georgia, serif", "serif", "contemporary", "medium", "informal", "restrained", "editorial", "contemporary", "warm", "Calligraphic, readable.", ["editorial_serif"], { warm: 0.6, editorial: 0.5, human: 0.5, organic: 0.3 }),
  face("eb-garamond", "EB Garamond", '"EB Garamond", Garamond, serif', "serif", "old-style", "high", "formal", "restrained", "editorial", "classic", "warm", "Best at comfortable sizes.", ["classic_serif"], { classic: 0.85, formal: 0.6, traditional: 0.6, editorial: 0.4 }),
  face("instrument-serif", "Instrument Serif", '"Instrument Serif", Georgia, serif', "serif", "contemporary", "high", "mixed", "expressive", "editorial", "contemporary", "neutral", "Display-leaning serif.", ["editorial_serif"], { editorial: 0.7, contemporary: 0.7, expressive: 0.4 }),
  face("literata", "Literata", "Literata, Georgia, serif", "serif", "contemporary", "medium", "mixed", "restrained", "editorial", "contemporary", "warm", "Built for long reading.", ["editorial_serif"], { editorial: 0.7, warm: 0.4, practical: 0.4 }),
  face("playfair-display", "Playfair Display", '"Playfair Display", Georgia, serif', "serif", "didone", "high", "formal", "expressive", "display", "classic", "neutral", "Headlines only. Thin strokes fail when small.", ["classic_serif", "expressive_display"], { classic: 0.7, expressive: 0.6, polished: 0.5, editorial: 0.4 }),
  face("cormorant-garamond", "Cormorant Garamond", '"Cormorant Garamond", Garamond, serif', "serif", "old-style", "high", "formal", "restrained", "editorial", "classic", "warm", "Elegant at display sizes.", ["classic_serif"], { classic: 0.8, editorial: 0.6, warm: 0.3, formal: 0.5 }),
  face("petrona", "Petrona", "Petrona, Georgia, serif", "serif", "contemporary", "medium", "mixed", "restrained", "editorial", "contemporary", "warm", "Readable text serif.", ["editorial_serif"], { editorial: 0.6, warm: 0.5, human: 0.3 }),
  face("ibm-plex-serif", "IBM Plex Serif", '"IBM Plex Serif", Georgia, serif', "serif", "transitional", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Pairs with IBM Plex Sans.", ["classic_serif"], { technical: 0.4, practical: 0.5, classic: 0.3, clean: 0.3 }),
  face("inter", "Inter", "Inter, sans-serif", "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Very high text legibility.", ["clean_sans"], { clean: 0.8, utilitarian: 0.7, practical: 0.6, contemporary: 0.4 }),
  face("outfit", "Outfit", '"Outfit Variable", "Avenir Next", sans-serif', "sans", "geometric", "low", "mixed", "restrained", "utilitarian", "contemporary", "cool", "Geometric, still readable.", ["clean_sans"], { geometric: 0.7, clean: 0.7, contemporary: 0.6, cool: 0.3 }),
  face("nunito-sans", "Nunito Sans", '"Nunito Sans", "Avenir Next", sans-serif', "sans", "humanist", "low", "informal", "restrained", "utilitarian", "contemporary", "warm", "Friendly text sans.", ["humanist_sans"], { human: 0.7, approachable: 0.7, warm: 0.5, accessible: 0.4 }),
  face("source-sans-3", "Source Sans 3", '"Source Sans 3", sans-serif', "sans", "humanist", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Workhorse text face.", ["humanist_sans", "clean_sans"], { practical: 0.7, human: 0.4, clean: 0.5, utilitarian: 0.5 }),
  face("archivo", "Archivo", "Archivo, sans-serif", "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Neutral grotesque.", ["clean_sans", "bold_grotesk"], { clean: 0.5, contemporary: 0.5, geometric: 0.3 }),
  face("archivo-black", "Archivo Black", '"Archivo Black", "Arial Black", sans-serif', "sans", "grotesk", "low", "informal", "expressive", "display", "contemporary", "neutral", "One weight. Headlines only.", ["bold_grotesk"], { expressive: 0.9, contemporary: 0.6, geometric: 0.4 }),
  face("space-grotesk", "Space Grotesk", '"Space Grotesk", sans-serif', "sans", "geometric", "low", "mixed", "expressive", "display", "contemporary", "cool", "Technical, a bit quirky.", ["clean_sans", "bold_grotesk"], { geometric: 0.7, technical: 0.6, contemporary: 0.6, cool: 0.3 }),
  face("syne", "Syne", "Syne, Futura, sans-serif", "display", "geometric", "low", "informal", "expressive", "display", "contemporary", "cool", "Display. Not for paragraphs.", ["expressive_display"], { expressive: 0.85, playful: 0.45, contemporary: 0.7, geometric: 0.4 }),
  face("dm-sans", "DM Sans", '"DM Sans", sans-serif', "sans", "geometric", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Low contrast, plain.", ["clean_sans"], { clean: 0.7, geometric: 0.4, contemporary: 0.5, minimal: 0.4 }),
  face("manrope", "Manrope", "Manrope, sans-serif", "sans", "geometric", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Modern geometric sans.", ["clean_sans"], { clean: 0.65, contemporary: 0.6, geometric: 0.45, minimal: 0.3 }),
  face("atkinson-hyperlegible", "Atkinson Hyperlegible", '"Atkinson Hyperlegible", sans-serif', "sans", "humanist", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Letterforms distinguished for low vision.", ["humanist_sans"], { accessible: 0.9, practical: 0.6, human: 0.4, clean: 0.3 }),
  face("ibm-plex-sans", "IBM Plex Sans", '"IBM Plex Sans", sans-serif', "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Technical, highly readable.", ["clean_sans"], { technical: 0.6, clean: 0.6, utilitarian: 0.6, practical: 0.4 }),
  face("libre-franklin", "Libre Franklin", '"Libre Franklin", sans-serif', "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Franklin lineage, open licence.", ["clean_sans", "bold_grotesk"], { clean: 0.4, contemporary: 0.4, practical: 0.4 }),
  face("cabin", "Cabin", "Cabin, sans-serif", "sans", "humanist", "low", "informal", "restrained", "utilitarian", "contemporary", "warm", "Humanist, slightly wide.", ["humanist_sans"], { human: 0.6, warm: 0.45, approachable: 0.5 }),
  face("karla", "Karla", "Karla, sans-serif", "sans", "grotesk", "low", "informal", "restrained", "utilitarian", "contemporary", "warm", "Grotesque with a soft side.", ["humanist_sans", "clean_sans"], { warm: 0.4, approachable: 0.5, clean: 0.4, human: 0.3 }),
  face("lexend", "Lexend", "Lexend, sans-serif", "sans", "humanist", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Designed to reduce reading stress.", ["humanist_sans"], { accessible: 0.8, practical: 0.5, clean: 0.3 }),
  face("public-sans", "Public Sans", '"Public Sans", sans-serif', "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Neutral public-interest grotesque.", ["clean_sans"], { practical: 0.6, clean: 0.5, utilitarian: 0.5, accessible: 0.3 }),
  face("familjen-grotesk", "Familjen Grotesk", '"Familjen Grotesk", sans-serif', "sans", "grotesk", "low", "mixed", "restrained", "utilitarian", "contemporary", "neutral", "Plain grotesque.", ["clean_sans"], { clean: 0.5, contemporary: 0.4, minimal: 0.3 }),
  face("figtree", "Figtree", "Figtree, sans-serif", "sans", "humanist", "low", "informal", "restrained", "utilitarian", "contemporary", "warm", "Friendly geometric-humanist.", ["humanist_sans"], { approachable: 0.6, warm: 0.4, contemporary: 0.4, human: 0.3 }),
  face("besley", "Besley", "Besley, Georgia, serif", "serif", "scotch", "medium", "formal", "restrained", "editorial", "classic", "warm", "Scotch roman, text and display.", ["classic_serif"], { classic: 0.6, editorial: 0.5, warm: 0.3, formal: 0.4 }),
];

function face(
  id: string,
  name: string,
  fontFamily: string,
  classification: TypefaceEntry["classification"],
  voice: string,
  contrast: TypefaceEntry["contrast"],
  formality: TypefaceEntry["formality"],
  energy: TypefaceEntry["energy"],
  use: TypefaceEntry["use"],
  era: TypefaceEntry["era"],
  warmth: TypefaceEntry["warmth"],
  accessibility: string,
  directions: TypographyDirectionId[],
  signals: Record<string, number>,
): TypefaceEntry {
  return {
    id,
    name,
    license: "SIL Open Font License",
    source: "Google Fonts",
    fontFamily,
    classification,
    voice,
    contrast,
    formality,
    energy,
    use,
    era,
    warmth,
    accessibility,
    directions,
    signals,
    width: "normal",
    xHeight: classification === "display" || use === "display" ? "large" : "medium",
    geometry: classification === "serif" || voice === "humanist" ? "human" : voice === "geometric" ? "geometric" : "mixed",
    historical: `${era} ${voice}`,
    pairingNote: classification === "serif" ? "Holds a headline; wants a plain sans for the practical text." : "Carries information; wants a serif or a mono when the headline needs a different job.",
  };
}

export const TYPEFACE_CATALOGUE: readonly TypefaceEntry[] = [...CORE_TYPEFACES, ...MORE_TYPEFACES];

export function catalogueCategories(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of TYPEFACE_CATALOGUE) {
    const key = entry.voice;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function shortlistTypefaces(
  nets: Record<string, number>,
  avoidedDirectionIds: readonly string[],
  evidenceSources: string[],
): TypefaceCandidate[] {
  const avoided = new Set(avoidedDirectionIds);
  const ranked = TYPEFACE_CATALOGUE.map((entry) => {
    if (entry.directions.some((direction) => avoided.has(direction))) return { entry, score: -1 };
    let score = 0;
    for (const [dimension, factor] of Object.entries(entry.signals)) {
      score += factor * Math.max(0, nets[dimension] ?? 0);
    }
    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));

  const picked: TypefaceEntry[] = [];
  for (const item of ranked) {
    if (picked.length >= 4) break;
    if (picked.some((entry) => entry.classification === item.entry.classification && entry.energy === item.entry.energy && picked.length >= 2)) {
      continue;
    }
    picked.push(item.entry);
  }
  if (picked.length < 2) {
    for (const item of ranked) {
      if (picked.length >= 2) break;
      if (!picked.includes(item.entry)) picked.push(item.entry);
    }
  }

  return picked.slice(0, 4).map((entry) => ({
    id: entry.id,
    name: entry.name,
    source: entry.source,
    license: entry.license,
    fontFamily: entry.fontFamily,
    why: reasonsFor(entry, nets),
    evidenceSources,
  }));
}

function reasonsFor(entry: TypefaceEntry, nets: Record<string, number>): string[] {
  const matched = Object.entries(entry.signals)
    .filter(([dimension, factor]) => factor >= 0.4 && (nets[dimension] ?? 0) > 0)
    .sort((a, b) => (nets[b[0]] ?? 0) - (nets[a[0]] ?? 0))
    .slice(0, 3)
    .map(([dimension]) => `${entry.name} carries a ${dimension} character that the evidence already supports`);
  const role =
    entry.energy === "expressive"
      ? `${entry.classification} with an expressive ${entry.voice} voice — a candidate, not a prescription`
      : `${entry.classification}, ${entry.warmth} and ${entry.energy}, useful as a starting face`;
  return [role, entry.accessibility, ...matched].slice(0, 4);
}

export function typefaceById(id: string): TypefaceEntry | undefined {
  return TYPEFACE_CATALOGUE.find((entry) => entry.id === id);
}
