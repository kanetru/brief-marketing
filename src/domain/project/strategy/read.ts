import { textValue } from "../../../state/textEvidence";
import type { DiscoverySession } from "../../../types/discovery";
import type { Makeable, StrategyInputs } from "../../../types/strategy";

export interface StrategySource {
  businessName: string;
  description: string;
  offer: string;
  difference: string;
  audience: string;
  horizon: string;
  outcomes: string[];
  preferredLanguage: string;
  avoidedLanguage: string;
  inputs: StrategyInputs;
  categoryLanguage: string[];
  categoryClaims: string[];
}

export type Trade = "making" | "hospitality" | "practice" | "general";

export function strategySource(
  session: DiscoverySession,
  extras?: { categoryLanguage?: string[]; categoryClaims?: string[] },
): StrategySource {
  return {
    businessName: textValue(session.business.name),
    description: textValue(session.business.description),
    offer: textValue(session.business.peopleComeFor),
    difference: session.business.differentiation.state === "evidence" ? session.business.differentiation.evidence.raw : "",
    audience: textValue(session.audience.bestCustomers),
    horizon: textValue(session.goals.twelveMonthSuccess),
    outcomes: session.goals.outcomes.selected,
    preferredLanguage: textValue(session.voicePreferences.preferredLanguage),
    avoidedLanguage: textValue(session.voicePreferences.avoidedLanguage),
    inputs: session.strategyInputs,
    categoryLanguage: extras?.categoryLanguage ?? [],
    categoryClaims: extras?.categoryClaims ?? [],
  };
}

export function tradeOf(source: StrategySource): Trade {
  const text = `${source.description} ${source.offer} ${source.businessName}`.toLowerCase();
  if (/restaurant|dining|menu|kitchen|chef|café|cafe|bistro|hospitality|supper/.test(text)) return "hospitality";
  if (/\barchitects?\b|\barchitecture\b|planning application/.test(text)) return "practice";
  if (/furniture|joinery|workshop|timber|cabinet|\bmade\b|making|bench/.test(text)) return "making";
  return "general";
}

export function spoken(source: StrategySource): string {
  return [
    source.description,
    source.offer,
    source.difference,
    source.audience,
    source.horizon,
    textValue(source.inputs.goalFollowUp),
    textValue(source.inputs.beforeContact),
    textValue(source.inputs.wantNote),
  ].join(" ").toLowerCase();
}

export function capacityTight(source: StrategySource): boolean {
  if (source.inputs.capacity === "tight" || source.inputs.capacity === "full") return true;
  if (source.inputs.constraints.includes("capacity")) return true;
  return /can(?:not|'t) (?:fulfil|fulfill|take)|fully booked|no capacity|bench is full|at capacity/.test(spoken(source));
}

export function wants(source: StrategySource, kind: StrategyInputs["want"][number]): boolean {
  if (source.inputs.want.includes(kind)) return true;
  if (kind === "more_volume") return source.outcomes.includes("generate_enquiries") || source.outcomes.includes("increase_sales");
  if (kind === "higher_value") return /higher[- ]value|architectural|better-fit|better fit/.test(spoken(source));
  return false;
}

export function canMake(source: StrategySource, item: Makeable): boolean {
  return source.inputs.canMake.includes(item);
}

export function canShow(source: StrategySource): boolean {
  return canMake(source, "photography") || canMake(source, "process_footage") || canMake(source, "short_video");
}

export function growthOffer(source: StrategySource): string {
  return source.inputs.offers.find((offer) => offer.role === "growth")?.name
    || source.inputs.offers.find((offer) => offer.importance === "primary")?.name
    || "";
}
