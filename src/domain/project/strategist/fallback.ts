import type { ClientStrategistOutput } from "../../../types/clientRead";

/** A local assembly. It restates nothing as a strategic judgement. */
export function localFallbackReading(): ClientStrategistOutput {
  return {
    clientRead: "There is no model reading yet. What is on file is what the client said, what the site published, and what the rules can list. That is not a strategist's understanding of the client.",
    clientReadEvidenceIds: [],
    observations: [],
    tensions: [],
    hypotheses: [],
    unknowns: [],
    positioning: {
      statement: "",
      evidenceIds: [],
      epistemicStatus: "hypothesis",
      decisionStatus: "unreviewed",
    },
    channels: [],
    territories: [],
    roadmap: [],
    assetNeeds: [],
  };
}
