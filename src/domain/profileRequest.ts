import { buildDiscoveryEvidence, type DiscoveryEvidence } from "./evidence";
import type {
  AgentObservation,
  DiscoveryProfileVersion,
  DiscoverySession,
  ProfileClarification,
  ProfileContent,
} from "../types/discovery";

export interface ProfileGenerationRequest {
  evidence: DiscoveryEvidence;
  observations: AgentObservation[];
  clarifications: ProfileClarification[];
}

export interface ProfileRefinementRequest extends ProfileGenerationRequest {
  previous: ProfileContent;
  feedbackNote: string;
}

export function activeProfileVersion(versions: DiscoveryProfileVersion[], activeVersion: number | null): DiscoveryProfileVersion | null {
  if (versions.length === 0) return null;
  if (activeVersion == null) return versions[versions.length - 1] ?? null;
  return versions.find((version) => version.version === activeVersion) ?? versions[versions.length - 1] ?? null;
}

export function profileRequestFromSession(session: DiscoverySession): ProfileGenerationRequest {
  return {
    evidence: buildDiscoveryEvidence(session),
    observations: session.agentObservations.items,
    clarifications: clarificationsFromSession(session),
  };
}

export function clarificationsFromSession(session: DiscoverySession): ProfileClarification[] {
  return session.agentQuestions.selected.map((question) => {
    if (question.response.state === "uncertain") {
      return { id: question.id, question: question.question, response: "manager_help", detail: null };
    }
    if (question.response.state === "evidence") {
      return { id: question.id, question: question.question, response: "text", detail: question.response.text };
    }
    if (question.response.state === "selected") {
      const optionId = question.response.optionId;
      const label = question.options.find((option) => option.id === optionId)?.label ?? optionId;
      return { id: question.id, question: question.question, response: "selected", detail: label };
    }
    return { id: question.id, question: question.question, response: "unanswered", detail: null };
  });
}

export function hashEvidence(evidence: DiscoveryEvidence): string {
  const text = JSON.stringify(evidence);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
