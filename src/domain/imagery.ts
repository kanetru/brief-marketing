import type { ImageryPreferences } from "../types/discovery";

export interface ImageryDirectionDefinition {
  id: string;
  /** Accessible name. The photograph does the choosing. */
  label: string;
  src: string;
  parents: readonly string[];
  lighting: string;
  composition: string;
  polish: string;
  grain: string;
  subjectDistance: string;
  humanPresence: string;
  colourIntensity: string;
  spontaneity: string;
  symmetry: string;
  texture: string;
  environment: string;
  editorialness: string;
  commercialness: string;
  warmth: string;
  energy: string;
}

export interface ImageryPreferenceProfile {
  loved: string[];
  interesting: string[];
  rejected: string[];
  closer: string[];
  closerRejected: string[];
  /** Characteristics taken from the stills they kept, not from a graphic shape. */
  characteristics: string[];
  summary: string;
}

const still = (
  id: string,
  label: string,
  src: string,
  parents: readonly string[],
  traits: Omit<ImageryDirectionDefinition, "id" | "label" | "src" | "parents">,
): ImageryDirectionDefinition => ({ id, label, src, parents, ...traits });

export const IMAGERY_DIRECTIONS: readonly ImageryDirectionDefinition[] = [
  still("documentary", "Documentary", "/mood/mood-documentary.jpg", [], { lighting: "window", composition: "loose", polish: "raw", grain: "visible", subjectDistance: "medium", humanPresence: "implied", colourIntensity: "muted", spontaneity: "observed", symmetry: "off", texture: "worn", environment: "workplace", editorialness: "low", commercialness: "low", warmth: "warm", energy: "quiet" }),
  still("polished", "Polished", "/mood/mood-polished.jpg", [], { lighting: "studio", composition: "centred", polish: "high", grain: "none", subjectDistance: "object", humanPresence: "none", colourIntensity: "controlled", spontaneity: "directed", symmetry: "high", texture: "smooth", environment: "studio", editorialness: "medium", commercialness: "high", warmth: "neutral", energy: "still" }),
  still("editorial", "Editorial", "/mood/mood-editorial.jpg", [], { lighting: "hard side", composition: "framed", polish: "composed", grain: "slight", subjectDistance: "medium", humanPresence: "present", colourIntensity: "considered", spontaneity: "posed", symmetry: "partial", texture: "mixed", environment: "set", editorialness: "high", commercialness: "medium", warmth: "cool", energy: "held" }),
  still("people_first", "People-first", "/mood/mood-people.jpg", [], { lighting: "tungsten", composition: "crowded", polish: "candid", grain: "slight", subjectDistance: "close", humanPresence: "central", colourIntensity: "warm", spontaneity: "caught", symmetry: "off", texture: "skin", environment: "social", editorialness: "medium", commercialness: "low", warmth: "warm", energy: "social" }),
  still("detail_craft", "Detail and craft", "/mood/mood-material.jpg", [], { lighting: "north light", composition: "tight", polish: "tactile", grain: "fine", subjectDistance: "macro", humanPresence: "none", colourIntensity: "natural", spontaneity: "still", symmetry: "partial", texture: "material", environment: "bench", editorialness: "medium", commercialness: "low", warmth: "warm", energy: "still" }),
  still("atmospheric", "Atmospheric", "/mood/mood-atmospheric.jpg", [], { lighting: "dusk", composition: "wide", polish: "cinematic", grain: "low", subjectDistance: "far", humanPresence: "none", colourIntensity: "low", spontaneity: "found", symmetry: "quiet", texture: "air", environment: "place", editorialness: "high", commercialness: "low", warmth: "mixed", energy: "low" }),
];

export const CLOSER_STILLS: readonly ImageryDirectionDefinition[] = [
  still("intimate_documentary", "Hands on the work", "/mood/mood-intimate-documentary.jpg", ["documentary", "detail_craft"], { lighting: "window", composition: "tight", polish: "raw", grain: "visible", subjectDistance: "close", humanPresence: "hands", colourIntensity: "muted", spontaneity: "observed", symmetry: "off", texture: "material", environment: "bench", editorialness: "low", commercialness: "low", warmth: "warm", energy: "quiet" }),
  still("editorial_documentary", "The detail, published", "/mood/mood-editorial-documentary.jpg", ["documentary", "editorial", "detail_craft"], { lighting: "daylight", composition: "framed", polish: "editorial", grain: "fine", subjectDistance: "close", humanPresence: "none", colourIntensity: "considered", spontaneity: "arranged", symmetry: "partial", texture: "material", environment: "studio", editorialness: "high", commercialness: "medium", warmth: "neutral", energy: "still" }),
  still("flash_candid", "Flash, mid-gesture", "/mood/mood-flash.jpg", ["people_first", "editorial"], { lighting: "flash", composition: "caught", polish: "imperfect", grain: "hard", subjectDistance: "close", humanPresence: "central", colourIntensity: "high", spontaneity: "caught", symmetry: "off", texture: "skin", environment: "room", editorialness: "high", commercialness: "low", warmth: "mixed", energy: "high" }),
  still("quiet_architecture", "Quiet architecture", "/mood/mood-architectural.jpg", ["atmospheric", "polished", "editorial"], { lighting: "even daylight", composition: "axial", polish: "restrained", grain: "none", subjectDistance: "far", humanPresence: "none", colourIntensity: "low", spontaneity: "still", symmetry: "high", texture: "stone", environment: "building", editorialness: "high", commercialness: "medium", warmth: "cool", energy: "still" }),
];

export function imageryLabel(id: string): string {
  return [...IMAGERY_DIRECTIONS, ...CLOSER_STILLS].find((direction) => direction.src.endsWith(id) || direction.id === id || direction.label === id)?.label ?? id;
}

export function closerStillsFor(loved: readonly string[], interesting: readonly string[]): readonly ImageryDirectionDefinition[] {
  const chosen = new Set([...loved, ...interesting]);
  const matched = CLOSER_STILLS.filter((still) => still.parents.some((parent) => chosen.has(parent)));
  return matched.length > 0 ? matched : CLOSER_STILLS.slice(0, 2);
}

export function imageryProfile(preferences: ImageryPreferences): ImageryPreferenceProfile {
  const name = (id: string) => imageryLabel(id);
  const loved = preferences.preferredDirectionIds.map(name);
  const interesting = (preferences.interestIds ?? []).map(name);
  const rejected = preferences.avoidedDirectionIds.map(name);
  const closer = (preferences.closerStillIds ?? []).map(name);
  const closerRejected = (preferences.closerRejectedIds ?? []).map(name);
  const keptIds = new Set<string>([...preferences.preferredDirectionIds, ...(preferences.closerStillIds ?? [])]);
  const kept = [...IMAGERY_DIRECTIONS, ...CLOSER_STILLS].filter((item) => keptIds.has(item.id));
  const characteristics = [...new Set(kept.flatMap((item) => [item.lighting, item.warmth, item.grain, item.humanPresence, item.polish]))];
  const summary = loved.length || interesting.length || rejected.length
    ? `Loves ${loved.join(", ") || "nothing yet"}. Interesting: ${interesting.join(", ") || "none"}. Not them: ${rejected.join(", ") || "none"}. Closer: ${closer.join(", ") || "not yet"}. Refused closer: ${closerRejected.join(", ") || "none"}. The photographs they kept read as ${characteristics.join(", ") || "unsettled"}.`
    : "Imagery taste is still unknown.";
  return { loved, interesting, rejected, closer, closerRejected, characteristics, summary };
}
