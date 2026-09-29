import { TYPEFACE_CATALOGUE } from "./typefaceCatalogue";
import { textValue } from "../state/textEvidence";
import type { StrategistContext } from "./strategistValidate";
import type { BrandIntelligence } from "../types/brandIntelligence";
import type { DiscoverySession } from "../types/discovery";

export function strategistRequest(session: DiscoverySession, intelligence: BrandIntelligence): { brief: string; context: StrategistContext } {
  const name = textValue(session.business.name).trim() || "Unnamed";
  const description = textValue(session.business.description);
  const context: StrategistContext = {
    name,
    description,
    archetypeIds: intelligence.draftTerritories.map((territory) => territory.id),
  };
  const catalogue = TYPEFACE_CATALOGUE.map((entry) => entry.id).join(", ");
  const signals = intelligence.draftModel.signals
    .slice(0, 12)
    .map((signal) => `${signal.dimension} ${signal.polarity} ${signal.strength}`)
    .join("; ");
  const avoids = intelligence.draftModel.hardAvoids.map((item) => item.summary).join("; ");
  const brief = [
    `Business name: ${name}`,
    `What they do: ${description}`,
    `People come for: ${textValue(session.business.peopleComeFor)}`,
    `Audience: ${textValue(session.audience.bestCustomers)}`,
    `Goal: ${textValue(session.goals.twelveMonthSuccess)}`,
    `Personality they want: ${session.personality.attract.selected.join(", ")}`,
    `Personality they refuse: ${session.personality.avoid.selected.join(", ")}`,
    `Colour lean: ${session.colourPreferences.preferredPaletteIds.join(", ") || "unset"}`,
    `Colour push: ${session.colourPreferences.colourPush ?? "unset"}`,
    `Type directions: ${session.typographyPreferences.preferredDirectionIds.join(", ") || "unset"}`,
    `Type refinements: ${session.typographyPreferences.refinementIds.join(", ") || "unset"}`,
    `Imagery: ${session.imageryPreferences.preferredDirectionIds.join(", ") || "unset"}`,
    `Voice they like: ${textValue(session.voicePreferences.preferredLanguage)}`,
    `Voice they refuse: ${textValue(session.voicePreferences.avoidedLanguage)}`,
    `Signal notes: ${signals}`,
    `Hard avoids: ${avoids || "none recorded"}`,
    `Tensions: ${intelligence.draftModel.tensions.map((item) => item.statement).join(" | ") || "none"}`,
    `Archetype ids to align, in order: ${context.archetypeIds.join(", ")}`,
    `Allowed typeface ids (use only these): ${catalogue}`,
    "Write two territories. Each archetypeId must be one of the ids above. Pairing headingId and bodyId must be catalogue ids.",
  ].join("\n");
  return { brief, context };
}
