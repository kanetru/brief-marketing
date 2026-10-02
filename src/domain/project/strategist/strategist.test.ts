import { describe, expect, it } from "vitest";
import { closerBoardsFor } from "../../palettes";
import { closerStillsFor, imageryProfile } from "../../imagery";
import { colourProfile } from "../../colourProfile";
import { createSession } from "../../../state/createSession";
import { createProject } from "../../../state/projectStore";
import type { StrategyInputs } from "../../../types/strategy";
import { buildProjectIntelligence } from "../assemble";
import { resolveClientBrain } from "./brain";
import { localFallbackReading } from "./fallback";
import { buildStrategistPacket } from "./packet";
import { validateClientStrategist } from "./validate";
import type { ClientStrategistOutput } from "../../../types/clientRead";

const AT = "2026-04-01T00:00:00.000Z";

function said(raw: string) {
  return { state: "evidence" as const, evidence: { raw, capturedAt: AT } };
}

function projectFor(name: string, description: string, audience: string, horizon: string, outcomes: string[], inputs: Partial<StrategyInputs>) {
  const discovery = createSession(AT);
  discovery.business.name = said(name);
  discovery.business.description = said(description);
  discovery.business.peopleComeFor = said(description);
  discovery.audience.bestCustomers = said(audience);
  discovery.goals.twelveMonthSuccess = said(horizon);
  discovery.goals.outcomes.selected = outcomes as typeof discovery.goals.outcomes.selected;
  discovery.strategyInputs = { ...discovery.strategyInputs, ...inputs };
  return createProject({ businessName: name, discovery, now: AT });
}

function furniture() {
  return projectFor(
    "North Workshop",
    "A workshop making furniture and architectural joinery.",
    "Architects and households commissioning one careful room.",
    "Become the obvious choice for custom architectural joinery.",
    ["generate_enquiries"],
    {
      offers: [
        { id: "domestic", name: "Domestic furniture", role: "core", importance: "meaningful", priceBand: "5k_25k", buyer: "Households", context: "One room" },
        { id: "joinery", name: "Architectural joinery", role: "growth", importance: "primary", priceBand: "25k_plus", buyer: "Architects", context: "Specified into a build" },
      ],
      want: ["higher_value", "better_fit"],
      capacity: "full",
      canMake: ["photography", "process_footage"],
      constraints: ["no_face", "capacity"],
      hear: said("An architect mentions them months before anyone calls."),
      proofAvailable: said("Photographs of three joints."),
      active: ["instagram", "website"],
    },
  );
}

function restaurant() {
  return projectFor(
    "Late Service",
    "A neighbourhood restaurant. Dinner, five nights. Weekends are full. Tuesday and Wednesday are quiet.",
    "People who already live nearby.",
    "The midweek sittings fill with people who already know the room.",
    ["increase_sales"],
    {
      offers: [{ id: "dinner", name: "Dinner", role: "core", importance: "primary", priceBand: "under_500", buyer: "Neighbours", context: "A weeknight" }],
      want: ["more_repeat"],
      capacity: "room",
      canMake: ["photography"],
      active: ["instagram"],
      working: ["reach"],
      comeBack: said("Most regulars already come back on Friday."),
    },
  );
}

function practice() {
  return projectFor(
    "Field Office",
    "An architecture practice. The portfolio is strong. The thinking is barely explained.",
    "Developers and institutions with a long appointment.",
    "Be the practice called when the site is difficult.",
    ["build_trust"],
    {
      want: ["better_fit"],
      capacity: "room",
      canMake: ["articles", "case_studies"],
      constraints: ["long_cycle", "limited_photo", "tiny_team"],
      beforeContact: said("They read for weeks before they appoint anyone."),
      proofAvailable: said("Almost no written account of a decision."),
    },
  );
}

describe("client strategist", () => {
  it("hands the model the client, including the contradiction a rule would have to hardcode", () => {
    const project = furniture();
    const intelligence = buildProjectIntelligence(project, AT);
    const packet = buildStrategistPacket(project, {
      evidence: intelligence.evidence,
      candidateNote: intelligence.strategy.channels.map((item) => `${item.channel} ${item.priority}`).join("\n"),
    });
    expect(packet.text).toContain("Architectural joinery");
    expect(packet.text).toContain("Capacity: full");
    expect(packet.text).toContain("generate_enquiries");
    expect(packet.text).toContain("months before anyone calls");
    expect(packet.text).toContain("RULE CANDIDATES");
    expect(packet.text).toContain("not a brand palette");
    expect(packet.evidenceIds.length).toBeGreaterThan(3);
    expect(intelligence.clientBrain.source).toBe("local_fallback");
    expect(intelligence.clientBrain.output.observations).toEqual([]);
    expect(intelligence.clientBrain.output.clientRead).toMatch(/no model reading/i);
    expect(intelligence.agentPack.master.markdown).toMatch(/not a strategist's understanding/);
  });

  it("gives three different businesses three different packets", () => {
    const packets = [furniture(), restaurant(), practice()].map((project) => buildStrategistPacket(project).text);
    expect(new Set(packets).size).toBe(3);
    expect(packets[0]).toContain("architectural joinery");
    expect(packets[1]).toContain("Tuesday and Wednesday");
    expect(packets[1]).not.toContain("architectural joinery");
    expect(packets[2]).toContain("long_cycle");
    expect(packets[2]).not.toContain("Tuesday and Wednesday");
  });

  it("refuses to dress a local fallback up as a reading", () => {
    const reading = localFallbackReading();
    expect(reading.channels).toEqual([]);
    expect(reading.territories).toEqual([]);
    expect(reading.hypotheses).toEqual([]);
    expect(reading.clientRead).toMatch(/not a strategist/i);
  });

  it("drops generic lines, bare territories, and any attempt to call a hypothesis a fact", () => {
    const prose = "The workshop is already near capacity, and the work they want is architectural joinery that architects meet months before procurement. More enquiries would mostly bring the work they are trying not to grow. The useful job is to make that joinery legible early enough that the wrong projects step aside.";
    const accepted = validateClientStrategist({
      clientRead: prose,
      clientReadEvidenceIds: ["e1", "missing"],
      observations: [{ title: "The right work", body: prose, evidenceIds: ["e1"], confidence: "high" }],
      tensions: [{ observation: "They asked for enquiries while the workshop is full.", sideA: "More enquiries.", sideB: "No spare capacity.", whyItMatters: "Volume would crowd out the joinery.", evidenceIds: ["e1"], confidence: "high", epistemicStatus: "fact" }],
      hypotheses: [{ statement: "Knowledgeable making may be more ownable than craftsmanship.", evidenceIds: ["e1"], confidence: "medium", epistemicStatus: "fact" }],
      unknowns: [{ question: "How much current joinery already comes from architects?", whyItMatters: "It changes whether the job is awareness or conversion." }],
      positioning: "The workshop for details an architect can specify.",
      channels: [{ channel: "website", priority: "primary", role: "Make the joinery findable before procurement.", why: "Architects look before they call.", evidenceIds: ["e1"] }],
      territories: [
        { name: "Education", idea: "Teach people things.", audienceNeed: "x", purpose: "y", risk: "z", evidenceIds: ["e1"] },
        { name: "The joint, before the room", idea: "Show the decision an architect needs months before a finish is chosen.", audienceNeed: "Proof of a detail.", purpose: "Self-selection.", risk: "Becoming a process diary.", evidenceIds: ["e1"] },
      ],
      roadmap: [{ id: "reposition", horizon: "First", objective: "Make the joinery the first thing a specifier sees.", why: "The site currently buries it.", actions: ["Rewrite the first screen."], success: "Architects arrive already asking about joinery.", evidenceIds: ["e1"] }],
      assetNeeds: ["A photograph of a joint, taken in the workshop."],
    }, ["e1"]);
    expect(accepted?.clientReadEvidenceIds).toEqual(["e1"]);
    expect(accepted?.territories.map((item) => item.name)).toEqual(["The joint, before the room"]);
    expect(accepted?.hypotheses[0]?.epistemicStatus).toBe("hypothesis");
    expect(accepted?.tensions[0]?.epistemicStatus).toBe("hypothesis");
    expect(validateClientStrategist({ clientRead: "Post consistently. Engage with your audience. Create valuable content for everyone." }, ["e1"])).toBeNull();
  });

  it("keeps an approved hypothesis a hypothesis, and can mark a tension for investigation", () => {
    const output: ClientStrategistOutput = {
      ...localFallbackReading(),
      clientRead: "A long enough reading about a workshop that wants joinery, not more of the same domestic work, and is already full.",
      hypotheses: [{ id: "joinery", statement: "The job is fit, not volume.", evidenceIds: ["e1"], confidence: "high", epistemicStatus: "hypothesis", managerDecision: "unreviewed" }],
      tensions: [{ id: "capacity", observation: "Enquiries versus a full workshop.", sideA: "More enquiries.", sideB: "No capacity.", whyItMatters: "The wrong brief would win.", evidenceIds: ["e1"], confidence: "high", epistemicStatus: "hypothesis", managerDecision: "unreviewed" }],
      positioning: { statement: "Specify the joint.", evidenceIds: ["e1"], epistemicStatus: "hypothesis", decisionStatus: "unreviewed" },
    };
    const brain = resolveClientBrain({
      evidenceHash: "old",
      source: "live_model",
      provider: "openai",
      model: "gpt-4o",
      generatedAt: AT,
      output,
      challenges: [],
    }, "new", [
      { fieldId: "client.hypothesis.joinery", text: "The job is fit, not volume.", status: "approved", decisionStatus: "approved", epistemicStatus: "fact", updatedAt: AT },
      { fieldId: "client.tension.capacity", text: "Enquiries versus a full workshop.\n\nInvestigate.", status: "edited", decisionStatus: "unreviewed", updatedAt: AT },
    ]);
    expect(brain.output.hypotheses[0]?.epistemicStatus).toBe("hypothesis");
    expect(brain.output.hypotheses[0]?.managerDecision).toBe("approved");
    expect(brain.output.tensions[0]?.managerDecision).toBe("investigate");
    expect(brain.stale).toBe(true);
    expect(brain.challenges.join(" ")).toMatch(/New evidence/);
  });
});

describe("colour and imagery taste", () => {
  it("narrows the second colour round inside the first choice", () => {
    const closer = closerBoardsFor(["warm-earth", "soft-editorial"]);
    const ids = closer.map((board) => board.id);
    expect(ids).toContain("clay-cream-ink");
    expect(ids).not.toContain("warm-earth");
    expect(ids).not.toContain("butter-ink-leaf");
    const session = createSession(AT);
    session.colourPreferences.preferredPaletteIds = ["warm-earth"];
    session.colourPreferences.closerBoardIds = ["clay-cream-ink"];
    session.colourPreferences.nuanceIds = ["warmer", "softer", "accent-quiet"];
    const profile = colourProfile(session.colourPreferences);
    expect(profile.summary).toMatch(/not the brand colours/);
    expect(profile.warmth).toBe("warm");
    expect(profile.softness).toBe("soft");
    expect(profile.accentAppetite).toBe("quiet");
    expect(profile.selectedBoards).toContain("Clay, cream, ink");
  });

  it("derives imagery taste from photographic characteristics, then a closer set", () => {
    const closer = closerStillsFor(["documentary", "people_first"], []);
    expect(closer.map((item) => item.id)).toContain("intimate_documentary");
    expect(closer.map((item) => item.id)).toContain("flash_candid");
    expect(closer.map((item) => item.id)).not.toContain("quiet_architecture");
    const session = createSession(AT);
    session.imageryPreferences.preferredDirectionIds = ["documentary"];
    session.imageryPreferences.interestIds = ["people_first"];
    session.imageryPreferences.avoidedDirectionIds = ["polished"];
    session.imageryPreferences.closerStillIds = ["intimate_documentary"];
    session.imageryPreferences.closerRejectedIds = ["flash_candid"];
    const profile = imageryProfile(session.imageryPreferences);
    expect(profile.rejected).toContain("Polished");
    expect(profile.closerRejected).toContain("Flash, mid-gesture");
    expect(profile.characteristics).toContain("window");
    expect(profile.summary).toMatch(/photographs they kept/);
    expect(profile.summary).not.toMatch(/shape/);
  });
});
