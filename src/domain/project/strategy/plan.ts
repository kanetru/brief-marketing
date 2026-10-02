import { textValue } from "../../../state/textEvidence";
import type {
  AudiencePsychology,
  BrandStory,
  ChannelId,
  ChannelRecommendation,
  ContentTerritory,
  JourneyStage,
  LanguageModel,
  MarketingGoal,
  RoadmapStage,
  SocialPositioning,
  StrategicPlan,
} from "../../../types/strategy";
import type { StatementOverride } from "../../../types/project";
import { CHANNEL_LABEL, deriveChannels } from "./channels";
import type { PlatformIntelligenceProvider } from "./platform";
import { unavailablePlatformIntelligence } from "./platform";
import { claimsStaleDemographics, isGenericStrategy } from "./quality";
import { canMake, capacityTight, growthOffer, spoken, tradeOf, wants, type StrategySource, type Trade } from "./read";

export function deriveStrategy(
  source: StrategySource,
  platforms: PlatformIntelligenceProvider = unavailablePlatformIntelligence,
  overrides: StatementOverride[] = [],
): StrategicPlan {
  const trade = tradeOf(source);
  const tight = capacityTight(source);
  const goals = deriveGoals(source, tight);
  const channels = deriveChannels(source, trade, platforms);
  const territories = deriveTerritories(source, trade, tight);
  const roadmap = deriveRoadmap(source, trade, tight, channels, goals[0]);
  const plan: StrategicPlan = {
    objective: goals[0]?.desiredOutcome || "The year has not been named yet.",
    constraint: constraintLine(source, tight),
    goals,
    audience: deriveAudience(source),
    positioning: derivePositioning(source, trade, tight),
    story: deriveStory(source),
    journey: deriveJourney(source, channels),
    channels,
    territories,
    language: deriveLanguage(source),
    proof: deriveProof(source),
    collaborations: {
      fits: textValue(source.inputs.neighbours),
      wrong: textValue(source.inputs.wrongCompany),
      kinds: source.inputs.neighbourKinds,
      evidenceIds: textValue(source.inputs.neighbours) ? ["strategy.neighbours"] : [],
    },
    roadmap,
    assets: unique(territories.flatMap((item) => item.assets)),
    openQuestions: openQuestions(source, tight),
    risks: risks(trade, tight, channels),
    nextPriority: roadmap[0]?.objective ?? "",
  };
  assertSpecific(plan);
  return applyOverrides(plan, overrides);
}

function deriveGoals(source: StrategySource, tight: boolean): MarketingGoal[] {
  const sentence = source.horizon.trim();
  const follow = textValue(source.inputs.goalFollowUp);
  const numbers = parseQuantity(`${sentence} ${follow}`);
  const constraints = [
    tight ? "The business cannot take substantially more volume." : "",
    source.inputs.constraints.includes("long_cycle") ? "The sale takes months, not a feed cycle." : "",
    source.inputs.constraints.includes("no_face") ? "Nobody will be on camera." : "",
    source.inputs.constraints.includes("tiny_team") ? "A very small team has to make the work." : "",
  ].filter(Boolean);
  return [{
    id: "goal.primary",
    desiredOutcome: sentence,
    outcomeType: numbers ? "quantitative" : "qualitative",
    baseline: numbers?.baseline ?? "",
    target: numbers?.target ?? "",
    targetDate: "12 months",
    audience: source.audience,
    commercialImportance: commercialLine(source),
    constraints,
    evidenceIds: sentence ? ["goals.horizon"] : [],
    confidence: sentence ? "medium" : "low",
    managerApproved: false,
  }];
}

function parseQuantity(text: string): { baseline: string; target: string } | null {
  const fromTo = text.match(/from\s+(\d[\d,]*)(?:\s*\/\s*|\s+per\s+)(month|week|year)?\s+to\s+(\d[\d,]*)/i);
  if (fromTo) {
    const unit = fromTo[2] ? `/${fromTo[2]}` : "";
    return { baseline: `${fromTo[1]}${unit}`, target: `${fromTo[3]}${unit}` };
  }
  const pair = text.match(/(\d[\d,]*)\s*(?:\/|per)\s*(month|week)\D{0,48}(\d[\d,]*)\s*(?:\/|per)\s*\2/i);
  if (pair) return { baseline: `${pair[1]}/${pair[2]}`, target: `${pair[3]}/${pair[2]}` };
  return null;
}

function commercialLine(source: StrategySource): string {
  const named = growthOffer(source);
  const want = source.inputs.want[0];
  if (want === "higher_value") return named ? `More of ${named}, not more of everything.` : "Higher-value work, not more volume for its own sake.";
  if (want === "better_fit") return "Better-fit customers, even if that means fewer enquiries.";
  if (want === "more_repeat") return "More people coming back, not a wider first-time crowd.";
  if (want === "more_volume") return "More customers, if the business can take them.";
  if (named) return `${named} is the offer that matters commercially.`;
  return source.offer;
}

function deriveAudience(source: StrategySource): AudiencePsychology {
  const inputs = source.inputs;
  return {
    situation: textValue(inputs.situation),
    desiredOutcome: textValue(inputs.afterwards),
    frustrations: textValue(inputs.hateAlternatives),
    anxieties: textValue(inputs.hesitate),
    objections: textValue(inputs.stopsThem) || textValue(inputs.hesitate),
    motivations: textValue(inputs.afterwards),
    buyingTriggers: textValue(inputs.situation),
    trustSignals: textValue(inputs.mustBelieve),
    attractionSignals: inputs.lean,
    alternatives: textValue(inputs.hateAlternatives),
    customerLanguage: [source.audience, textValue(inputs.situation), textValue(inputs.hesitate)].filter(Boolean).join(" "),
    awarenessState: inputs.awareness ?? "unknown",
    identitySignals: source.audience,
    evidenceIds: [source.audience ? "audience.current" : "", textValue(inputs.situation) ? "strategy.situation" : ""].filter(Boolean),
  };
}

function deriveTerritories(source: StrategySource, trade: Trade, tight: boolean): ContentTerritory[] {
  if (trade === "hospitality") {
    return [
      territory("territory.plate", "What's on, and why", "A specific dish or night, and the reason it exists.", "Decide where to go, and what to order, without guessing.", "Turn appetite into a booking.", ["One dish", "Why it is on", "When to come"], ["Photograph", "Short clip"], ["instagram", "search"], ["A photograph of the actual plate", "One sentence from the kitchen"], "The dish is real this week.", "Generic food photography with nothing to say about this room."),
      territory("territory.return", "A reason to come back", "What a person who has already been would miss.", "Remember why this room, not the next new place.", wants(source, "more_repeat") ? "Repeat visits are the commercial priority." : "A specific reason to return, if repeat becomes the priority.", ["What changed", "Who the night is for"], ["Email", "A note to past guests"], ["email"], ["A list of past guests", "One concrete change"], "Something a first-timer could not know.", "A discount doing the job of a point of view."),
    ];
  }
  if (trade === "practice") {
    return [
      territory("territory.decision", "The decision, explained", "How the practice chooses when the brief pulls two ways.", textValue(source.inputs.mustBelieve) || "Believe this practice can hold a real constraint.", "Help a comparing client appoint, or walk away, for a reason.", ["The constraint", "What was refused"], ["A short essay", "A project note"], ["linkedin", "website"], ["One project they can talk about", "The decision in their words"], textValue(source.inputs.proofAvailable) || "A case they are allowed to show.", "Award language and photographs with no reasoning."),
      territory("territory.constraint", "Constraints we kept", "The limit that made the work better, not the render.", "See judgement, not taste.", "Separate the practice from studios that only show the finished object.", ["What stayed", "What was cut"], ["Case note", "A drawing and a paragraph"], ["website", "linkedin"], ["A drawing they can publish", "A sentence on the constraint"], "The built result, tied to the constraint.", "Before-and-after glamour with the thinking removed."),
    ];
  }
  const focus = growthOffer(source) || "the work they want more of";
  return [
    territory(
      "territory.bench",
      tight ? "The work worth taking" : "Bench notes",
      tight ? `Why ${focus} is the job, and why other jobs are not.` : "Why this piece is made this way, in enough detail to be useful.",
      tight ? "Recognise whether their job is one this workshop should take." : "Understand why one piece is different before they enquire.",
      tight ? "Filter enquiries toward the commercial priority." : "Proof from the making itself.",
      tight ? [focus, "What we will not take"] : ["A joint", "A material", "A decision on the bench"],
      ["Short footage of the process", "A few photographs and a paragraph"],
      tight ? ["website", "instagram"] : ["instagram", "website"],
      ["Process photography", "A maker's sentence, not a slogan"],
      "The work itself, not a claim about craft.",
      "Workshop theatre with no explanation, or a grid of finished pieces.",
    ),
    territory("territory.room", "The piece in a life", "Where the work sits once it leaves the bench.", source.audience || "See the work in the kind of room it is for.", "Desire, without turning the workshop into an interior brand.", ["The room", "The use"], ["A photograph in situ"], ["instagram", "website"], ["A photograph they have permission to use"], "A real piece in a real room.", "Styling that hides the making."),
  ];
}

function territory(
  id: string,
  name: string,
  idea: string,
  audienceNeed: string,
  purpose: string,
  themes: string[],
  formats: string[],
  channels: ChannelId[],
  assets: string[],
  proof: string,
  risk: string,
): ContentTerritory {
  return { id, name, idea, audienceNeed, purpose, themes, formats, channels, assets, proof, risk, evidenceIds: ["business.description", "audience.current"] };
}

function deriveRoadmap(
  source: StrategySource,
  trade: Trade,
  tight: boolean,
  channels: ChannelRecommendation[],
  goal: MarketingGoal | undefined,
): RoadmapStage[] {
  const primary = channels.find((item) => item.priority === "primary");
  const primaryName = primary ? CHANNEL_LABEL[primary.channel] : "the place we can actually sustain";
  const cadence = source.inputs.time === "half_day" || source.inputs.time === "a_day" || source.inputs.time === "more"
    ? "a repeatable piece each week"
    : "one deliberate piece a fortnight";
  const outcome = goal?.desiredOutcome || "The 12-month result has not been said.";
  const foundation = trade === "hospitality"
    ? "Make one visit obvious: what to have, when to come, and why this room."
    : trade === "practice"
      ? "Publish one decision a comparing client needs before they call."
      : tight
        ? `Name ${growthOffer(source) || "the work you want more of"} and gather proof of that work only.`
        : "Put the making into words and pictures a stranger can understand.";
  const prove = tight
    ? "Check that enquiries are for the desired work, not that more people have seen the name."
    : trade === "hospitality"
      ? "Check that the right nights are booking, not that the photographs were liked."
      : trade === "practice"
        ? "Check that the right clients are starting conversations, not that a post was seen."
        : "Check that enquiries mention the specific work, not the category in general.";
  return [
    stage("m3", "3 months", "Foundation", "Now", foundation, "Nothing later works if the offer and the proof are still vague.", ["Write the offer in the client's words", "Collect proof that already exists", "Refuse a format they cannot make"], "A stranger can say what is being sold, and what is not."),
    stage("m6", "6 months", "Consistency", "Build", `${primaryName}: ${cadence}, only in the territory that serves the goal.`, `The time on record is ${source.inputs.time ?? "unknown"}. The system has to fit it.`, [`Run ${cadence} on ${primaryName}`, "Stop any format that needs a skill they do not have"], "The same kind of piece has shipped more than once."),
    stage("m9", "9 months", "Proof", "Prove", prove, "Reach is not the signal. The goal is.", ["Read recent enquiries or bookings against the goal", "Keep what caused the right response"], goal?.outcomeType === "quantitative" && goal.target ? `Movement from ${goal.baseline} toward ${goal.target}, in the unit they used.` : "The right people are responding. No new number has been invented."),
    stage("m12", "12 months", "Outcome", "Outcome", outcome, "This is their sentence.", ["Judge the year against that sentence"], outcome),
  ];
}

function stage(
  id: RoadmapStage["id"],
  horizon: RoadmapStage["horizon"],
  phase: RoadmapStage["phase"],
  marker: RoadmapStage["marker"],
  objective: string,
  why: string,
  actions: string[],
  success: string,
): RoadmapStage {
  return { id, horizon, phase, marker, objective, why, actions, dependencies: ["The client's own description of the year"], evidenceIds: ["goals.horizon"], success, status: "unreviewed" };
}

function derivePositioning(source: StrategySource, trade: Trade, tight: boolean): SocialPositioning {
  const name = source.businessName || "This business";
  let statement = `${name} is not yet positioned. We know what they sell, and not yet the belief that would make the work unmistakable.`;
  if (trade === "hospitality") statement = `${name} should not sound like every other seasonal, local room. The position is a specific night and a reason to book it.`;
  else if (trade === "practice") statement = `${name} should not compete as an award gallery. The position is the reasoning a client can trust before they appoint the practice.`;
  else if (tight) statement = `${name} should not try to be busier. The position is ${growthOffer(source) || "the higher-value work"} made legible, so the wrong job selects itself out.`;
  else if (/not manufactured|showroom|made/.test(spoken(source))) statement = `${name} should not try to out-luxury the luxury end of the category. The territory is knowledgeable making, without showroom theatre.`;
  return { statement, epistemicStatus: "hypothesis", decisionStatus: "unreviewed", evidenceIds: ["business.description", "goals.horizon"] };
}

function deriveStory(source: StrategySource): BrandStory {
  return {
    context: textValue(source.inputs.whatWasMissing) || source.difference,
    belief: textValue(source.inputs.refuse),
    origin: source.inputs.whyExist.state === "evidence" ? source.inputs.whyExist.evidence.raw : "",
    response: source.offer || source.description,
    difference: textValue(source.inputs.differently) || source.difference,
    proof: textValue(source.inputs.proofAvailable),
    future: textValue(source.inputs.whatGetsBetter) || source.horizon,
    evidenceIds: ["strategy.why", "strategy.proof"],
  };
}

function deriveLanguage(source: StrategySource): LanguageModel {
  const lines = (values: string[]) => values.map((item) => item.trim()).filter(Boolean);
  return {
    owned: lines([source.preferredLanguage, textValue(source.inputs.refuse), textValue(source.inputs.differently)]),
    customer: lines([source.audience, textValue(source.inputs.situation), textValue(source.inputs.hesitate)]),
    category: source.categoryLanguage,
    search: searchPhrases(source),
    cliches: source.categoryClaims.filter((claim) => /handcrafted|bespoke|passionate|authentic|seasonal and local|excellence/i.test(claim)),
    avoid: lines([source.avoidedLanguage, textValue(source.inputs.embarrassed)]),
  };
}

function searchPhrases(source: StrategySource): string[] {
  const text = `${source.offer} ${source.description}`.toLowerCase();
  const phrases: string[] = [];
  if (/joinery|furniture|cabinet/.test(text)) phrases.push("custom furniture", "architectural joinery");
  if (/architect/.test(text)) phrases.push("architect for a house");
  if (/restaurant|dinner|dining/.test(text)) phrases.push(source.businessName ? `${source.businessName} booking` : "where to eat tonight");
  return phrases;
}

function deriveProof(source: StrategySource): StrategicPlan["proof"] {
  const have = source.inputs.proofKinds.slice();
  const available = textValue(source.inputs.proofAvailable);
  const gaps: string[] = [];
  if (have.includes("results") && !available) gaps.push("Results were named, but no result is on file.");
  if (have.includes("case_studies") && !available) gaps.push("Case studies were named, and none are written down.");
  if (have.includes("process") && !canMake(source, "process_footage") && !canMake(source, "photography")) gaps.push("Process is the proof, and there is no way yet to show it.");
  if (have.length === 0 && !available) gaps.push("No proof has been named.");
  return { have: available ? [...have, available] : have, gaps, evidenceIds: available || have.length ? ["strategy.proof"] : [] };
}

function deriveJourney(source: StrategySource, channels: ChannelRecommendation[]): JourneyStage[] {
  const primary = channels.find((item) => item.priority === "primary");
  const where = primary ? CHANNEL_LABEL[primary.channel] : "";
  const unknown = "Not yet known.";
  const row = (id: string, stage: string, state: string, tension: string, proof: string, content: string, channel: string): JourneyStage => ({
    id, stage,
    customerState: state || unknown,
    tension: tension || unknown,
    proof: proof || unknown,
    content: content || unknown,
    channel: channel || unknown,
    next: state ? "Answer the tension before asking for the sale." : unknown,
    evidenceIds: state ? ["strategy.journey"] : [],
  });
  return [
    row("unaware", "Unaware", source.inputs.awareness === "unaware" ? "They do not know this is a problem yet." : "", "", "", "", ""),
    row("discovery", "Discovery", textValue(source.inputs.hear), textValue(source.inputs.situation), "", "", where),
    row("interest", "Interest", textValue(source.inputs.afterwards), textValue(source.inputs.situation), "", textValue(source.inputs.afterwards), ""),
    row("trust", "Trust", textValue(source.inputs.mustBelieve), textValue(source.inputs.hesitate), textValue(source.inputs.proofAvailable), "", ""),
    row("consideration", "Consideration", textValue(source.inputs.stopsThem) || textValue(source.inputs.hateAlternatives), textValue(source.inputs.hesitate), textValue(source.inputs.mustBelieve), "", where),
    row("purchase", "Purchase", textValue(source.inputs.mustBelieve) ? "They can say yes once that belief is in place." : "", textValue(source.inputs.stopsThem), "", "", ""),
    row("experience", "Experience", textValue(source.inputs.afterBuy), "", "", "", ""),
    row("advocacy", "Return", textValue(source.inputs.comeBack), "", "", "", wants(source, "more_repeat") ? "Email" : ""),
  ];
}

function constraintLine(source: StrategySource, tight: boolean): string {
  if (tight && wants(source, "more_volume")) return "They want more leads, and the business cannot take more volume.";
  if (tight) return "Capacity is the constraint. More attention would make the year worse.";
  if (source.inputs.constraints.includes("long_cycle")) return "The sale is slow. A weekly feed is not the journey.";
  if (source.inputs.constraints.includes("no_face")) return "No one will be on camera.";
  if (source.inputs.canMake.length === 0) return "What they can make on a regular week is still unknown.";
  return "";
}

function openQuestions(source: StrategySource, tight: boolean): string[] {
  const questions: string[] = [];
  if (!source.horizon.trim()) questions.push("They have not said what a good year would be.");
  if (source.inputs.offers.length === 0) questions.push("What someone can pay for is still a single sentence.");
  if (!source.inputs.awareness) questions.push("We do not know how aware people are when they first arrive.");
  if (source.inputs.canMake.length === 0) questions.push("What they can make each week is unknown.");
  if (!textValue(source.inputs.proofAvailable) && source.inputs.proofKinds.length === 0) questions.push("The proof they can show is unknown.");
  if (tight && wants(source, "more_volume")) questions.push("More customers and no capacity are in conflict. The manager has to decide which one the year serves.");
  return questions;
}

function risks(trade: Trade, tight: boolean, channels: ChannelRecommendation[]): string[] {
  const lines: string[] = [];
  if (tight) lines.push("A reach goal would fight the capacity they described.");
  if (trade === "making") lines.push("Finished-product posting would hide the difference they described.");
  if (trade === "hospitality") lines.push("Photographs with no booking path become a hobby.");
  if (trade === "practice") lines.push("Project photography without a decision becomes an award entry.");
  const parked = channels.filter((item) => item.priority === "not_now").map((item) => CHANNEL_LABEL[item.channel]);
  if (parked.length) lines.push(`${parked.join(", ")} ${parked.length === 1 ? "is" : "are"} not now, on purpose.`);
  return lines;
}

function assertSpecific(plan: StrategicPlan): void {
  const texts = [
    plan.positioning.statement,
    ...plan.channels.flatMap((item) => [item.why, item.role, item.success]),
    ...plan.territories.flatMap((item) => [item.name, item.idea, item.risk]),
    ...plan.roadmap.map((item) => item.objective),
  ];
  for (const text of texts) {
    if (isGenericStrategy(text) || claimsStaleDemographics(text)) {
      throw new Error(`Refused strategy line: ${text}`);
    }
  }
}

function applyOverrides(plan: StrategicPlan, overrides: StatementOverride[]): StrategicPlan {
  const positioning = taken(overrides, "strategy.positioning");
  return {
    ...plan,
    positioning: positioning
      ? { ...plan.positioning, statement: positioning.text, decisionStatus: positioning.status }
      : plan.positioning,
    roadmap: plan.roadmap.map((item) => {
      const edited = taken(overrides, `roadmap.${item.id}`);
      return edited ? { ...item, objective: edited.text, status: edited.status } : item;
    }),
    goals: plan.goals.map((goal) => {
      const edited = taken(overrides, goal.id);
      return edited ? { ...goal, desiredOutcome: edited.text, managerApproved: edited.status === "approved" } : goal;
    }),
  };
}

function taken(overrides: StatementOverride[], fieldId: string): { text: string; status: "approved" | "unreviewed" } | null {
  const found = overrides.find((item) => item.fieldId === fieldId && item.status !== "rejected" && item.decisionStatus !== "rejected");
  if (!found?.text.trim()) return null;
  const status = found.decisionStatus === "approved" || found.status === "approved" ? "approved" : "unreviewed";
  return { text: found.text.trim(), status };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
