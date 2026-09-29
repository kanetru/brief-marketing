import type { DiscoveryEvidence } from "./evidence";
import { evidencePaths } from "./evidence";
import { buildFallbackProfile, deterministicOpenItems } from "./fallbackProfile";
import { buildHardAvoids } from "./hardAvoids";
import { validateDiscoveryLanguage, type LanguageValidation } from "./languageContract";
import { hashEvidence } from "./profileRequest";
import { parseProfileResponse, type NarrativeKey, type ParsedProfile } from "./profileSchema";
import { citesMeaningfulTension, isPreferenceExplanation } from "./qualityGate";
import type {
  AgentObservation,
  DiscoveryProfileVersion,
  NarrativeSection,
  ProfileClarification,
  ProfileContent,
  ProfileFeedback,
  ProfileSource,
  ProfileStatement,
  RejectedProfileStatement,
} from "../types/discovery";
import type { AnalysisFailureCode } from "../types/discovery";

const NARRATIVE_KEYS: readonly NarrativeKey[] = [
  "businessSummary",
  "audienceSummary",
  "marketingGoals",
  "personalitySummary",
  "visualPreferences",
  "colourPreferences",
  "typographyPreferences",
  "imageryPreferences",
  "voicePreferences",
  "inspirationSummary",
];

export interface CompileProfileMeta {
  generatedAt: string;
  version: number;
  source: ProfileSource;
  promptVersion: string | null;
  provider: string | null;
  modelName: string | null;
  feedback: ProfileFeedback | null;
  failureCode: AnalysisFailureCode | null;
}

export interface CompileProfileInput {
  evidence: DiscoveryEvidence;
  observations: AgentObservation[];
  clarifications: ProfileClarification[];
  model: unknown | null;
  /** When a revision cannot be generated, keep this reading instead of starting over. */
  previousContent?: ProfileContent | null;
  meta: CompileProfileMeta;
}

/**
 * Turn a model payload, or the absence of one, into a profile that is safe to show.
 * Invalid statements are dropped. Hard avoids and explicit uncertainty are added from the session.
 */
export function compileProfile(input: CompileProfileInput): DiscoveryProfileVersion {
  const fallback = buildFallbackProfile(input.evidence, input.observations, input.clarifications);
  const known = knownPaths(input.evidence, input.clarifications);
  const rejected: RejectedProfileStatement[] = [];
  const parsed = input.model == null ? null : parseProfileResponse(input.model);

  let content: ProfileContent;
  let usedFallback = parsed == null;
  let source = input.meta.source;

  if (!parsed) {
    content = input.previousContent ? { ...input.previousContent, hardAvoids: buildHardAvoids(input.evidence) } : fallback;
    source = "fallback";
    if (input.previousContent) {
      rejected.push({
        statement: "",
        code: "revision_unavailable",
        reason: "the revision could not be generated, so the earlier reading was kept and the correction was stored",
      });
    } else if (input.model != null) {
      rejected.push({ statement: "", code: "invalid_response", reason: "the model payload did not match the profile schema" });
    }
  } else {
    content = acceptModel(parsed, fallback, known, rejected);
    content.hardAvoids = buildHardAvoids(input.evidence);
  }

  mergeOpenItems(content, input.evidence, input.clarifications, known, rejected);
  content.discussionPoints = content.discussionPoints.slice(0, 5);

  return {
    version: input.meta.version,
    generatedAt: input.meta.generatedAt,
    evidenceHash: hashEvidence(input.evidence),
    source,
    promptVersion: source === "fallback" ? null : input.meta.promptVersion,
    provider: source === "fallback" ? null : input.meta.provider,
    model: source === "fallback" ? null : input.meta.modelName,
    content,
    feedback: input.meta.feedback,
    rawModelResponse: input.model,
    rejectedStatements: rejected,
    usedFallback,
  };
}

function acceptModel(
  parsed: ParsedProfile,
  fallback: ProfileContent,
  known: Set<string>,
  rejected: RejectedProfileStatement[],
): ProfileContent {
  const content = {} as ProfileContent;
  for (const key of NARRATIVE_KEYS) {
    content[key] = acceptNarrative(parsed[key], fallback[key], known, rejected);
  }
  content.strongSignals = acceptStatements(parsed.strongSignals, known, rejected, "strong");
  content.mixedSignals = acceptStatements(parsed.mixedSignals, known, rejected, "mixed").filter((item) => {
    if (citesMeaningfulTension(item.evidenceReferences)) return true;
    rejected.push({
      statement: item.statement,
      code: "weak_tension",
      reason: "a mixed signal needs two divergent evidence groups",
    });
    return false;
  });
  content.unresolvedQuestions = acceptStatements(parsed.unresolvedQuestions, known, rejected, "open");
  content.discussionPoints = [];
  for (const point of parsed.discussionPoints) {
    const language = profileLanguage(point.prompt);
    if (language.outcome === "rejected") {
      rejected.push({ statement: point.prompt, code: language.code ?? "language", reason: language.reason });
      continue;
    }
    if (isPreferenceExplanation(point.prompt)) {
      rejected.push({ statement: point.prompt, code: "preference_explanation", reason: "asks why an aesthetic preference was chosen" });
      continue;
    }
    const refs = point.evidenceReferences.filter((path) => known.has(path));
    if (refs.length === 0) {
      rejected.push({ statement: point.prompt, code: "ungrounded", reason: "no evidence path in the payload" });
      continue;
    }
    content.discussionPoints.push({ ...point, evidenceReferences: refs });
  }
  content.hardAvoids = [];
  return content;
}

function acceptNarrative(
  model: NarrativeSection,
  fallback: NarrativeSection,
  known: Set<string>,
  rejected: RejectedProfileStatement[],
): NarrativeSection {
  const statements = acceptStatements(model.statements, known, rejected, "section");
  const summaryLanguage = model.summary ? profileLanguage(model.summary) : null;
  if (!model.summary || (summaryLanguage && summaryLanguage.outcome === "rejected")) {
    if (model.summary && summaryLanguage && summaryLanguage.outcome === "rejected") {
      rejected.push({ statement: model.summary, code: summaryLanguage.code ?? "language", reason: summaryLanguage.reason });
    }
    if (fallback.summary) return { summary: fallback.summary, statements: statements.length > 0 ? statements : fallback.statements };
    return { summary: "", statements };
  }
  return { summary: model.summary, statements };
}

function acceptStatements(
  items: ProfileStatement[],
  known: Set<string>,
  rejected: RejectedProfileStatement[],
  bucket: string,
): ProfileStatement[] {
  const kept: ProfileStatement[] = [];
  for (const item of items) {
    const language = profileLanguage(item.statement);
    if (language.outcome === "rejected") {
      rejected.push({ statement: item.statement, code: language.code ?? "language", reason: language.reason });
      continue;
    }
    const refs = item.evidenceReferences.filter((path) => known.has(path));
    if (refs.length === 0) {
      rejected.push({ statement: item.statement, code: "ungrounded", reason: "no evidence path in the payload" });
      continue;
    }
    kept.push({ ...item, id: item.id || `${bucket}-${kept.length + 1}`, evidenceReferences: refs });
  }
  return kept;
}

function mergeOpenItems(
  content: ProfileContent,
  evidence: DiscoveryEvidence,
  clarifications: ProfileClarification[],
  known: Set<string>,
  rejected: RejectedProfileStatement[],
) {
  for (const item of deterministicOpenItems(evidence, clarifications)) {
    const language = profileLanguage(item.statement);
    if (language.outcome === "rejected") {
      rejected.push({ statement: item.statement, code: language.code ?? "language", reason: language.reason });
      continue;
    }
    const refs = item.evidenceReferences.filter((path) => known.has(path));
    if (refs.length === 0) continue;
    const already = content.unresolvedQuestions.some((existing) => existing.evidenceReferences.some((path) => refs.includes(path)));
    if (already) continue;
    content.unresolvedQuestions.push({ ...item, evidenceReferences: refs });
  }
}

function knownPaths(evidence: DiscoveryEvidence, clarifications: ProfileClarification[]): Set<string> {
  const paths = evidencePaths(evidence);
  for (const item of clarifications) paths.add(`clarification.${item.id}`);
  return paths;
}

function profileLanguage(text: string): LanguageValidation {
  const base = validateDiscoveryLanguage(text);
  if (base.outcome === "rejected") return base;
  if (/\bshould use\b/i.test(text) || /\bthe brand should\b/i.test(text) || /\b(sound|be) more promotional\b/i.test(text)) {
    return { outcome: "rejected", code: "creative_prescription", reason: "prescribes a creative or verbal treatment" };
  }
  if (/\b(the|this) brand is\b/i.test(text)) {
    return { outcome: "rejected", code: "brand_truth_assertion", reason: "presents an inference as a fact about the brand" };
  }
  return base;
}
