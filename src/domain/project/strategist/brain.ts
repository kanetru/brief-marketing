import type { ClientBrain, ClientStrategistOutput, StoredClientReading } from "../../../types/clientRead";
import type { StatementOverride } from "../../../types/project";
import { localFallbackReading } from "./fallback";

export function resolveClientBrain(
  stored: StoredClientReading | null | undefined,
  evidenceHash: string,
  overrides: StatementOverride[],
): ClientBrain {
  const live = stored && stored.source === "live_model" && stored.output?.clientRead;
  const output = live ? applyDecisions(stored.output, overrides) : localFallbackReading();
  const challenges = live ? challengesFor(stored, evidenceHash, overrides) : [];
  return {
    source: live ? "live_model" : "local_fallback",
    provider: live ? stored.provider : null,
    model: live ? stored.model : null,
    generatedAt: live ? stored.generatedAt : null,
    evidenceHash,
    stale: Boolean(live && stored.evidenceHash !== evidenceHash),
    challenges,
    output,
  };
}

function applyDecisions(output: ClientStrategistOutput, overrides: StatementOverride[]): ClientStrategistOutput {
  const decision = (fieldId: string) => overrides.find((item) => item.fieldId === fieldId && item.decisionStatus !== "superseded");
  const positioning = decision("client.positioning");
  return {
    ...output,
    positioning: positioning && positioning.decisionStatus !== "rejected" && positioning.status !== "rejected"
      ? {
          ...output.positioning,
          statement: positioning.text.trim() || output.positioning.statement,
          epistemicStatus: "hypothesis",
          decisionStatus: positioning.decisionStatus === "approved" || positioning.status === "approved" ? "approved" : "unreviewed",
        }
      : output.positioning,
    hypotheses: output.hypotheses.map((item) => {
      const override = decision(`client.hypothesis.${item.id}`);
      if (!override) return item;
      if (override.decisionStatus === "rejected" || override.status === "rejected") return { ...item, managerDecision: "rejected" as const };
      return {
        ...item,
        statement: override.text.trim() || item.statement,
        managerDecision: managerDecisionOf(override),
        epistemicStatus: "hypothesis" as const,
      };
    }),
    tensions: output.tensions.map((item) => {
      const override = decision(`client.tension.${item.id}`);
      if (!override) return item;
      if (override.decisionStatus === "rejected" || override.status === "rejected") return { ...item, managerDecision: "rejected" as const };
      return { ...item, managerDecision: managerDecisionOf(override), epistemicStatus: "hypothesis" as const };
    }),
    observations: output.observations.filter((item) => decision(`client.observation.${item.id}`)?.decisionStatus !== "rejected" && decision(`client.observation.${item.id}`)?.status !== "rejected"),
  };
}

function managerDecisionOf(override: StatementOverride): "approved" | "edited" | "investigate" {
  if (override.status === "edited" && override.text.includes("\n\nInvestigate.")) return "investigate";
  if (override.status === "edited") return "edited";
  return "approved";
}

function challengesFor(stored: StoredClientReading, evidenceHash: string, overrides: StatementOverride[]): string[] {
  const lines = [...stored.challenges];
  if (stored.evidenceHash !== evidenceHash) {
    lines.push("New evidence has arrived since this reading. Approved lines were kept.");
  }
  const approved = overrides.find((item) => item.fieldId === "client.positioning" && (item.status === "approved" || item.decisionStatus === "approved"));
  if (approved && stored.output.positioning.statement && approved.text.trim() && approved.text.trim() !== stored.output.positioning.statement.trim()) {
    lines.push("The stored reading's position differs from the line you approved. Your line is still the one in force.");
  }
  return [...new Set(lines)];
}
