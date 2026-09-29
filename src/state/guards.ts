import type { DiscoverySession, SectionId } from "../types/discovery";
import { poleCount } from "../domain/personality";
import { desiredReady, hasText } from "./textEvidence";

/** Whether Continue should accept the current beat. Does not display a count. */
export function canAdvance(session: DiscoverySession, section: SectionId, step: number): boolean {
  switch (`${section}:${step}`) {
    case "welcome:0":
      return true;
    case "business:0":
      return hasText(session.business.name);
    case "business:1":
      return hasText(session.business.description);
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
    case "personality:0":
      return poleCount(session.personality.attract) > 0;
    case "personality:1":
      return poleCount(session.personality.avoid) > 0;
    case "personality:2":
      return false;
    default:
      return false;
  }
}
