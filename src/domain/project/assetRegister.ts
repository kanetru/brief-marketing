import type { AssetItem, AssetStatus, UnderstandingField } from "../../types/project";
import type { BriefProject } from "../../types/project";

export function buildAssetRegister(project: BriefProject, fields: UnderstandingField[]): AssetItem[] {
  const name = project.businessName || "the business";
  const proposed: Array<Omit<AssetItem, "status" | "owner" | "notes">> = [
    item("asset-voice", "Voice lines for the next three surfaces", "brand", "The voice idea needs lines a manager can paste, not a trait list.", ["brand.voice"], "now", "Three short lines written from the voice idea."),
    item("asset-type", "Type pairing on the business name", "brand", "The reading already names a pairing. Set the name in it before designing anything else.", ["creative.territory"], "now", "The two faces from the reading."),
    item("asset-palette", "Working palette, with roles", "brand", "Colour is only useful once background, type, and accent have jobs.", ["creative.territory"], "now", "The palette from the current reading."),
    item("asset-home", `First screen for ${name}`, "web", "The site should open with what they do and who it is for, in their words.", ["company.what_they_do", "audience.primary"], "now", "One sentence from the client, not a tagline workshop."),
    item("asset-about", "A page that shows the work happening", "web", "Process is more useful here than a company story.", ["company.offer"], "soon", "A short sequence of the work, captioned."),
    item("asset-story", "One customer or job story", "content", "A single specific job will carry more than a series with no proof.", ["audience.primary", "company.offer"], "soon", "Permission, the job, and what changed."),
    item("asset-series", "A recurring series named after the work", "content", "One repeating format stops every post from being a new idea.", ["brand.voice"], "soon", "A name, a length, and a reason to repeat it."),
    item("asset-process", "Process photographs", "photo_video", "The imagery direction wants the work in its place, not a styled result.", ["creative.territory"], "soon", "The place the work happens, in the palette's light."),
    item("asset-proof", "Proof the claim can stand on", "proof", "If a sentence cannot point at a job, a number, or a name, it should not ship.", ["company.offer"], "later", "One review, one metric, or one before-and-after."),
  ];
  return proposed.map((asset) => {
    const state = project.assetStates[asset.id];
    return {
      ...asset,
      evidenceIds: asset.evidenceIds.flatMap((id) => fields.find((field) => field.id === id)?.evidenceIds ?? [id]),
      status: state?.status ?? "proposed",
      owner: state?.owner ?? "",
      notes: state?.notes ?? "",
    };
  });
}

export function nextAssetStatus(status: AssetStatus): AssetStatus {
  const order: AssetStatus[] = ["proposed", "approved", "in_progress", "complete"];
  const index = order.indexOf(status);
  return order[(index + 1) % order.length] ?? "proposed";
}

function item(
  id: string,
  name: string,
  category: AssetItem["category"],
  reason: string,
  evidenceIds: string[],
  priority: AssetItem["priority"],
  sourceMaterial: string,
): Omit<AssetItem, "status" | "owner" | "notes"> {
  return { id, name, category, reason, evidenceIds, priority, sourceMaterial };
}
