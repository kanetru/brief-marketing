import { describe, expect, it } from "vitest";
import { unanswered } from "../../../state/textEvidence";
import type { StrategyInputs } from "../../../types/strategy";
import { blankStrategyInputs } from "./blank";
import { deriveStrategy } from "./plan";
import { unavailablePlatformIntelligence, type PlatformIntelligenceProvider } from "./platform";
import { REFUSED_GENERIC_STRATEGY, claimsStaleDemographics, isGenericStrategy } from "./quality";
import type { StrategySource } from "./read";

function said(raw: string) {
  return { state: "evidence" as const, evidence: { raw, capturedAt: "2026-04-01T00:00:00.000Z" } };
}

function source(partial: Partial<StrategySource> & Pick<StrategySource, "businessName" | "description">, inputs?: Partial<StrategyInputs>): StrategySource {
  return {
    offer: "",
    difference: "",
    audience: "",
    horizon: "",
    outcomes: [],
    preferredLanguage: "",
    avoidedLanguage: "",
    categoryLanguage: [],
    categoryClaims: [],
    ...partial,
    inputs: { ...blankStrategyInputs(), ...inputs },
  };
}

function furniture(tight: boolean) {
  return source({
    businessName: "North Workshop",
    description: "A workshop making furniture and architectural joinery.",
    offer: "Pieces that are made, not manufactured.",
    difference: "They stay with the material instead of the showroom.",
    audience: "Architects and households commissioning one careful room.",
    horizon: "Become the obvious choice for custom architectural joinery.",
    outcomes: ["generate_enquiries"],
    preferredLanguage: "plain and specific",
    avoidedLanguage: "luxury, showroom, passion",
  }, {
    offers: [
      { id: "domestic", name: "Domestic furniture", role: "core", importance: "meaningful", priceBand: "5k_25k", buyer: "Households", context: "One room" },
      { id: "joinery", name: "Architectural joinery", role: "growth", importance: "primary", priceBand: "25k_plus", buyer: "Architects", context: "Specified into a build" },
    ],
    want: ["higher_value", "better_fit"],
    capacity: tight ? "full" : "room",
    canMake: ["photography", "process_footage"],
    constraints: tight ? ["no_face", "capacity"] : ["no_face"],
    time: "half_day",
    awareness: "comparing",
    situation: said("A build has reached the point where the joinery has to be drawn."),
    afterwards: said("The piece feels inevitable in the room."),
    hesitate: said("They worry it will look like fitted furniture from a catalogue."),
    hateAlternatives: said("Showrooms that sell a finish, not a making."),
    lean: ["expertise", "proof"],
    hear: said("An architect mentions them months before anyone calls."),
    beforeContact: said("Months of drawings, then a conversation."),
    mustBelieve: said("That the workshop can resolve a detail, not just build a picture."),
    stopsThem: said("No evidence of a comparable detail."),
    afterBuy: said("The install, then living with it."),
    comeBack: said("The architect specifies them again."),
    proofKinds: ["process", "repeat_customers"],
    proofAvailable: said("Photographs of three joints, and two architects who came back."),
    neighbours: said("A timber yard and two residential architects."),
    neighbourKinds: ["people", "places"],
    wrongCompany: said("A high-street kitchen studio."),
    whyExist: said("The alternative was furniture that only had to look finished."),
    refuse: said("They will not simplify a joint to make a deadline."),
    active: ["instagram", "website"],
    working: ["referrals"],
  });
}

function restaurant() {
  return source({
    businessName: "Late Service",
    description: "A neighbourhood restaurant. Dinner, five nights.",
    offer: "A set of dishes that change with the week, and a room people book on purpose.",
    audience: "People who already live nearby and are deciding where to eat tonight.",
    horizon: "The Thursday and Friday sittings are full of people who came back.",
    outcomes: ["increase_sales"],
    preferredLanguage: "specific about the food",
  }, {
    offers: [{ id: "dinner", name: "Dinner", role: "core", importance: "primary", priceBand: "under_500", buyer: "Neighbours", context: "A weeknight decision" }],
    want: ["more_repeat"],
    capacity: "room",
    canMake: ["photography", "short_video", "email"],
    time: "under_2h",
    awareness: "solution_aware",
    situation: said("They are hungry and choosing between three rooms they already know."),
    afterwards: said("They wanted a night that felt considered, not a deal."),
    hesitate: said("They don't know if it is somewhere you can just turn up."),
    hateAlternatives: said("Menus that read like every other seasonal kitchen."),
    lean: ["aesthetics", "personality"],
    hear: said("A friend, or a search for dinner nearby."),
    beforeContact: said("They look at what is on, then book."),
    mustBelieve: said("That tonight is worth leaving the house for."),
    stopsThem: said("No table, or no sense of what they'd eat."),
    afterBuy: said("The meal."),
    comeBack: said("A dish they couldn't get anywhere else."),
    proofKinds: ["material"],
    proofAvailable: said("The plate, that night."),
    active: ["instagram"],
    working: ["reach"],
    chore: said("Posting finished plates with nothing to say."),
    neighbours: said("The wine shop on the corner."),
    wrongCompany: said("A delivery brand."),
  });
}

function practice() {
  return source({
    businessName: "Field Office",
    description: "An architecture practice working on houses and small public buildings.",
    offer: "Architects for clients who need a decision, not a render.",
    audience: "Owners and a few developers comparing practices before they appoint.",
    horizon: "Be the practice a developer calls when the site is difficult.",
    outcomes: ["build_trust"],
    preferredLanguage: "precise",
    avoidedLanguage: "award-winning, iconic",
  }, {
    want: ["better_fit"],
    capacity: "room",
    canMake: ["articles", "case_studies"],
    constraints: ["long_cycle", "limited_photo", "tiny_team"],
    time: "half_day",
    awareness: "comparing",
    situation: said("A site has a constraint and they are interviewing practices."),
    afterwards: said("They want to trust the judgement before they see a picture."),
    hesitate: said("They have been shown beautiful work that ignored the brief."),
    hateAlternatives: said("Studios that lead with awards."),
    lean: ["expertise", "trust"],
    hear: said("A recommendation, then a search."),
    beforeContact: said("They read for weeks."),
    mustBelieve: said("That the practice will protect the constraint."),
    stopsThem: said("No written account of a hard decision."),
    proofKinds: ["methodology", "case_studies"],
    proofAvailable: unanswered(),
    neighbours: said("A structural engineer they already trust."),
    wrongCompany: said("An interiors showroom."),
    active: ["website"],
    working: ["referrals"],
  });
}

function joined(plan: ReturnType<typeof deriveStrategy>): string {
  return [
    ...plan.channels.map((item) => `${item.channel}:${item.priority}:${item.why}`),
    ...plan.territories.map((item) => item.name),
    ...plan.roadmap.map((item) => item.objective),
    plan.positioning.statement,
  ].join("\n");
}

describe("strategy derivation", () => {
  it("keeps a qualitative goal qualitative", () => {
    const plan = deriveStrategy(furniture(true));
    expect(plan.goals[0]?.outcomeType).toBe("qualitative");
    expect(plan.goals[0]?.desiredOutcome).toMatch(/architectural joinery/);
    expect(plan.goals[0]?.baseline).toBe("");
    expect(plan.goals[0]?.target).toBe("");
  });

  it("reads a quantitative goal without inventing one", () => {
    const plan = deriveStrategy(source({
      businessName: "North Workshop",
      description: "A furniture workshop.",
      horizon: "Increase qualified commercial enquiries from 5/month to 12/month.",
      audience: "Commercial clients",
    }));
    expect(plan.goals[0]?.outcomeType).toBe("quantitative");
    expect(plan.goals[0]?.baseline).toBe("5/month");
    expect(plan.goals[0]?.target).toBe("12/month");
  });

  it("lets a full bench change the channel, not just the caption", () => {
    const open = deriveStrategy(furniture(false));
    const full = deriveStrategy(furniture(true));
    expect(open.channels.find((item) => item.priority === "primary")?.channel).toBe("instagram");
    expect(full.channels.find((item) => item.priority === "primary")?.channel).toBe("website");
    expect(full.channels.find((item) => item.channel === "search")?.priority).toBe("deprioritise");
    expect(full.channels.find((item) => item.channel === "tiktok")?.priority).toBe("not_now");
    expect(full.constraint).toMatch(/capacity|volume/i);
    expect(full.roadmap[0]?.objective).toMatch(/Architectural joinery|proof/i);
    expect(full.roadmap.map((item) => item.horizon)).toEqual(["3 months", "6 months", "9 months", "12 months"]);
  });

  it("does not give three different businesses the same plan", () => {
    const workshop = deriveStrategy(furniture(true));
    const room = deriveStrategy(restaurant());
    const office = deriveStrategy(practice());
    const primary = (plan: ReturnType<typeof deriveStrategy>) => plan.channels.find((item) => item.priority === "primary")?.channel;
    expect(primary(workshop)).toBe("website");
    expect(primary(room)).toBe("search");
    expect(primary(office)).toBe("linkedin");
    expect(room.channels.find((item) => item.channel === "linkedin")?.priority).toBe("not_now");
    expect(office.channels.find((item) => item.channel === "tiktok")?.priority).toBe("not_now");
    expect(office.channels.find((item) => item.channel === "instagram")?.priority).toBe("not_now");
    expect(workshop.territories.map((item) => item.name)).toContain("The work worth taking");
    expect(room.territories.map((item) => item.name)).toContain("What's on, and why");
    expect(office.territories.map((item) => item.name)).toContain("The decision, explained");
    const names = [workshop, room, office].map((plan) => plan.territories.map((item) => item.name).join("|"));
    expect(new Set(names).size).toBe(3);
    expect(workshop.roadmap[0]?.objective).not.toBe(room.roadmap[0]?.objective);
    expect(room.roadmap[0]?.objective).not.toBe(office.roadmap[0]?.objective);
  });

  it("refuses generic lines and stale demographic claims", () => {
    for (const line of REFUSED_GENERIC_STRATEGY) expect(isGenericStrategy(line)).toBe(true);
    expect(claimsStaleDemographics("Instagram is used by 60% of 25–34 year olds")).toBe(true);
    const text = [joined(deriveStrategy(furniture(true))), joined(deriveStrategy(restaurant())), joined(deriveStrategy(practice()))].join("\n");
    expect(isGenericStrategy(text)).toBe(false);
    expect(claimsStaleDemographics(text)).toBe(false);
    expect(text).not.toMatch(/post consistently|valuable content|hashtags relevant/i);
  });

  it("leaves unknown audience facts unknown and records a proof gap", () => {
    const plan = deriveStrategy(practice());
    expect(plan.audience.awarenessState).toBe("comparing");
    expect(plan.audience.customerLanguage).not.toMatch(/\b\d{2}\b/);
    expect(JSON.stringify(plan.audience)).not.toMatch(/demographic|25-34|female|income/i);
    expect(plan.proof.gaps.some((gap) => /case studies/i.test(gap))).toBe(true);
    expect(plan.journey.find((stage) => stage.id === "trust")?.customerState).toMatch(/constraint/i);
    expect(plan.language.owned.join(" ")).toMatch(/precise/);
    expect(plan.language.avoid.join(" ")).toMatch(/award-winning/);
    expect(plan.language.search).toContain("architect for a house");
    expect(plan.collaborations.fits).toMatch(/structural engineer/);
  });

  it("does not treat an empty platform provider as a demographic source", () => {
    const provider: PlatformIntelligenceProvider = {
      id: "stale",
      lookup: () => ({ channel: "instagram", retrievedAt: "2019", source: "memory", statement: "Used by 71% of 25-34 year olds" }),
    };
    const clean = deriveStrategy(restaurant(), unavailablePlatformIntelligence);
    const tainted = deriveStrategy(restaurant(), provider);
    expect(clean.channels.some((item) => claimsStaleDemographics(item.why))).toBe(false);
    expect(tainted.channels.some((item) => claimsStaleDemographics(item.why))).toBe(false);
  });

  it("stores several offers and a commercial priority as evidence the plan can use", () => {
    const plan = deriveStrategy(furniture(true));
    expect(plan.goals[0]?.commercialImportance).toMatch(/Architectural joinery/);
    expect(plan.positioning.epistemicStatus).toBe("hypothesis");
    expect(plan.positioning.decisionStatus).toBe("unreviewed");
  });
});
