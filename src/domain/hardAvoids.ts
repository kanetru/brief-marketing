import type { DiscoveryEvidence } from "./evidence";
import { VISUAL_DIRECTIONS } from "./visualDirections";
import type { HardAvoid } from "../types/discovery";

/** Explicit rejections only. The model is not asked to invent this list. */
export function buildHardAvoids(evidence: DiscoveryEvidence): HardAvoid[] {
  const items: HardAvoid[] = [];

  pushList(items, evidence.clientRejected["personality.avoid"], "Personality", "personality.avoid");
  pushList(items, evidence.clientRejected["colour.avoided"], "Colour", "colour.avoided");
  pushList(items, evidence.clientRejected["typography.avoided"], "Typography", "typography.avoided");
  pushList(items, evidence.clientRejected["imagery.avoided"], "Imagery", "imagery.avoided");

  const avoidedLanguage = evidence.clientSaid["voice.avoidedLanguage"];
  if (avoidedLanguage) {
    items.push({ label: "Language", detail: avoidedLanguage, sourcePath: "voice.avoidedLanguage" });
  }

  for (const [path, value] of Object.entries(evidence.clientRejected)) {
    if (!path.startsWith("voice.") || !value || typeof value !== "object") continue;
    const record = value as { choice?: unknown; situation?: unknown };
    if (record.choice !== "none" || typeof record.situation !== "string") continue;
    items.push({ label: "Voice", detail: `None of the lines for “${record.situation}”`, sourcePath: path });
  }

  for (const [path, value] of Object.entries(evidence.clientRejected)) {
    if (!path.startsWith("visual.") || path.endsWith(".other") || !value || typeof value !== "object") continue;
    const record = value as { choice?: unknown; presented?: unknown };
    if (record.choice !== "neither" || !Array.isArray(record.presented)) continue;
    items.push({
      label: "Visual directions",
      detail: `Neither of ${record.presented.map((item) => directionName(String(item))).join(" or ")}`,
      sourcePath: path,
    });
  }

  for (const [path, value] of Object.entries(evidence.clientRejected)) {
    if (!path.startsWith("inspiration.avoid") || !path.endsWith(".name")) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    const notePath = path.replace(/\.name$/, ".note");
    const note = evidence.clientRejected[notePath];
    items.push({
      label: "Reference",
      detail: typeof note === "string" && note.trim() ? `${value} — ${note}` : value,
      sourcePath: path,
    });
  }

  return items;
}

function directionName(id: string): string {
  return VISUAL_DIRECTIONS.find((direction) => direction.id === id)?.accessibleName ?? id;
}

function pushList(items: HardAvoid[], value: unknown, label: string, sourcePath: string) {
  if (!Array.isArray(value)) return;
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    items.push({ label, detail: entry.trim(), sourcePath });
  }
}
