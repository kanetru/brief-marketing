import type {
  DesiredAudienceAnswer,
  TextEvidenceAnswer,
  TextEvidenceOrUncertain,
} from "../types/discovery";

export function unanswered(): TextEvidenceAnswer {
  return { state: "unanswered" };
}

export function hasText(answer: TextEvidenceOrUncertain): boolean {
  return answer.state === "evidence" && answer.evidence.raw.trim().length > 0;
}

export function textValue(answer: TextEvidenceOrUncertain): string {
  return answer.state === "evidence" ? answer.evidence.raw : "";
}

export function desiredText(answer: DesiredAudienceAnswer): string {
  return answer.state === "evidence" ? answer.evidence.raw : "";
}

export function applyText(
  previous: TextEvidenceOrUncertain,
  raw: string,
  timestamp: string,
): TextEvidenceAnswer {
  if (!raw.trim()) return { state: "unanswered" };
  const capturedAt = previous.state === "evidence" ? previous.evidence.capturedAt : timestamp;
  return { state: "evidence", evidence: { raw, capturedAt } };
}

export function desiredReady(answer: DesiredAudienceAnswer): boolean {
  switch (answer.state) {
    case "evidence":
      return answer.evidence.raw.trim().length > 0;
    case "same_as_current":
    case "uncertain":
      return true;
    case "unanswered":
      return false;
  }
}
