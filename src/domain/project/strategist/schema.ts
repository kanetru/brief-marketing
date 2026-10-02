/** Structured output. The reading itself stays a string of prose. */
export const CLIENT_STRATEGIST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["clientRead", "clientReadEvidenceIds", "observations", "tensions", "hypotheses", "unknowns", "positioning", "channels", "territories", "roadmap", "assetNeeds"],
  properties: {
    clientRead: { type: "string" },
    clientReadEvidenceIds: { type: "array", items: { type: "string" } },
    observations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body", "evidenceIds", "confidence"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    tensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["observation", "sideA", "sideB", "whyItMatters", "evidenceIds", "confidence"],
        properties: {
          observation: { type: "string" },
          sideA: { type: "string" },
          sideB: { type: "string" },
          whyItMatters: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["statement", "evidenceIds", "confidence"],
        properties: {
          statement: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    unknowns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "whyItMatters"],
        properties: { question: { type: "string" }, whyItMatters: { type: "string" } },
      },
    },
    positioning: { type: "string" },
    channels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["channel", "priority", "role", "why", "evidenceIds"],
        properties: {
          channel: { type: "string" },
          priority: { type: "string" },
          role: { type: "string" },
          why: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    territories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "idea", "audienceNeed", "purpose", "risk", "evidenceIds"],
        properties: {
          name: { type: "string" },
          idea: { type: "string" },
          audienceNeed: { type: "string" },
          purpose: { type: "string" },
          risk: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    roadmap: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["horizon", "objective", "why", "actions", "success", "evidenceIds"],
        properties: {
          horizon: { type: "string" },
          objective: { type: "string" },
          why: { type: "string" },
          actions: { type: "array", items: { type: "string" } },
          success: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    assetNeeds: { type: "array", items: { type: "string" } },
  },
} as const;
