import { compileProfile, type CompileProfileMeta } from "../domain/compileProfile";
import { buildDiscoveryEvidence } from "../domain/evidence";
import { supportedObservations } from "../domain/questionSelection";
import type { ParsedProfile } from "../domain/profileSchema";
import type { DiscoveryProfileVersion, NarrativeSection, ProfileClarification, ProfileStatement } from "../types/discovery";
import { discoveryFixtures, fixtureById, type DiscoveryFixture } from "./discoveryFixtures";

const AT = "2026-01-15T10:00:00.000Z";

export interface ProfileFixtureReport {
  id: string;
  name: string;
  version: DiscoveryProfileVersion;
  fallback: DiscoveryProfileVersion;
}

export function buildProfileReport(fixture: DiscoveryFixture): ProfileFixtureReport {
  const evidence = buildDiscoveryEvidence(fixture.session);
  const observations = supportedObservations(fixture.modelResponse.observations, evidence);
  const clarifications = clarificationsFor(fixture);
  const meta = (source: CompileProfileMeta["source"]): CompileProfileMeta => ({
    generatedAt: AT,
    version: 1,
    source,
    promptVersion: source === "fallback" ? null : "discovery-profile.v1",
    provider: source === "fallback" ? null : "mock",
    modelName: source === "fallback" ? null : "fixture",
    feedback: null,
    failureCode: null,
  });
  return {
    id: fixture.id,
    name: fixture.name,
    version: compileProfile({
      evidence,
      observations,
      clarifications,
      model: mockedProfile(fixture.id),
      meta: meta("model"),
    }),
    fallback: compileProfile({
      evidence,
      observations,
      clarifications,
      model: null,
      meta: meta("fallback"),
    }),
  };
}

export function formatProfileReport(report: ProfileFixtureReport): string {
  const content = report.version.content;
  const lines = [
    `# ${report.name}`,
    `id: ${report.id}`,
    `source: ${report.version.source}`,
    `fallback: ${report.version.usedFallback ? "yes" : "no"}`,
    "",
    sectionLine("Business", content.businessSummary),
    sectionLine("People", content.audienceSummary),
    sectionLine("Marketing", content.marketingGoals),
    sectionLine("Experience", content.personalitySummary),
    sectionLine("Visual", content.visualPreferences),
    sectionLine("Colour", content.colourPreferences),
    sectionLine("Typography", content.typographyPreferences),
    sectionLine("Imagery", content.imageryPreferences),
    sectionLine("Voice", content.voicePreferences),
    sectionLine("Inspiration", content.inspirationSummary),
    "",
    "## Strong signals",
    listStatements(content.strongSignals),
    "",
    "## Mixed signals",
    listStatements(content.mixedSignals),
    "",
    "## Still open",
    listStatements(content.unresolvedQuestions),
    "",
    "## Worth discussing",
    content.discussionPoints.length === 0
      ? "(none)"
      : content.discussionPoints.map((point) => `- ${point.prompt} (${point.evidenceReferences.join(", ")})`).join("\n"),
    "",
    "## Hard avoids",
    content.hardAvoids.length === 0
      ? "(none)"
      : content.hardAvoids.map((item) => `- ${item.label}: ${item.detail}`).join("\n"),
    "",
    "## Rejected",
    report.version.rejectedStatements.length === 0
      ? "(none)"
      : report.version.rejectedStatements.map((item) => `- [${item.code}] ${item.statement || item.reason}`).join("\n"),
  ];
  return lines.join("\n");
}

export function clarificationsFor(fixture: DiscoveryFixture): ProfileClarification[] {
  if (fixture.id !== "explicit-uncertainty") return [];
  return [
    {
      id: "uncertainty-hold",
      question: "A few things are still open, including how polished this should feel. Is that something you want to leave with your media manager?",
      response: "manager_help",
      detail: null,
    },
  ];
}

function mockedProfile(id: string): ParsedProfile {
  if (id === "clear-consistent") return clearProfile();
  if (id === "verbal-visual-tension") return tensionProfile();
  if (id === "unclear-audience") return audienceProfile();
  if (id === "explicit-uncertainty") return uncertaintyProfile();
  return marketingProfile();
}

function clearProfile(): ParsedProfile {
  return shell({
    businessSummary: narrative(
      "June Table is a small neighbourhood restaurant. People come for a weeknight supper close to home.",
      say("clear-business", "They described a small neighbourhood restaurant with one sitting and a short menu.", ["business.description"], "direct"),
    ),
    audienceSummary: narrative(
      "They described the people who already come as those who live within a short walk and book a weeknight table. They want to keep reaching those same people.",
      say("clear-audience", "The audience they described is already specific, and the desired audience matches it.", ["audience.bestCustomers"], "direct"),
    ),
    marketingGoals: narrative(
      "They selected staying visible and building trust. A good year, in their words, is a full book of regulars who already know the room.",
      say("clear-goals", "They selected staying visible and building trust.", ["goals.outcomes"], "direct"),
    ),
    strongSignals: [
      say(
        "clear-warm",
        "Warm, human directions were selected across personality and the visual comparisons.",
        ["personality.attract", "derived.visual_comparisons.warm"],
        "strong_pattern",
      ),
      say("clear-premium", "Your brand is premium.", ["colour.preferred"], "strong_pattern"),
    ],
    discussionPoints: [],
    mixedSignals: [],
    unresolvedQuestions: [],
  });
}

function tensionProfile(): ParsedProfile {
  return shell({
    personalitySummary: narrative(
      "They want the work to feel accessible, warm and human.",
      say("tension-words", "They selected accessible, warm and human.", ["personality.attract"], "direct"),
    ),
    visualPreferences: narrative(
      "Several visual selections lean toward more polished references.",
      say("tension-visual-line", "Visual selections leaned polished.", ["derived.visual_comparisons.polished"], "strong_pattern"),
    ),
    strongSignals: [say("tension-brand", "Your brand is premium.", ["typography.preferred"], "strong_pattern")],
    mixedSignals: [
      say(
        "tension-polish",
        "Approachability is explicit in the words they chose, while several visual selections lean more polished. That may be worth discussing.",
        ["personality.attract", "visual.pair-03", "derived.visual_comparisons.polished"],
        "tension",
      ),
    ],
    discussionPoints: [
      {
        id: "tension-discuss",
        prompt: "How polished should the visual expression feel before it starts to compete with the approachability they described?",
        evidenceReferences: ["personality.attract", "visual.pair-03"],
      },
    ],
  });
}

function audienceProfile(): ParsedProfile {
  return shell({
    audienceSummary: narrative(
      "The business is specific, but the audience they described is everyone, and the people they want to reach are anyone who might need a building.",
      say(
        "audience-broad",
        "The audience answers stay at everyone, while the goal is enquiries.",
        ["audience.bestCustomers", "audience.desiredCustomers", "goals.outcomes"],
        "explicit_uncertainty",
      ),
    ),
    marketingGoals: narrative(
      "They selected generating enquiries.",
      say("audience-goal", "They selected generating enquiries.", ["goals.outcomes"], "direct"),
    ),
    mixedSignals: [
      say(
        "audience-minor",
        "One playful visual reference and one polished visual reference sit next to each other.",
        ["visual.pair-02", "visual.pair-03"],
        "tension",
      ),
    ],
    discussionPoints: [
      {
        id: "audience-discuss",
        prompt: "Who is a good enquiry actually from, once lead generation begins?",
        evidenceReferences: ["audience.bestCustomers", "goals.outcomes"],
      },
    ],
  });
}

function uncertaintyProfile(): ParsedProfile {
  return shell({
    businessSummary: narrative(
      "Kiln House is a ceramics studio selling tableware to shops and to people who visit the workshop. What sets the work apart is still explicitly open.",
      say("uncertainty-business", "What sets the work apart was marked as not sure.", ["business.differentiation"], "explicit_uncertainty"),
    ),
    unresolvedQuestions: [
      say(
        "uncertainty-diff",
        "They marked what sets the work apart as something they are not sure about.",
        ["business.differentiation"],
        "explicit_uncertainty",
      ),
    ],
    discussionPoints: [],
    mixedSignals: [],
  });
}

function marketingProfile(): ParsedProfile {
  return shell({
    marketingGoals: narrative(
      "They selected generating enquiries and increasing sales.",
      say("marketing-goals", "They selected generating enquiries and increasing sales.", ["goals.outcomes"], "direct"),
    ),
    voicePreferences: narrative(
      "The voice comparisons lean understated, and they don't want hard-sell language.",
      say("marketing-voice", "They want to avoid hard-sell language.", ["voice.avoidedLanguage"], "direct"),
    ),
    mixedSignals: [
      say(
        "marketing-tension",
        "They want enquiries and sales, and the language they've chosen is understated.",
        ["goals.outcomes", "voice.avoidedLanguage", "derived.voice_comparisons.understated"],
        "tension",
      ),
    ],
    discussionPoints: [
      {
        id: "marketing-feel",
        prompt: "How should that commercial intent feel alongside the understated language they chose?",
        evidenceReferences: ["goals.outcomes", "voice.avoidedLanguage"],
      },
      {
        id: "marketing-bad",
        prompt: "You should sound more promotional if sales are the goal.",
        evidenceReferences: ["goals.outcomes"],
      },
    ],
  });
}

function shell(partial: Partial<ParsedProfile>): ParsedProfile {
  const empty = (): NarrativeSection => ({ summary: "", statements: [] });
  return {
    businessSummary: empty(),
    audienceSummary: empty(),
    marketingGoals: empty(),
    personalitySummary: empty(),
    visualPreferences: empty(),
    colourPreferences: empty(),
    typographyPreferences: empty(),
    imageryPreferences: empty(),
    voicePreferences: empty(),
    inspirationSummary: empty(),
    strongSignals: [],
    mixedSignals: [],
    unresolvedQuestions: [],
    discussionPoints: [],
    ...partial,
  };
}

function narrative(summary: string, ...statements: ProfileStatement[]): NarrativeSection {
  return { summary, statements };
}

function say(
  id: string,
  statement: string,
  evidenceReferences: string[],
  status: ProfileStatement["status"],
): ProfileStatement {
  return {
    id,
    type: status,
    statement,
    evidenceReferences,
    confidence: "high",
    status,
  };
}

function sectionLine(label: string, section: NarrativeSection): string {
  return section.summary ? `## ${label}\n${section.summary}` : `## ${label}\n(none)`;
}

function listStatements(items: ProfileStatement[]): string {
  if (items.length === 0) return "(none)";
  return items.map((item) => `- [${item.status}] ${item.statement} (${item.evidenceReferences.join(", ")})`).join("\n");
}

export function profileFixtureReports(): ProfileFixtureReport[] {
  return discoveryFixtures.map((fixture) => buildProfileReport(fixture));
}

export function profileFixture(id: string): ProfileFixtureReport {
  return buildProfileReport(fixtureById(id));
}
