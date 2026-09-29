import type { DiscoveryEvidence } from "./evidence";
import type { ProfileClarification } from "../types/discovery";

const LABELS: Record<string, string> = {
  "business.name": "Business name",
  "business.description": "What the business does",
  "business.peopleComeFor": "What people come for",
  "business.differentiation": "What they said sets the work apart",
  "audience.bestCustomers": "People who already come to them",
  "audience.desiredCustomers": "People they want to reach",
  "goals.outcomes": "Selected marketing priorities",
  "goals.somethingElse": "Other goal, in their words",
  "goals.twelveMonthSuccess": "What a good year looks like, in their words",
  "personality.attract": "Personality they want to be felt as",
  "personality.avoid": "Personality they don't want",
  "colour.preferred": "Colour worlds they preferred",
  "colour.avoided": "Colour worlds they avoided",
  "colour.existingRelationship": "How they feel about colours they already use",
  "colour.existingHexes": "Colours they said they already use",
  "typography.preferred": "Typography directions they preferred",
  "typography.avoided": "Typography directions they avoided",
  "imagery.preferred": "Imagery directions they preferred",
  "imagery.avoided": "Imagery directions they avoided",
  "voice.preferredLanguage": "Language they like",
  "voice.avoidedLanguage": "Language they want to avoid",
};

/** A path from the evidence payload, written so a person can read it. */
export function describeEvidence(path: string, evidence: DiscoveryEvidence, clarifications: ProfileClarification[] = []): string {
  if (path.startsWith("clarification.")) {
    const item = clarifications.find((clarification) => clarification.id === path.slice("clarification.".length));
    if (!item) return "A clarification answer from this session";
    if (item.response === "manager_help") return `They left this with their media manager: “${item.question}”`;
    if (item.detail) return `They answered “${item.question}” with: ${item.detail}`;
    return `Clarification still open: “${item.question}”`;
  }

  if (path.startsWith("derived.")) {
    return describeDerived(path.slice("derived.".length));
  }

  if (evidence.clientMarkedUnknown.includes(path)) {
    return `They marked this as not sure — ${labelFor(path)}`;
  }

  const said = evidence.clientSaid[path];
  if (typeof said === "string") return `${labelFor(path)}: ${said}`;

  if (Object.prototype.hasOwnProperty.call(evidence.clientSelected, path)) {
    return `${labelFor(path)}: ${formatValue(evidence.clientSelected[path])}`;
  }
  if (Object.prototype.hasOwnProperty.call(evidence.clientRejected, path)) {
    return `Explicitly set aside — ${labelFor(path)}: ${formatValue(evidence.clientRejected[path])}`;
  }
  return labelFor(path);
}

function describeDerived(rest: string): string {
  const splitAt = rest.indexOf(".");
  const source = splitAt === -1 ? rest : rest.slice(0, splitAt);
  const trait = splitAt === -1 ? "" : rest.slice(splitAt + 1).replaceAll("_", " ");
  if (source === "visual_comparisons") return `Visual comparisons lean toward ${trait}`;
  if (source === "voice_comparisons") return `Voice comparisons lean toward ${trait}`;
  if (source === "personality_spectrum") return `Spectrum leans ${trait.replace(":", " — ")}`;
  return `A derived pattern: ${trait || source}`;
}

function labelFor(path: string): string {
  if (LABELS[path]) return LABELS[path];
  if (path.startsWith("spectrum.")) return "A spectrum placement";
  if (path.startsWith("visual.")) return "A visual comparison";
  if (path.startsWith("voice.")) return "A voice comparison";
  if (path.startsWith("inspiration.admired")) return "A reference they admire";
  if (path.startsWith("inspiration.avoid")) return "A reference they want to avoid";
  return path;
}

function formatValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.situation === "string" && typeof record.line === "string") {
    return `${record.situation} — “${record.line}”`;
  }
  if (typeof record.left === "string" && typeof record.right === "string") {
    if (record.position === "neither_really_matters") return `${record.left} ↔ ${record.right}, and neither really matters`;
    if (typeof record.value === "number") return `${record.left} ↔ ${record.right}, placed at ${record.value}`;
  }
  if (Array.isArray(record.chosen)) return `chose ${record.chosen.map((item) => formatValue(item)).join(" and ")}`;
  if (record.choice === "neither") return "neither of the directions shown";
  if (record.choice === "none") return "none of the lines shown";
  if (typeof record.name === "string") return record.name;
  return JSON.stringify(value);
}
