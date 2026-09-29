import { buildDiscoveryEvidence, evidencePaths, type DiscoveryEvidence } from "../domain/evidence";
import { parseAgentResponse } from "../domain/agentSchema";
import { supportedObservations, traceQuestionSelection, type QuestionDecision } from "../domain/questionSelection";
import { createSession } from "../state/createSession";
import type {
  AgentObservation,
  CandidateQuestion,
  DiscoverySession,
  PersonalityTrait,
  SpectrumDimensionId,
  VisualChoice,
} from "../types/discovery";

const AT = "2026-01-15T10:00:00.000Z";

export interface DiscoveryFixture {
  id: string;
  name: string;
  /** What this case is for. Not shown to a client. */
  expectation: string;
  session: DiscoverySession;
  /** Structured model JSON, including items the filter is expected to drop. */
  modelResponse: {
    observations: AgentObservation[];
    candidateQuestions: CandidateQuestion[];
  };
}

export interface FixtureReport {
  id: string;
  name: string;
  expectation: string;
  mode: "mock" | "live";
  keyEvidence: {
    clientSaid: DiscoveryEvidence["clientSaid"];
    clientSelected: DiscoveryEvidence["clientSelected"];
    clientRejected: DiscoveryEvidence["clientRejected"];
    clientMarkedUnknown: string[];
  };
  derivedSignals: DiscoveryEvidence["derivedSignals"];
  rawObservations: AgentObservation[];
  filteredObservations: AgentObservation[];
  candidateQuestions: CandidateQuestion[];
  selectedQuestions: CandidateQuestion[];
  decisions: QuestionDecision[];
  /** Deterministic text scan. The filter does not use this. */
  languageFlags: string[];
}

export function buildFixtureReport(fixture: DiscoveryFixture, mode: "mock" | "live" = "mock"): FixtureReport {
  return reportFromModelJson(fixture, fixture.modelResponse, mode);
}

export function reportFromModelJson(
  fixture: Pick<DiscoveryFixture, "id" | "name" | "expectation" | "session">,
  modelResponse: unknown,
  mode: "mock" | "live",
): FixtureReport {
  const evidence = buildDiscoveryEvidence(fixture.session);
  const parsed = parseAgentResponse(modelResponse);
  if (!parsed) {
    throw new Error(`Fixture ${fixture.id} model response failed schema validation`);
  }
  const filtered = supportedObservations(parsed.observations, evidence);
  const trace = traceQuestionSelection(parsed.candidateQuestions, filtered, evidence);
  return reportBody(fixture, evidence, parsed, filtered, trace, mode);
}

function reportBody(
  fixture: Pick<DiscoveryFixture, "id" | "name" | "expectation">,
  evidence: DiscoveryEvidence,
  parsed: { observations: AgentObservation[]; candidateQuestions: CandidateQuestion[] },
  filtered: AgentObservation[],
  trace: { selected: CandidateQuestion[]; decisions: QuestionDecision[] },
  mode: "mock" | "live",
): FixtureReport {
  return {
    id: fixture.id,
    name: fixture.name,
    expectation: fixture.expectation,
    mode,
    keyEvidence: {
      clientSaid: evidence.clientSaid,
      clientSelected: evidence.clientSelected,
      clientRejected: evidence.clientRejected,
      clientMarkedUnknown: evidence.clientMarkedUnknown,
    },
    derivedSignals: evidence.derivedSignals,
    rawObservations: parsed.observations,
    filteredObservations: filtered,
    candidateQuestions: parsed.candidateQuestions,
    selectedQuestions: trace.selected,
    decisions: trace.decisions,
    languageFlags: languageFlags(parsed.observations, parsed.candidateQuestions),
  };
}

export function formatFixtureReport(report: FixtureReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.name}`);
  lines.push(`id: ${report.id}`);
  lines.push(`mode: ${report.mode}`);
  lines.push(`expectation: ${report.expectation}`);
  lines.push("");
  lines.push("## Key evidence");
  lines.push("client said:");
  lines.push(recordBlock(report.keyEvidence.clientSaid));
  lines.push("client selected:");
  lines.push(recordBlock(report.keyEvidence.clientSelected));
  lines.push("client rejected:");
  lines.push(recordBlock(report.keyEvidence.clientRejected));
  lines.push(`client marked unknown: ${report.keyEvidence.clientMarkedUnknown.join(", ") || "(none)"}`);
  lines.push("");
  lines.push("## Derived signals");
  if (report.derivedSignals.length === 0) lines.push("(none)");
  for (const signal of report.derivedSignals) {
    lines.push(`- ${signal.source} ${signal.trait} ${signal.strength} [${signal.type}]`);
  }
  lines.push("");
  lines.push("## Raw observations");
  lines.push(observationBlock(report.rawObservations));
  lines.push("");
  lines.push("## Filtered observations");
  lines.push(observationBlock(report.filteredObservations));
  const dropped = report.rawObservations.filter((item) => !report.filteredObservations.some((kept) => kept.id === item.id));
  if (dropped.length > 0) {
    lines.push("dropped before questions:");
    for (const item of dropped) {
      lines.push(`- ${item.id}: no evidence path in the payload (${item.evidenceReferences.join(", ")})`);
    }
  }
  lines.push("");
  lines.push("## Candidate questions");
  for (const question of report.candidateQuestions) {
    lines.push(`- ${question.id} [${question.answerMode}, priority ${question.priority}] ${question.question}`);
  }
  lines.push("");
  lines.push("## Selected questions");
  if (report.selectedQuestions.length === 0) lines.push("(none)");
  for (const question of report.selectedQuestions) {
    const help = question.options.some((option) => option.id === "manager_help") ? " includes manager-help option" : "";
    lines.push(`- ${question.id} [${question.answerMode}${help}] ${question.question}`);
  }
  lines.push("");
  lines.push("## Filter decisions");
  for (const decision of report.decisions) {
    lines.push(`- ${decision.outcome} ${decision.id}: ${decision.reason}`);
  }
  lines.push("");
  lines.push("## Language flags");
  lines.push(report.languageFlags.length === 0 ? "(none)" : report.languageFlags.map((flag) => `- ${flag}`).join("\n"));
  return lines.join("\n");
}

export const discoveryFixtures: readonly DiscoveryFixture[] = [
  clearFixture(),
  tensionFixture(),
  audienceFixture(),
  uncertaintyFixture(),
  marketingFixture(),
];

export function fixtureById(id: string): DiscoveryFixture {
  const found = discoveryFixtures.find((fixture) => fixture.id === id);
  if (!found) throw new Error(`Unknown fixture: ${id}`);
  return found;
}

function clearFixture(): DiscoveryFixture {
  const session = base("fixture-clear");
  say(session, {
    name: "June Table",
    description: "A small neighbourhood restaurant. One sitting, a short seasonal menu, and a room that seats twenty-eight.",
    peopleComeFor: "A weeknight supper close to home.",
    differentiation: "The room is small and the menu is short. We are not trying to be for everyone.",
  });
  session.audience.bestCustomers = said("People who live within a short walk and book a weeknight table.");
  session.audience.desiredCustomers = { state: "same_as_current", capturedAt: AT };
  goals(session, ["stay_visible", "build_trust"], "A full book of regulars who already know the room.");
  traits(session, "attract", ["warm", "natural", "human", "calm", "dependable"]);
  traits(session, "avoid", ["playful", "bold", "premium"]);
  spectrum(session, { playful_serious: 42, human_corporate: 18, understated_bold: 30, raw_polished: 46, familiar_exclusive: 28, traditional_progressive: 55 });
  visual(session, { "pair-01": "a", "pair-02": "neither", "pair-03": "neither", "pair-04": "b", "pair-05": "b" });
  session.colourPreferences.preferredPaletteIds = ["warm-earth", "quiet-neutral"];
  session.typographyPreferences.preferredDirectionIds = ["humanist_sans"];
  session.imageryPreferences.preferredDirectionIds = ["documentary", "people_first"];
  voice(session, { "voice-introduce": "introduce-human", "voice-standard": "standard-human", "voice-explain": "explain-human", "voice-invite": "invite-hello" });
  session.voicePreferences.preferredLanguage = said("We say it plainly.");

  const aligned = observation("clear-aligned", "consistent_signal", "high", "medium", ["personality.attract", "derived.visual_comparisons.warm"], "The words they chose and the visual selections both lean warm and human.");
  const audienceKnown = observation("clear-audience", "consistent_signal", "high", "medium", ["audience.bestCustomers", "goals.outcomes"], "The audience and the goals are already specific.");
  const look = observation("clear-look", "consistent_signal", "high", "high", ["colour.preferred"], "The colour selections are already a quiet warm pair.");
  const invented = observation("clear-invented", "tension", "medium", "high", ["brand.essence"], "There is a hidden tension in the brand essence.");

  return {
    id: "clear-consistent",
    name: "Clear / consistent client",
    expectation: "0–2 clarification questions. Do not invent a tension.",
    session,
    modelResponse: {
      observations: [aligned, audienceKnown, look, invented],
      candidateQuestions: [
        question("clear-ask-audience", "Who is this actually for?", "free_text", ["clear-audience"], 2),
        question("clear-why-colour", "Why did you pick the warm palette?", "free_text", ["clear-look"], 3),
        question("clear-invented-q", "Which side of the brand essence matters more?", "single_choice", ["clear-invented"], 1, [
          { id: "one", label: "The first side" },
          { id: "other", label: "The other side" },
        ]),
        question("clear-ask-audience-again", "Who is this actually for?", "free_text", ["clear-audience"], 1),
      ],
    },
  };
}

function tensionFixture(): DiscoveryFixture {
  const session = base("fixture-tension");
  say(session, {
    name: "North Workshop",
    description: "A six-person practice making furniture and fittings for homes. Clients usually come through someone who already owns a piece.",
    peopleComeFor: "A table or a fitted room that will be used every day.",
    differentiation: "We stay involved until it is in the room, and we would rather make fewer things.",
  });
  session.audience.bestCustomers = said("Households who want one considered piece and are happy to wait for it.");
  session.audience.desiredCustomers = { state: "same_as_current", capturedAt: AT };
  goals(session, ["build_trust", "show_our_work"], "People recommending the work without us having to explain it.");
  traits(session, "attract", ["accessible", "warm", "human"]);
  traits(session, "avoid", ["playful", "bold"]);
  spectrum(session, { human_corporate: 18, raw_polished: 82, understated_bold: 28, playful_serious: 60 });
  visual(session, { "pair-01": "both", "pair-02": "a", "pair-03": "b", "pair-04": "neither", "pair-05": "a" });
  session.colourPreferences.preferredPaletteIds = ["soft-editorial", "quiet-neutral"];
  session.colourPreferences.avoidedPaletteIds = ["bright-optimistic", "sun-washed"];
  session.typographyPreferences.preferredDirectionIds = ["editorial_serif", "classic_serif"];
  session.imageryPreferences.preferredDirectionIds = ["editorial", "polished"];
  voice(session, { "voice-introduce": "introduce-human", "voice-standard": "standard-human", "voice-explain": "explain-human", "voice-invite": "invite-hello" });

  const tension = observation(
    "tension-visual",
    "tension",
    "high",
    "high",
    ["personality.attract", "visual.pair-03", "visual.pair-05", "derived.visual_comparisons.polished", "colour.avoided"],
    "They've said approachability matters, but the visual selections lean toward more polished and editorial references. Neither side is a conclusion.",
  );
  const brandFact = observation(
    "tension-brand-fact",
    "consistent_signal",
    "high",
    "medium",
    ["derived.visual_comparisons.polished", "typography.preferred"],
    "Your brand is premium.",
  );
  const missingPath = observation("tension-missing-path", "tension", "high", "high", ["visual.secret_board"], "A board they were not shown creates a tension.");

  return {
    id: "verbal-visual-tension",
    name: "Verbal / visual tension",
    expectation: "Treat the polish versus approachability lean as a possible tension, ask which matters more, and do not call the brand premium.",
    session,
    modelResponse: {
      observations: [tension, brandFact, missingPath],
      candidateQuestions: [
        question(
          "tension-priority",
          "You've said approachability matters, but you've consistently leaned toward more polished visual references. When those compete, which matters more?",
          "single_choice",
          ["tension-visual"],
          1,
          [
            { id: "approachable", label: "Approachable first" },
            { id: "refined", label: "More refined first" },
            { id: "between", label: "Somewhere between them" },
          ],
        ),
        question("tension-why", "Why did you pick the editorial references?", "free_text", ["tension-brand-fact"], 2),
        question("tension-secret", "What should we do with the secret board?", "free_text", ["tension-missing-path"], 1),
      ],
    },
  };
}

function audienceFixture(): DiscoveryFixture {
  const session = base("fixture-audience");
  say(session, {
    name: "Harbour & Co",
    description:
      "An eight-person architecture studio in Margate. They design house extensions and small civic rooms, usually in timber and brick, and they stay with a project from the first sketch through to site.",
    peopleComeFor: "An extension or a small public room, drawn and then built with them.",
    differentiation: "They stay with the project from the first sketch to the site, rather than handing it on.",
  });
  session.audience.bestCustomers = said("Everyone, really.");
  session.audience.desiredCustomers = said("Anyone who might need a building.");
  goals(session, ["generate_enquiries"], "More enquiries from people who are ready to start a project.");
  traits(session, "attract", ["knowledgeable", "practical", "calm"]);
  traits(session, "avoid", ["playful"]);
  visual(session, { "pair-02": "b", "pair-03": "b" });
  session.colourPreferences.preferredPaletteIds = ["quiet-neutral"];

  const audienceGap = observation(
    "audience-gap",
    "missing_information",
    "high",
    "high",
    ["audience.bestCustomers", "audience.desiredCustomers", "goals.outcomes"],
    "The business is specific, the goal is enquiries, and the audience answers stay at everyone.",
  );
  const minorVisual = observation(
    "audience-visual",
    "tension",
    "low",
    "low",
    ["visual.pair-02", "visual.pair-03"],
    "One visual choice leans playful and another leans polished. It is a small aesthetic split.",
  );
  const knownLook = observation("audience-look", "consistent_signal", "high", "low", ["colour.preferred"], "The colour choice is already a quiet neutral.");

  return {
    id: "unclear-audience",
    name: "Unclear audience",
    expectation: "Ask about audience before a minor visual split. Do not spend the question on the aesthetic.",
    session,
    modelResponse: {
      observations: [audienceGap, minorVisual, knownLook],
      candidateQuestions: [
        question(
          "audience-who",
          "Enquiries are the goal, and the audience you've described is everyone. Who is a good enquiry actually from?",
          "free_text",
          ["audience-gap"],
          1,
        ),
        question(
          "audience-visual-q",
          "When the playful reference and the polished reference compete, which is closer?",
          "single_choice",
          ["audience-visual"],
          3,
          [
            { id: "playful", label: "The more playful one" },
            { id: "polished", label: "The more polished one" },
          ],
        ),
        question("audience-why-colour", "Why did you pick the quiet neutral?", "free_text", ["audience-look"], 2),
      ],
    },
  };
}

function uncertaintyFixture(): DiscoveryFixture {
  const session = base("fixture-uncertainty");
  say(session, {
    name: "Kiln House",
    description: "A ceramics studio selling tableware to shops and to people who visit the workshop.",
    peopleComeFor: "Pieces they can use every day, and occasionally a commission.",
    differentiation: "",
  });
  session.business.differentiation = { state: "uncertain", reason: "not_sure", capturedAt: AT };
  session.audience.bestCustomers = said("The two shops that already reorder, and visitors on studio days.");
  session.audience.desiredCustomers = { state: "uncertain", reason: "not_sure", capturedAt: AT };
  goals(session, ["build_awareness", "increase_sales"], "I'm not sure. I don't know how polished we should feel yet.");
  traits(session, "attract", ["natural", "calm"]);
  traits(session, "avoid", ["bold"]);
  spectrum(session, { human_corporate: 25, playful_serious: 40 });
  session.colourPreferences.preferredPaletteIds = ["warm-earth"];

  const open = observation(
    "uncertainty-open",
    "explicit_uncertainty",
    "high",
    "high",
    ["business.differentiation", "audience.desiredCustomers", "goals.twelveMonthSuccess"],
    "They've left differentiation, the desired audience, and how polished things should feel explicitly open.",
  );
  const usefulGap = observation(
    "uncertainty-follow",
    "possible_follow_up",
    "low",
    "low",
    ["colour.preferred"],
    "The earth palette could be described in more detail.",
  );
  const ghost = observation("uncertainty-ghost", "explicit_uncertainty", "high", "high", ["future.brand_platform"], "An unknown platform is unresolved.");

  return {
    id: "explicit-uncertainty",
    name: "Explicit uncertainty",
    expectation: "Keep the uncertainty. Ask only if it would help the handover, and allow the media manager to hold it.",
    session,
    modelResponse: {
      observations: [open, usefulGap, ghost],
      candidateQuestions: [
        question(
          "uncertainty-hold",
          "A few things are still open, including how polished this should feel. Is that something you want to leave with your media manager?",
          "single_choice",
          ["uncertainty-open"],
          1,
          [
            { id: "leave-it", label: "Leave it with them" },
            { id: "one-part", label: "There's one part I can answer" },
          ],
        ),
        question("uncertainty-colour", "Can you describe the earth colours more precisely?", "free_text", ["uncertainty-follow"], 4),
        question("uncertainty-platform", "Shall we define the brand platform now?", "free_text", ["uncertainty-ghost"], 1),
      ],
    },
  };
}

function marketingFixture(): DiscoveryFixture {
  const session = base("fixture-marketing");
  say(session, {
    name: "Fieldnote",
    description: "An independent financial coach for freelancers. The work is practical: tax, pricing, and a calmer month.",
    peopleComeFor: "Someone to sit with them while the numbers get less frightening.",
    differentiation: "It stays one-to-one. There is no course and no funnel.",
  });
  session.audience.bestCustomers = said("Freelancers in their first five years who are anxious about tax and pricing.");
  session.audience.desiredCustomers = { state: "same_as_current", capturedAt: AT };
  goals(session, ["generate_enquiries", "increase_sales"], "A full practice of people who arrived because a friend passed the name on.");
  traits(session, "attract", ["calm", "practical", "dependable"]);
  traits(session, "avoid", ["bold", "energetic"]);
  spectrum(session, { understated_bold: 18, human_corporate: 22 });
  voice(session, {
    "voice-introduce": "introduce-quiet",
    "voice-standard": "standard-detail",
    "voice-explain": "explain-quiet",
    "voice-invite": "invite-formal",
  });
  session.voicePreferences.avoidedLanguage = said("Hard-sell language. Countdown offers. Anything that feels like a promotion.");

  const tension = observation(
    "marketing-tension",
    "tension",
    "high",
    "high",
    ["goals.outcomes", "voice.avoidedLanguage", "voice.voice-introduce", "derived.voice_comparisons.understated"],
    "They want enquiries and sales, and the language they've chosen is understated. They've also said they don't want hard-sell phrasing.",
  );

  const extras = ["marketing-colour", "marketing-type", "marketing-imagery", "marketing-spectrum"].map((id, index) =>
    question(
      id,
      `Should we also revisit preference ${index + 1} before the handover?`,
      "free_text",
      ["marketing-tension"],
      3,
    ),
  );

  return {
    id: "conflicting-marketing",
    name: "Conflicting marketing signals",
    expectation: "Notice the commercial goal against the understated voice, ask how that intent should feel, and do not prescribe a tone.",
    session,
    modelResponse: {
      observations: [tension],
      candidateQuestions: [
        question(
          "marketing-feel",
          "You want enquiries and sales, and you've kept the language understated. How should that commercial intent feel?",
          "single_choice",
          ["marketing-tension"],
          1,
          [
            { id: "quiet", label: "Quiet and useful" },
            { id: "direct", label: "Direct, but not pushy" },
            { id: "open", label: "Happy for this to stay open" },
          ],
        ),
        question(
          "marketing-prescribe",
          "You should sound more promotional if sales are the goal. Shall we switch the tone?",
          "single_choice",
          ["marketing-tension"],
          2,
          [
            { id: "yes", label: "Yes, make it promotional" },
            { id: "no", label: "No, leave it understated" },
          ],
        ),
        ...extras,
      ],
    },
  };
}

function base(id: string): DiscoverySession {
  const session = createSession(AT);
  session.id = id;
  return session;
}

function said(raw: string) {
  return { state: "evidence" as const, evidence: { raw, capturedAt: AT } };
}

function say(
  session: DiscoverySession,
  fields: { name: string; description: string; peopleComeFor: string; differentiation: string },
) {
  session.business.name = said(fields.name);
  session.business.description = said(fields.description);
  session.business.peopleComeFor = said(fields.peopleComeFor);
  if (fields.differentiation) session.business.differentiation = said(fields.differentiation);
}

function goals(session: DiscoverySession, selected: DiscoverySession["goals"]["outcomes"]["selected"], horizon: string) {
  session.goals.outcomes = { state: "selected", selected, capturedAt: AT };
  session.goals.twelveMonthSuccess = said(horizon);
}

function traits(session: DiscoverySession, pole: "attract" | "avoid", selected: PersonalityTrait[]) {
  session.personality[pole] = { state: "selected", selected, custom: [], capturedAt: AT };
}

function spectrum(session: DiscoverySession, values: Partial<Record<SpectrumDimensionId, number>>) {
  for (const dimension of session.personalitySpectrum.dimensions) {
    const value = values[dimension.id];
    if (value === undefined) continue;
    dimension.answer = { state: "selected", value, capturedAt: AT };
  }
}

function visual(session: DiscoverySession, choices: Record<string, VisualChoice>) {
  for (const comparison of session.visualPreferences.comparisons) {
    const choice = choices[comparison.comparisonId];
    if (!choice) continue;
    comparison.choice = { state: "selected", value: choice, capturedAt: AT };
  }
}

function voice(session: DiscoverySession, choices: Record<string, string>) {
  for (const round of session.voicePreferences.comparisons) {
    const optionId = choices[round.roundId];
    if (!optionId) continue;
    round.choice = { state: "selected", optionId, capturedAt: AT };
  }
}

function observation(
  id: string,
  observationType: AgentObservation["observationType"],
  confidence: AgentObservation["confidence"],
  importance: AgentObservation["importance"],
  evidenceReferences: string[],
  statement: string,
): AgentObservation {
  return { id, category: id.split("-")[0] ?? "discovery", statement, evidenceReferences, confidence, importance, observationType };
}

function question(
  id: string,
  text: string,
  answerMode: CandidateQuestion["answerMode"],
  relatedObservationIds: string[],
  priority: number,
  options: CandidateQuestion["options"] = [],
): CandidateQuestion {
  return {
    id,
    question: text,
    reason: "It would change what the media manager needs to pick up.",
    targetEvidenceGap: relatedObservationIds[0] ?? "session",
    relatedObservationIds,
    answerMode,
    options,
    priority,
  };
}

function observationBlock(items: AgentObservation[]): string {
  if (items.length === 0) return "(none)";
  return items
    .map((item) => `- ${item.id} [${item.observationType}, ${item.confidence} confidence, ${item.importance} importance] ${item.statement} (${item.evidenceReferences.join(", ")})`)
    .join("\n");
}

function recordBlock(record: Record<string, unknown>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) return "(none)";
  return entries.map(([key, value]) => `  ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n");
}

function languageFlags(observations: AgentObservation[], questions: CandidateQuestion[]): string[] {
  const flags: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\byour brand is\b/i, "states a brand fact"],
    [/\byour brand should\b/i, "prescribes the brand"],
    [/\byou should (use|sound|feel)\b/i, "prescribes a treatment"],
  ];
  for (const item of observations) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(item.statement)) flags.push(`observation ${item.id} ${label}: ${item.statement}`);
    }
  }
  for (const item of questions) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(item.question)) flags.push(`question ${item.id} ${label}: ${item.question}`);
    }
  }
  return flags;
}

/** Used by tests to confirm a cited path really exists, apart from the deliberate misses. */
export function citedPaths(fixture: DiscoveryFixture): { known: string[]; missing: string[] } {
  const paths = evidencePaths(buildDiscoveryEvidence(fixture.session));
  const known: string[] = [];
  const missing: string[] = [];
  for (const observation of fixture.modelResponse.observations) {
    for (const path of observation.evidenceReferences) {
      if (paths.has(path)) known.push(path);
      else missing.push(`${observation.id}:${path}`);
    }
  }
  return { known, missing };
}
