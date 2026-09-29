import type { PracticeProfile } from "./creativePractices";
import { typefaceById, type TypefaceEntry } from "./typefaceCatalogue";
import type { CreativePosture, TypePairing } from "../types/creativeReading";

const SETS: Record<CreativePosture, ReadonlyArray<readonly [string, string]>> = {
  editorial: [
    ["fraunces", "ibm-plex-sans"],
    ["newsreader", "source-sans-3"],
  ],
  raw: [
    ["archivo-black", "cabin"],
    ["syne", "nunito-sans"],
  ],
  precise: [
    ["space-grotesk", "ibm-plex-sans"],
    ["ibm-plex-sans", "ibm-plex-mono"],
  ],
  expressive: [
    ["syne", "outfit"],
    ["bricolage-grotesque", "work-sans"],
  ],
  classic: [
    ["libre-baskerville", "source-sans-3"],
    ["eb-garamond", "public-sans"],
  ],
  warm: [
    ["lora", "nunito-sans"],
    ["fraunces", "cabin"],
  ],
};

export function pairingsFor(
  posture: CreativePosture,
  practice: PracticeProfile,
  refinementIds: readonly string[],
): TypePairing[] {
  const chosen = refinementIds
    .map((id) => typefaceById(id))
    .filter((entry): entry is TypefaceEntry => !!entry)
    .slice(0, 2);
  const pairs: Array<readonly [TypefaceEntry, TypefaceEntry]> = [];
  if (chosen[0]) {
    const body = contrastingBody(chosen[0], posture);
    if (body) pairs.push([chosen[0], body]);
  }
  for (const [headingId, bodyId] of SETS[posture]) {
    if (pairs.length >= 2) break;
    const heading = typefaceById(headingId);
    const body = typefaceById(bodyId);
    if (!heading || !body) continue;
    if (pairs.some(([existing]) => existing.id === heading.id)) continue;
    pairs.push([heading, body]);
  }
  return pairs.slice(0, 2).map(([heading, body]) => ({
    headingId: heading.id,
    heading: heading.name,
    headingFamily: heading.fontFamily,
    bodyId: body.id,
    body: body.name,
    bodyFamily: body.fontFamily,
    reason: reason(heading, body, practice, posture),
  }));
}

function contrastingBody(heading: TypefaceEntry, posture: CreativePosture): TypefaceEntry | undefined {
  const preferred = heading.classification === "serif" || heading.use === "display" ? "ibm-plex-sans" : posture === "precise" ? "source-serif-4" : "lora";
  const mono = posture === "precise" ? typefaceById("ibm-plex-mono") : undefined;
  return typefaceById(preferred) ?? mono ?? typefaceById("source-sans-3");
}

function reason(heading: TypefaceEntry, body: TypefaceEntry, practice: PracticeProfile, posture: CreativePosture): string {
  const job = posture === "precise" ? "keeps measurements and labels practical" : posture === "raw" ? "stops the direction performing roughness" : "keeps the informational text practical";
  return `${heading.name} carries the ${heading.voice} ${posture} character for ${practice.activity}; ${body.name} ${job} when the subject is ${practice.material}, so the direction does not slide into ${practice.cliche}.`;
}
