import { laterSection, stepCount } from "../domain/sections";
import { LIMITS, cleanCustomTrait, matchTrait } from "../domain/options";
import { customTraitBlock, presetBlock } from "../domain/personality";
import type {
  BusinessTextField,
  DiscoverySession,
  MarketingOutcome,
  PersonalityPole,
  PersonalityPoleId,
  PersonalityTrait,
  SectionId,
} from "../types/discovery";
import { createSession } from "./createSession";
import { applyText, unanswered } from "./textEvidence";

export type Action =
  | { type: "reset" }
  | { type: "activate"; section: SectionId }
  | { type: "enter"; section: SectionId; step: number }
  | { type: "business-text"; field: BusinessTextField; value: string }
  | { type: "differentiation-uncertain" }
  | { type: "audience-current"; value: string }
  | { type: "audience-desired-text"; value: string }
  | { type: "audience-desired-same" }
  | { type: "audience-desired-uncertain" }
  | { type: "toggle-outcome"; outcome: MarketingOutcome }
  | { type: "goals-something-else"; value: string }
  | { type: "goals-horizon"; value: string }
  | { type: "toggle-trait"; pole: PersonalityPoleId; trait: PersonalityTrait }
  | { type: "add-custom-trait"; pole: PersonalityPoleId; value: string }
  | { type: "remove-custom-trait"; pole: PersonalityPoleId; value: string };

function finishPole(
  selected: PersonalityTrait[],
  custom: string[],
  timestamp: string,
): PersonalityPole {
  const has = selected.length + custom.length > 0;
  return {
    state: has ? "selected" : "unanswered",
    selected,
    custom,
    capturedAt: has ? timestamp : null,
  };
}

function otherPole(pole: PersonalityPoleId): PersonalityPoleId {
  return pole === "attract" ? "avoid" : "attract";
}

export function sessionReducer(state: DiscoverySession, action: Action): DiscoverySession {
  switch (action.type) {
    case "reset":
      return createSession();
    case "activate": {
      if (state.progress.section === action.section) return state;
      return {
        ...state,
        updatedAt: new Date().toISOString(),
        progress: {
          ...state.progress,
          section: action.section,
          furthest: laterSection(state.progress.furthest, action.section),
        },
      };
    }
    case "enter": {
      const timestamp = new Date().toISOString();
      const step = Math.max(0, Math.min(action.step, stepCount(action.section) - 1));
      return {
        ...state,
        updatedAt: timestamp,
        progress: {
          section: action.section,
          steps: { ...state.progress.steps, [action.section]: step },
          furthest: laterSection(state.progress.furthest, action.section),
        },
      };
    }
    case "business-text": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        business: {
          ...state.business,
          [action.field]: applyText(state.business[action.field], action.value, timestamp),
        },
      };
    }
    case "differentiation-uncertain": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        business: {
          ...state.business,
          differentiation: { state: "uncertain", reason: "not_sure", capturedAt: timestamp },
        },
      };
    }
    case "audience-current": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        audience: {
          ...state.audience,
          bestCustomers: applyText(state.audience.bestCustomers, action.value, timestamp),
        },
      };
    }
    case "audience-desired-text": {
      const timestamp = new Date().toISOString();
      if (!action.value.trim()) {
        return {
          ...state,
          updatedAt: timestamp,
          audience: { ...state.audience, desiredCustomers: { state: "unanswered" } },
        };
      }
      const previous = state.audience.desiredCustomers;
      const capturedAt = previous.state === "evidence" ? previous.evidence.capturedAt : timestamp;
      return {
        ...state,
        updatedAt: timestamp,
        audience: {
          ...state.audience,
          desiredCustomers: { state: "evidence", evidence: { raw: action.value, capturedAt } },
        },
      };
    }
    case "audience-desired-same": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        audience: {
          ...state.audience,
          desiredCustomers: { state: "same_as_current", capturedAt: timestamp },
        },
      };
    }
    case "audience-desired-uncertain": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        audience: {
          ...state.audience,
          desiredCustomers: { state: "uncertain", reason: "not_sure", capturedAt: timestamp },
        },
      };
    }
    case "toggle-outcome": {
      const timestamp = new Date().toISOString();
      const current = state.goals.outcomes.selected;
      const has = current.includes(action.outcome);
      if (!has && current.length >= LIMITS.goals) return state;
      const selected = has ? current.filter((item) => item !== action.outcome) : [...current, action.outcome];
      const removingSomethingElse = has && action.outcome === "something_else";
      return {
        ...state,
        updatedAt: timestamp,
        goals: {
          ...state.goals,
          outcomes: {
            state: selected.length > 0 ? "selected" : "unanswered",
            selected,
            capturedAt: selected.length > 0 ? timestamp : null,
          },
          somethingElse: removingSomethingElse ? unanswered() : state.goals.somethingElse,
        },
      };
    }
    case "goals-something-else": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        goals: {
          ...state.goals,
          somethingElse: applyText(state.goals.somethingElse, action.value, timestamp),
        },
      };
    }
    case "goals-horizon": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        goals: {
          ...state.goals,
          twelveMonthSuccess: applyText(state.goals.twelveMonthSuccess, action.value, timestamp),
        },
      };
    }
    case "toggle-trait": {
      const timestamp = new Date().toISOString();
      const pole = state.personality[action.pole];
      const other = state.personality[otherPole(action.pole)];
      const has = pole.selected.includes(action.trait);
      if (!has && presetBlock(pole, other, action.trait)) return state;
      const selected = has
        ? pole.selected.filter((item) => item !== action.trait)
        : [...pole.selected, action.trait];
      return {
        ...state,
        updatedAt: timestamp,
        personality: {
          ...state.personality,
          [action.pole]: finishPole(selected, pole.custom, timestamp),
        },
      };
    }
    case "add-custom-trait": {
      const timestamp = new Date().toISOString();
      const pole = state.personality[action.pole];
      const other = state.personality[otherPole(action.pole)];
      const known = matchTrait(action.value);
      if (known) {
        if (pole.selected.includes(known) || presetBlock(pole, other, known)) return state;
        return {
          ...state,
          updatedAt: timestamp,
          personality: {
            ...state.personality,
            [action.pole]: finishPole([...pole.selected, known], pole.custom, timestamp),
          },
        };
      }
      if (customTraitBlock(pole, other, action.value)) return state;
      const cleaned = cleanCustomTrait(action.value);
      return {
        ...state,
        updatedAt: timestamp,
        personality: {
          ...state.personality,
          [action.pole]: finishPole(pole.selected, [...pole.custom, cleaned], timestamp),
        },
      };
    }
    case "remove-custom-trait": {
      const timestamp = new Date().toISOString();
      const pole = state.personality[action.pole];
      const custom = pole.custom.filter((item) => item !== action.value);
      return {
        ...state,
        updatedAt: timestamp,
        personality: {
          ...state.personality,
          [action.pole]: finishPole(pole.selected, custom, timestamp),
        },
      };
    }
    default:
      return state;
  }
}
