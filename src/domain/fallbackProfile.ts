import type { DiscoveryEvidence } from "./evidence";
import { citesMeaningfulTension } from "./qualityGate";
import { buildHardAvoids } from "./hardAvoids";
import { validateDiscoveryLanguage } from "./languageContract";
import type {
  AgentObservation,
  NarrativeSection,
  ProfileClarification,
  ProfileContent,
  ProfileStatement,
} from "../types/discovery";

const EMPTY: NarrativeSection = { summary: "", statements: [] };

/**
 * A plain reading of what was actually recorded.
 * Used when the model is unavailable, and as the wording we fall back to per section.
 */
export function buildFallbackProfile(
  evidence: DiscoveryEvidence,
  observations: AgentObservation[],
  clarifications: ProfileClarification[],
): ProfileContent {
  const content: ProfileContent = {
    businessSummary: businessSection(evidence),
    audienceSummary: audienceSection(evidence),
    marketingGoals: goalsSection(evidence),
    personalitySummary: personalitySection(evidence),
    visualPreferences: visualSection(evidence),
    colourPreferences: namedSection(evidence, "colour.preferred", "They preferred these colour worlds"),
    typographyPreferences: namedSection(evidence, "typography.preferred", "They preferred these typography directions"),
    imageryPreferences: namedSection(evidence, "imagery.preferred", "They preferred these imagery directions"),
    voicePreferences: voiceSection(evidence),
    inspirationSummary: inspirationSection(evidence),
    strongSignals: [],
    mixedSignals: [],
    unresolvedQuestions: [],
    discussionPoints: [],
    hardAvoids: buildHardAvoids(evidence),
  };

  for (const observation of observations) {
    if (validateDiscoveryLanguage(observation.statement).outcome === "rejected") continue;
    if (!observation.evidenceReferences.some((path) => pathIsKnown(path, evidence, clarifications))) continue;
    if (observation.observationType === "tension") {
      if (!citesMeaningfulTension(observation.evidenceReferences)) continue;
      if (observation.importance === "low") continue;
      content.mixedSignals.push(statementFrom(observation, "tension"));
      if (observation.importance === "high") {
        content.discussionPoints.push({
          id: `discuss-${observation.id}`,
          prompt: discussionFor(observation),
          evidenceReferences: observation.evidenceReferences,
        });
      }
      continue;
    }
    if (observation.observationType === "consistent_signal" && observation.importance !== "low") {
      content.strongSignals.push(
        statementFrom(observation, observation.confidence === "high" ? "strong_pattern" : "possible_pattern"),
      );
    }
  }

  const audienceGap = observations.find(
    (observation) =>
      observation.observationType === "missing_information" &&
      observation.importance === "high" &&
      observation.evidenceReferences.some((path) => path.startsWith("audience.")),
  );
  if (audienceGap && !content.discussionPoints.some((point) => /audience/i.test(point.prompt))) {
    content.discussionPoints.unshift({
      id: "discuss-audience",
      prompt: "Who should be treated as the primary audience when the marketing work begins?",
      evidenceReferences: audienceGap.evidenceReferences,
    });
  }

  if (content.discussionPoints.length > 5) content.discussionPoints = content.discussionPoints.slice(0, 5);
  return content;
}

export function deterministicOpenItems(
  evidence: DiscoveryEvidence,
  clarifications: ProfileClarification[],
): ProfileStatement[] {
  const items: ProfileStatement[] = [];
  for (const path of evidence.clientMarkedUnknown) {
    items.push(openItem(`open-${slug(path)}`, `They marked ${label(path)} as something they are not sure about.`, [path]));
  }
  for (const [path, text] of Object.entries(evidence.clientSaid)) {
    if (!/\bi'?m not sure\b/i.test(text)) continue;
    if (items.some((item) => item.evidenceReferences.includes(path))) continue;
    items.push(openItem(`open-${slug(path)}`, `They said they are not sure yet: ${text}`, [path]));
  }
  for (const item of clarifications) {
    if (item.response !== "manager_help") continue;
    const path = `clarification.${item.id}`;
    items.push(
      openItem(
        `open-${slug(item.id)}`,
        `They asked their media manager to help with this, so it stays open: ${item.question}`,
        [path],
      ),
    );
  }
  return items;
}

function businessSection(evidence: DiscoveryEvidence): NarrativeSection {
  const said = evidence.clientSaid;
  const sentences: string[] = [];
  if (said["business.name"] && said["business.description"]) {
    sentences.push(`${said["business.name"]}. ${said["business.description"]}`);
  } else if (said["business.description"]) sentences.push(said["business.description"]);
  else if (said["business.name"]) sentences.push(said["business.name"]);
  if (said["business.peopleComeFor"]) sentences.push(`People come to them for: ${said["business.peopleComeFor"]}`);
  if (said["business.differentiation"]) {
    sentences.push(`They described what sets the work apart as: ${said["business.differentiation"]}`);
  }
  return section(sentences.join(" "), "business.summary", "business.name");
}

function audienceSection(evidence: DiscoveryEvidence): NarrativeSection {
  const sentences: string[] = [];
  const current = evidence.clientSaid["audience.bestCustomers"];
  const desired = evidence.clientSaid["audience.desiredCustomers"];
  if (current) sentences.push(`They described the people who already come to them as: ${current}`);
  if (evidence.clientSelected["audience.desiredCustomers"] === "same_as_current") {
    sentences.push("They said the people they want to reach are the same as the people who already come.");
  } else if (desired) sentences.push(`They described the people they want to reach as: ${desired}`);
  if (evidence.clientMarkedUnknown.includes("audience.desiredCustomers")) {
    sentences.push("Who they want to reach is still explicitly open.");
  }
  return section(sentences.join(" "), "audience.summary", "audience.bestCustomers");
}

function goalsSection(evidence: DiscoveryEvidence): NarrativeSection {
  const sentences: string[] = [];
  const outcomes = evidence.clientSelected["goals.outcomes"];
  if (Array.isArray(outcomes) && outcomes.length > 0) {
    sentences.push(`They selected ${join(outcomes.filter((item): item is string => typeof item === "string"))}.`);
  }
  const horizon = evidence.clientSaid["goals.twelveMonthSuccess"];
  if (horizon) sentences.push(`In their own words, a good year looks like: ${horizon}`);
  const other = evidence.clientSaid["goals.somethingElse"];
  if (other) sentences.push(`They also described a goal as: ${other}`);
  return section(sentences.join(" "), "goals.summary", "goals.outcomes");
}

function personalitySection(evidence: DiscoveryEvidence): NarrativeSection {
  const sentences: string[] = [];
  const attract = stringList(evidence.clientSelected["personality.attract"]);
  const avoid = stringList(evidence.clientRejected["personality.avoid"]);
  if (attract.length > 0) sentences.push(`They want the work to feel ${join(attract)}.`);
  if (avoid.length > 0) sentences.push(`They explicitly don't want it to feel ${join(avoid)}.`);
  for (const [path, value] of Object.entries(evidence.clientSelected)) {
    if (!path.startsWith("spectrum.") || !value || typeof value !== "object") continue;
    const record = value as { left?: unknown; right?: unknown; value?: unknown; position?: unknown };
    if (record.position === "neither_really_matters" && typeof record.left === "string" && typeof record.right === "string") {
      sentences.push(`On ${record.left} ↔ ${record.right}, they said neither really matters.`);
      continue;
    }
    if (typeof record.value !== "number" || typeof record.left !== "string" || typeof record.right !== "string") continue;
    if (Math.abs(record.value - 50) < 15) continue;
    const toward = record.value < 50 ? record.left : record.right;
    sentences.push(`On ${record.left} ↔ ${record.right}, they placed the mark toward ${toward} (${record.value}).`);
  }
  return section(sentences.join(" "), "personality.summary", "personality.attract");
}

function visualSection(evidence: DiscoveryEvidence): NarrativeSection {
  const traits = evidence.derivedSignals
    .filter((signal) => signal.source === "visual_comparisons")
    .map((signal) => signal.trait.replaceAll("_", " "));
  const summary = traits.length > 0 ? `Visual selections repeatedly leaned ${join(traits)}.` : "";
  const signal = evidence.derivedSignals.find((item) => item.source === "visual_comparisons");
  const path = signal ? `derived.${signal.source}.${signal.trait}` : "visual.summary";
  return section(summary, "visual.summary", path);
}

function namedSection(evidence: DiscoveryEvidence, path: string, lead: string): NarrativeSection {
  const names = stringList(evidence.clientSelected[path]);
  return section(names.length > 0 ? `${lead}: ${join(names)}.` : "", path, path);
}

function voiceSection(evidence: DiscoveryEvidence): NarrativeSection {
  const sentences: string[] = [];
  const traits = evidence.derivedSignals
    .filter((signal) => signal.source === "voice_comparisons")
    .map((signal) => signal.trait.replaceAll("_", " "));
  if (traits.length > 0) sentences.push(`Voice comparisons leaned ${join(traits)}.`);
  for (const [path, value] of Object.entries(evidence.clientSelected)) {
    if (!path.startsWith("voice.") || !value || typeof value !== "object") continue;
    const record = value as { situation?: unknown; line?: unknown };
    if (typeof record.situation === "string" && typeof record.line === "string") {
      sentences.push(`For “${record.situation}”, they preferred: “${record.line}”`);
    }
  }
  if (evidence.clientSaid["voice.preferredLanguage"]) {
    sentences.push(`Language they like: ${evidence.clientSaid["voice.preferredLanguage"]}`);
  }
  if (evidence.clientSaid["voice.avoidedLanguage"]) {
    sentences.push(`Language they want to avoid: ${evidence.clientSaid["voice.avoidedLanguage"]}`);
  }
  return section(sentences.join(" "), "voice.summary", "voice.preferredLanguage");
}

function inspirationSection(evidence: DiscoveryEvidence): NarrativeSection {
  const admired: string[] = [];
  const avoided: string[] = [];
  for (const [path, value] of Object.entries(evidence.clientSaid)) {
    if (!path.startsWith("inspiration.admired") || !path.endsWith(".name") || typeof value !== "string") continue;
    const note = evidence.clientSaid[path.replace(/\.name$/, ".note")];
    admired.push(typeof note === "string" ? `${value} — ${note}` : value);
  }
  for (const [path, value] of Object.entries(evidence.clientRejected)) {
    if (!path.startsWith("inspiration.avoid") || !path.endsWith(".name") || typeof value !== "string") continue;
    avoided.push(value);
  }
  const sentences: string[] = [];
  if (admired.length > 0) sentences.push(`References they admire: ${join(admired)}.`);
  if (avoided.length > 0) sentences.push(`References they asked to stay away from: ${join(avoided)}.`);
  return section(sentences.join(" "), "inspiration.summary", "inspiration.admired.1.name");
}

function section(summary: string, id: string, path: string): NarrativeSection {
  if (!summary.trim()) return EMPTY;
  return {
    summary,
    statements: [
      {
        id,
        type: "direct",
        statement: summary,
        evidenceReferences: [path],
        confidence: "high",
        status: "direct",
      },
    ],
  };
}

function statementFrom(observation: AgentObservation, status: ProfileStatement["status"]): ProfileStatement {
  return {
    id: observation.id,
    type: observation.observationType,
    statement: observation.statement,
    evidenceReferences: observation.evidenceReferences,
    confidence: observation.confidence,
    status,
  };
}

function discussionFor(observation: AgentObservation): string {
  const groups = new Set(observation.evidenceReferences.map((path) => path.split(".")[0] ?? path));
  const voice = observation.evidenceReferences.some((path) => path.startsWith("voice.") || path.startsWith("derived.voice"));
  const goals = groups.has("goals");
  const personality = groups.has("personality");
  const visual = observation.evidenceReferences.some((path) => path.startsWith("visual.") || path.startsWith("derived.visual"));
  if (goals && voice) return "How should that commercial intent feel alongside the understated language they chose?";
  if (personality && visual) {
    return "How polished should the visual expression feel before it starts to compete with the approachability they described?";
  }
  if (observation.evidenceReferences.some((path) => path.startsWith("audience."))) {
    return "Who should be treated as the primary audience when the marketing work begins?";
  }
  return "Which side of this tension should the media manager pick up first?";
}

function openItem(id: string, statement: string, evidenceReferences: string[]): ProfileStatement {
  return {
    id,
    type: "explicit_uncertainty",
    statement,
    evidenceReferences,
    confidence: "high",
    status: "explicit_uncertainty",
  };
}

function pathIsKnown(path: string, evidence: DiscoveryEvidence, clarifications: ProfileClarification[]): boolean {
  if (path.startsWith("clarification.")) {
    return clarifications.some((item) => item.id === path.slice("clarification.".length));
  }
  if (path.startsWith("derived.")) {
    const rest = path.slice("derived.".length);
    const splitAt = rest.indexOf(".");
    const source = splitAt === -1 ? rest : rest.slice(0, splitAt);
    const trait = splitAt === -1 ? "" : rest.slice(splitAt + 1);
    return evidence.derivedSignals.some((signal) => signal.source === source && signal.trait === trait);
  }
  return (
    Object.prototype.hasOwnProperty.call(evidence.clientSaid, path) ||
    Object.prototype.hasOwnProperty.call(evidence.clientSelected, path) ||
    Object.prototype.hasOwnProperty.call(evidence.clientRejected, path) ||
    evidence.clientMarkedUnknown.includes(path)
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function join(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function label(path: string): string {
  if (path === "business.differentiation") return "what sets the work apart";
  if (path === "audience.desiredCustomers") return "who they want to reach";
  if (path.startsWith("goals.")) return "what success looks like";
  return "this";
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}
