const stringArray = (maxItems: number) => ({ type: "array", items: { type: "string" }, maxItems });

const pairing = {
  type: "object",
  additionalProperties: false,
  required: ["headingId", "bodyId", "reason"],
  properties: {
    headingId: { type: "string" },
    bodyId: { type: "string" },
    reason: { type: "string" },
  },
};

const colour = {
  type: "object",
  additionalProperties: false,
  required: ["name", "hex", "possibleRole"],
  properties: {
    name: { type: "string" },
    hex: { type: "string" },
    possibleRole: { type: "string" },
  },
};

const territory = {
  type: "object",
  additionalProperties: false,
  required: [
    "archetypeId",
    "posture",
    "name",
    "idea",
    "whyThisBusiness",
    "borrowedWorld",
    "distinctive",
    "feel",
    "pairings",
    "colour",
    "imageNotes",
    "layout",
    "graphicLanguage",
    "voice",
    "mustNotBecome",
    "risk",
    "references",
  ],
  properties: {
    archetypeId: { type: "string" },
    posture: { type: "string", enum: ["editorial", "raw", "precise", "expressive", "classic", "warm"] },
    name: { type: "string" },
    idea: { type: "string" },
    whyThisBusiness: { type: "string" },
    borrowedWorld: { type: "string" },
    distinctive: { type: "string" },
    feel: stringArray(5),
    pairings: { type: "array", minItems: 1, maxItems: 3, items: pairing },
    colour: {
      type: "object",
      additionalProperties: false,
      required: ["name", "colours", "why", "contrast", "accent"],
      properties: {
        name: { type: "string" },
        colours: { type: "array", minItems: 3, maxItems: 5, items: colour },
        why: { type: "string" },
        contrast: { type: "string" },
        accent: { type: "string" },
      },
    },
    imageNotes: stringArray(6),
    layout: stringArray(6),
    graphicLanguage: stringArray(6),
    voice: {
      type: "object",
      additionalProperties: false,
      required: ["idea", "behaviours", "wordsThatBelong", "wordsThatDont", "examples"],
      properties: {
        idea: { type: "string" },
        behaviours: stringArray(8),
        wordsThatBelong: stringArray(8),
        wordsThatDont: stringArray(8),
        examples: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
      },
    },
    mustNotBecome: { type: "string" },
    risk: { type: "string" },
    references: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["world", "take"],
        properties: { world: { type: "string" }, take: { type: "string" } },
      },
    },
  },
};

export const STRATEGIST_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hypothesis", "territories", "tomorrow"],
  properties: {
    hypothesis: {
      type: "object",
      additionalProperties: false,
      required: [
        "centralIdea",
        "strategicOpportunity",
        "desiredFeeling",
        "culturalTerritory",
        "visualOpportunity",
        "verbalOpportunity",
        "tensionsToUse",
        "conventionsToAvoid",
        "evidence",
      ],
      properties: {
        centralIdea: { type: "string" },
        strategicOpportunity: { type: "string" },
        desiredFeeling: { type: "string" },
        culturalTerritory: { type: "string" },
        visualOpportunity: { type: "string" },
        verbalOpportunity: { type: "string" },
        tensionsToUse: stringArray(4),
        conventionsToAvoid: stringArray(4),
        evidence: stringArray(6),
      },
    },
    territories: { type: "array", minItems: 2, maxItems: 2, items: territory },
    tomorrow: {
      type: "object",
      additionalProperties: false,
      required: ["type", "colour", "photography", "design", "voice", "avoid", "questions"],
      properties: {
        type: { type: "string" },
        colour: { type: "string" },
        photography: stringArray(5),
        design: stringArray(5),
        voice: stringArray(5),
        avoid: stringArray(4),
        questions: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
      },
    },
  },
} as const;
