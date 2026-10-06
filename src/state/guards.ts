import { VOICE_ROUNDS } from "../domain/voice";
import type { DiscoverySession, SectionId } from "../types/discovery";
import { desiredReady, hasText } from "./textEvidence";

/** Whether Continue should accept the current beat. Does not display a count. */
export function canAdvance(session: DiscoverySession, section: SectionId, step: number): boolean {
  switch (`${section}:${step}`) {
    case "welcome:0":
      return true;
    case "business:0":
      return hasText(session.business.description);
    case "business:1":
      return true;
    case "business:2":
      return hasText(session.business.peopleComeFor);
    case "business:3":
      return hasText(session.business.differentiation) || session.business.differentiation.state === "uncertain";
    case "audience:0":
      return hasText(session.audience.bestCustomers);
    case "audience:1":
      return desiredReady(session.audience.desiredCustomers);
    case "goals:0":
      return session.goals.outcomes.selected.length > 0;
    case "goals:1":
      return hasText(session.goals.twelveMonthSuccess);
    case "business:4":
    case "business:5":
    case "business:6":
    case "business:7":
    case "audience:2":
    case "audience:3":
    case "audience:4":
    case "goals:2":
    case "reality:0":
    case "reality:1":
    case "reality:2":
    case "reality:3":
    case "reality:4":
    case "reality:5":
    case "reality:6":
    case "reality:7":
      return true;
    case "personality:0":
    case "personality:1":
      return true;
    case "spectrum:0":
    case "spectrum:1":
    case "spectrum:2":
    case "spectrum:3":
    case "spectrum:4":
    case "spectrum:5":
    case "spectrum:6":
      return true;
    case "visual:0":
      return true;
    case "colour:0":
    case "colour:1":
    case "colour:2":
    case "colour:3":
    case "type:1":
    case "imagery:1":
      return true;
    case "colour:4":
      return session.colourPreferences.existingColourRelationship.state === "selected";
    case "colour:5":
      return session.colourPreferences.existingBrandColours.length > 0;
    case "type:0":
      return session.typographyPreferences.preferredDirectionIds.length > 0 || session.typographyPreferences.worldIds.length > 0;
    case "type:2":
      return true;
    case "imagery:0":
      return session.imageryPreferences.preferredDirectionIds.length > 0
        || session.imageryPreferences.interestIds.length > 0
        || session.imageryPreferences.avoidedDirectionIds.length > 0;
    default: {
      if (section === "visual" && step > 0) {
        const comparison = session.visualPreferences.comparisons[step - 1];
        return comparison?.choice.state === "selected";
      }
      if (section === "voice") {
        if (step === 0 || step > VOICE_ROUNDS.length) return true;
        const round = session.voicePreferences.comparisons[step - 1];
        return round?.choice.state === "selected" || round?.choice.state === "none";
      }
      if (section === "inspiration" || section === "profile" || section === "complete") return true;
      if (section === "clarify") {
        if (step === 0) {
          const status = session.agentObservations.status;
          return status === "ready" || status === "failed";
        }
        const question = session.agentQuestions.selected[step - 1];
        return !!question && question.response.state !== "unanswered";
      }
      return false;
    }
  }
}
