import type { ImageryDirectionId } from "../types/discovery";

export interface ImageryDirectionDefinition {
  id: ImageryDirectionId;
  /** Accessible name. The board itself stays visual. */
  label: string;
}

export const IMAGERY_DIRECTIONS: readonly ImageryDirectionDefinition[] = [
  { id: "documentary", label: "Documentary" },
  { id: "polished", label: "Polished" },
  { id: "editorial", label: "Editorial" },
  { id: "people_first", label: "People-first" },
  { id: "detail_craft", label: "Detail and craft" },
  { id: "atmospheric", label: "Atmospheric" },
];

export function imageryLabel(id: ImageryDirectionId): string {
  return IMAGERY_DIRECTIONS.find((direction) => direction.id === id)?.label ?? id;
}
