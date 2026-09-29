import type { AnalysisSuccess } from "../domain/analysis";
import { LIMITS, cleanCustomTrait, matchTrait } from "../domain/options";
import { normaliseHex } from "../domain/palettes";
import { customTraitBlock, presetBlock } from "../domain/personality";
import { MANAGER_HELP_ID } from "../domain/questionSelection";
import { laterSection, stepCount } from "../domain/sections";
import { withCreativeFork } from "../domain/creativeFork";
import { clampSpectrumValue } from "../domain/spectrum";
import { syncAdaptiveComparisons } from "../domain/visualDirections";
import type {
  AnalysisFailureCode,
  BusinessTextField,
  DiscoveryProfileVersion,
  ProfileFeedback,
  ColourRelationship,
  DiscoverySession,
  TerritoryReactionResponse,
  ImageryDirectionId,
  MarketingOutcome,
  PersonalityPole,
  PersonalityPoleId,
  PersonalityTrait,
  SectionId,
  SpectrumDimensionId,
  TypographyDirectionId,
  VisualChoice,
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
  | { type: "remove-custom-trait"; pole: PersonalityPoleId; value: string }
  | { type: "set-spectrum"; dimensionId: SpectrumDimensionId; value: number }
  | { type: "neutral-spectrum"; dimensionId: SpectrumDimensionId }
  | { type: "choose-visual"; comparisonId: string; choice: VisualChoice }
  | { type: "toggle-preferred-palette"; paletteId: string }
  | { type: "toggle-avoided-palette"; paletteId: string }
  | { type: "set-colour-relationship"; value: ColourRelationship }
  | { type: "add-existing-colour"; hex: string }
  | { type: "remove-existing-colour"; hex: string }
  | { type: "toggle-preferred-type"; directionId: TypographyDirectionId }
  | { type: "toggle-avoided-type"; directionId: TypographyDirectionId }
  | { type: "toggle-preferred-imagery"; directionId: ImageryDirectionId }
  | { type: "toggle-avoided-imagery"; directionId: ImageryDirectionId }
  | { type: "choose-voice"; roundId: string; optionId: string }
  | { type: "voice-language"; field: "preferred" | "avoided"; value: string }
  | { type: "add-inspiration"; polarity: "positive" | "negative"; name: string; url: string; note: string }
  | { type: "remove-inspiration"; polarity: "positive" | "negative"; id: string }
  | { type: "begin-analysis" }
  | { type: "record-analysis"; sessionId: string; result: AnalysisSuccess; evidenceSent: unknown }
  | { type: "fail-analysis"; sessionId: string; error: AnalysisFailureCode }
  | { type: "answer-clarification"; questionId: string; text?: string; optionId?: string }
  | { type: "clarify-uncertain"; questionId: string }
  | { type: "begin-profile" }
  | { type: "record-profile"; sessionId: string; version: DiscoveryProfileVersion; failureCode: AnalysisFailureCode | null }
  | { type: "set-profile-feedback"; feedback: ProfileFeedback }
  | { type: "begin-refinement" }
  | { type: "record-refinement"; sessionId: string; version: DiscoveryProfileVersion; failureCode: AnalysisFailureCode | null }
  | { type: "set-territory-reaction"; territoryId: string; response: TerritoryReactionResponse; note: string }
  | { type: "set-territory-preference"; preference: string | null };

function withDimension(
  state: DiscoverySession,
  dimensionId: SpectrumDimensionId,
  answer: DiscoverySession["personalitySpectrum"]["dimensions"][number]["answer"],
  timestamp: string,
): DiscoverySession {
  return {
    ...state,
    updatedAt: timestamp,
    personalitySpectrum: {
      dimensions: state.personalitySpectrum.dimensions.map((dimension) =>
        dimension.id === dimensionId ? { ...dimension, answer } : dimension,
      ),
    },
  };
}

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
    case "set-spectrum": {
      const timestamp = new Date().toISOString();
      return withDimension(
        state,
        action.dimensionId,
        { state: "selected", value: clampSpectrumValue(action.value), capturedAt: timestamp },
        timestamp,
      );
    }
    case "neutral-spectrum": {
      const timestamp = new Date().toISOString();
      const current = state.personalitySpectrum.dimensions.find((dimension) => dimension.id === action.dimensionId);
      const answer =
        current?.answer.state === "neutral"
          ? { state: "unanswered" as const }
          : { state: "neutral" as const, capturedAt: timestamp };
      return withDimension(state, action.dimensionId, answer, timestamp);
    }
    case "choose-visual": {
      const timestamp = new Date().toISOString();
      const comparisons = state.visualPreferences.comparisons.map((comparison) => {
        if (comparison.comparisonId !== action.comparisonId) return comparison;
        const current = comparison.choice.state === "selected" ? comparison.choice.value : null;
        if (current === action.choice) return { ...comparison, choice: { state: "unanswered" as const } };
        return {
          ...comparison,
          choice: { state: "selected" as const, value: action.choice, capturedAt: timestamp },
        };
      });
      return {
        ...state,
        updatedAt: timestamp,
        visualPreferences: { comparisons: syncAdaptiveComparisons(comparisons) },
      };
    }
    case "toggle-preferred-palette": {
      const timestamp = new Date().toISOString();
      const current = state.colourPreferences.preferredPaletteIds;
      const has = current.includes(action.paletteId);
      if (!has && (current.length >= LIMITS.palettes || state.colourPreferences.avoidedPaletteIds.includes(action.paletteId))) {
        return state;
      }
      const preferredPaletteIds = has ? current.filter((id) => id !== action.paletteId) : [...current, action.paletteId];
      return {
        ...state,
        updatedAt: timestamp,
        colourPreferences: {
          ...state.colourPreferences,
          preferredPaletteIds,
          preferredCapturedAt: preferredPaletteIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "toggle-avoided-palette": {
      const timestamp = new Date().toISOString();
      if (state.colourPreferences.preferredPaletteIds.includes(action.paletteId)) return state;
      const current = state.colourPreferences.avoidedPaletteIds;
      const avoidedPaletteIds = current.includes(action.paletteId)
        ? current.filter((id) => id !== action.paletteId)
        : [...current, action.paletteId];
      return {
        ...state,
        updatedAt: timestamp,
        colourPreferences: {
          ...state.colourPreferences,
          avoidedPaletteIds,
          avoidedCapturedAt: avoidedPaletteIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "set-colour-relationship": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        colourPreferences: {
          ...state.colourPreferences,
          existingColourRelationship: { state: "selected", value: action.value, capturedAt: timestamp },
        },
      };
    }
    case "add-existing-colour": {
      const hex = normaliseHex(action.hex);
      if (!hex) return state;
      if (state.colourPreferences.existingBrandColours.some((colour) => colour.hex === hex)) return state;
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        colourPreferences: {
          ...state.colourPreferences,
          existingBrandColours: [...state.colourPreferences.existingBrandColours, { hex, capturedAt: timestamp }],
        },
      };
    }
    case "remove-existing-colour": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        colourPreferences: {
          ...state.colourPreferences,
          existingBrandColours: state.colourPreferences.existingBrandColours.filter((colour) => colour.hex !== action.hex),
        },
      };
    }
    case "toggle-preferred-type": {
      const timestamp = new Date().toISOString();
      const current = state.typographyPreferences.preferredDirectionIds;
      const has = current.includes(action.directionId);
      if (!has && (current.length >= LIMITS.typePreferred || state.typographyPreferences.avoidedDirectionIds.includes(action.directionId))) {
        return state;
      }
      const preferredDirectionIds = has ? current.filter((id) => id !== action.directionId) : [...current, action.directionId];
      return {
        ...state,
        updatedAt: timestamp,
        typographyPreferences: {
          ...state.typographyPreferences,
          preferredDirectionIds,
          preferredCapturedAt: preferredDirectionIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "toggle-avoided-type": {
      const timestamp = new Date().toISOString();
      if (state.typographyPreferences.preferredDirectionIds.includes(action.directionId)) return state;
      const current = state.typographyPreferences.avoidedDirectionIds;
      const avoidedDirectionIds = current.includes(action.directionId) ? [] : [action.directionId];
      return {
        ...state,
        updatedAt: timestamp,
        typographyPreferences: {
          ...state.typographyPreferences,
          avoidedDirectionIds,
          avoidedCapturedAt: avoidedDirectionIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "toggle-preferred-imagery": {
      const timestamp = new Date().toISOString();
      const current = state.imageryPreferences.preferredDirectionIds;
      const has = current.includes(action.directionId);
      if (!has && (current.length >= LIMITS.imageryPreferred || state.imageryPreferences.avoidedDirectionIds.includes(action.directionId))) {
        return state;
      }
      const preferredDirectionIds = has ? current.filter((id) => id !== action.directionId) : [...current, action.directionId];
      return {
        ...state,
        updatedAt: timestamp,
        imageryPreferences: {
          ...state.imageryPreferences,
          preferredDirectionIds,
          avoidedDirectionIds: state.imageryPreferences.avoidedDirectionIds.filter((id) => id !== action.directionId),
          preferredCapturedAt: preferredDirectionIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "choose-voice": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        voicePreferences: {
          ...state.voicePreferences,
          comparisons: state.voicePreferences.comparisons.map((round) => {
            if (round.roundId !== action.roundId) return round;
            if (action.optionId === "none") {
              if (round.choice.state === "none") return { ...round, choice: { state: "unanswered" } };
              return { ...round, choice: { state: "none", capturedAt: timestamp } };
            }
            if (round.choice.state === "selected" && round.choice.optionId === action.optionId) {
              return { ...round, choice: { state: "unanswered" } };
            }
            return { ...round, choice: { state: "selected", optionId: action.optionId, capturedAt: timestamp } };
          }),
        },
      };
    }
    case "voice-language": {
      const timestamp = new Date().toISOString();
      const field = action.field === "preferred" ? "preferredLanguage" : "avoidedLanguage";
      return {
        ...state,
        updatedAt: timestamp,
        voicePreferences: {
          ...state.voicePreferences,
          [field]: applyText(state.voicePreferences[field], action.value, timestamp),
        },
      };
    }
    case "add-inspiration": {
      const name = action.name.trim().replace(/\s+/g, " ");
      if (!name) return state;
      const timestamp = new Date().toISOString();
      const key = action.polarity === "positive" ? "positiveReferences" : "negativeReferences";
      const limit = action.polarity === "positive" ? LIMITS.inspirationPositive : LIMITS.inspirationNegative;
      const current = state.inspiration[key];
      if (current.length >= limit) return state;
      const reference = {
        id: crypto.randomUUID(),
        name,
        url: action.url.trim() || null,
        note: action.note.trim() || null,
        capturedAt: timestamp,
      };
      return {
        ...state,
        updatedAt: timestamp,
        inspiration: { ...state.inspiration, [key]: [...current, reference] },
      };
    }
    case "remove-inspiration": {
      const timestamp = new Date().toISOString();
      const key = action.polarity === "positive" ? "positiveReferences" : "negativeReferences";
      return {
        ...state,
        updatedAt: timestamp,
        inspiration: {
          ...state.inspiration,
          [key]: state.inspiration[key].filter((reference) => reference.id !== action.id),
        },
      };
    }
    case "begin-analysis": {
      if (state.agentObservations.status === "ready" || state.agentObservations.status === "running") return state;
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        agentObservations: { ...state.agentObservations, status: "running", failureCode: null },
        agentQuestions: { ...state.agentQuestions, status: "running" },
      };
    }
    case "record-analysis": {
      if (state.id !== action.sessionId) return state;
      const timestamp = new Date().toISOString();
      const result = action.result;
      return {
        ...state,
        updatedAt: timestamp,
        agentObservations: {
          status: "ready",
          analysisVersion: result.analysisVersion,
          provider: result.provider,
          model: result.model,
          generatedAt: timestamp,
          failureCode: null,
          items: result.observations,
          rawModelResponse: result.rawModelResponse,
          evidenceSent: action.evidenceSent,
        },
        agentQuestions: {
          status: "ready",
          candidates: result.candidates,
          selected: withCreativeFork(result.selected, state).map((question) => ({
            ...question,
            response: { state: "unanswered" as const },
          })),
          generatedAt: timestamp,
        },
      };
    }
    case "fail-analysis": {
      if (state.id !== action.sessionId) return state;
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        agentObservations: {
          ...state.agentObservations,
          status: "failed",
          failureCode: action.error,
          generatedAt: timestamp,
        },
        agentQuestions: { ...state.agentQuestions, status: "failed", generatedAt: timestamp },
      };
    }
    case "answer-clarification": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        agentQuestions: {
          ...state.agentQuestions,
          selected: state.agentQuestions.selected.map((question) => {
            if (question.id !== action.questionId) return question;
            if (action.optionId === MANAGER_HELP_ID) {
              return { ...question, response: { state: "uncertain", reason: "manager_help", capturedAt: timestamp } };
            }
            if (action.optionId) {
              return { ...question, response: { state: "selected", optionId: action.optionId, capturedAt: timestamp } };
            }
            const text = action.text?.trim() ?? "";
            if (!text) return { ...question, response: { state: "unanswered" } };
            const capturedAt = question.response.state === "evidence" ? question.response.capturedAt : timestamp;
            return { ...question, response: { state: "evidence", text, capturedAt } };
          }),
        },
      };
    }
    case "begin-profile": {
      const profile = state.discoveryProfile;
      if (profile.status === "running" || profile.status === "refining") return state;
      if (profile.status === "ready" && profile.clientFeedback) return state;
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        discoveryProfile: { ...profile, status: "running", failureCode: null },
      };
    }
    case "record-profile": {
      if (state.id !== action.sessionId) return state;
      if (state.discoveryProfile.clientFeedback) return state;
      const timestamp = new Date().toISOString();
      const version = { ...action.version, version: 1, feedback: null };
      return {
        ...state,
        updatedAt: timestamp,
        discoveryProfile: {
          ...state.discoveryProfile,
          status: "ready",
          activeVersion: 1,
          versions: [version],
          failureCode: action.failureCode,
        },
      };
    }
    case "set-profile-feedback": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        discoveryProfile: { ...state.discoveryProfile, clientFeedback: action.feedback },
      };
    }
    case "begin-refinement": {
      const profile = state.discoveryProfile;
      if (profile.status !== "ready" || profile.versions.length !== 1) return state;
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        discoveryProfile: { ...profile, status: "refining" },
      };
    }
    case "record-refinement": {
      if (state.id !== action.sessionId || state.discoveryProfile.status !== "refining") return state;
      const timestamp = new Date().toISOString();
      const version = {
        ...action.version,
        version: state.discoveryProfile.versions.length + 1,
        feedback: state.discoveryProfile.clientFeedback,
      };
      return {
        ...state,
        updatedAt: timestamp,
        discoveryProfile: {
          ...state.discoveryProfile,
          status: "ready",
          activeVersion: version.version,
          versions: [...state.discoveryProfile.versions, version],
          failureCode: action.failureCode,
        },
      };
    }
    case "clarify-uncertain": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        agentQuestions: {
          ...state.agentQuestions,
          selected: state.agentQuestions.selected.map((question) => {
            if (question.id !== action.questionId) return question;
            if (question.response.state === "uncertain") return { ...question, response: { state: "unanswered" } };
            return { ...question, response: { state: "uncertain", reason: "manager_help", capturedAt: timestamp } };
          }),
        },
      };
    }
    case "toggle-avoided-imagery": {
      const timestamp = new Date().toISOString();
      if (state.imageryPreferences.preferredDirectionIds.includes(action.directionId)) return state;
      const current = state.imageryPreferences.avoidedDirectionIds;
      const avoidedDirectionIds = current.includes(action.directionId)
        ? current.filter((id) => id !== action.directionId)
        : [...current, action.directionId];
      return {
        ...state,
        updatedAt: timestamp,
        imageryPreferences: {
          ...state.imageryPreferences,
          avoidedDirectionIds,
          avoidedCapturedAt: avoidedDirectionIds.length > 0 ? timestamp : null,
        },
      };
    }
    case "set-territory-reaction": {
      const timestamp = new Date().toISOString();
      const reactions = state.territoryFeedback.reactions.filter((item) => item.territoryId !== action.territoryId);
      reactions.push({ territoryId: action.territoryId, response: action.response, note: action.note });
      return {
        ...state,
        updatedAt: timestamp,
        territoryFeedback: { ...state.territoryFeedback, reactions, capturedAt: timestamp },
      };
    }
    case "set-territory-preference": {
      const timestamp = new Date().toISOString();
      return {
        ...state,
        updatedAt: timestamp,
        territoryFeedback: { ...state.territoryFeedback, preference: action.preference, capturedAt: timestamp },
      };
    }
    default:
      return state;
  }
}
