import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { AnalysisSuccess } from "../domain/analysis";
import type { DiscoveryEvidence } from "../domain/evidence";
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
  PersonalityPoleId,
  PersonalityTrait,
  SectionId,
  SpectrumDimensionId,
  TypographyDirectionId,
  VisualChoice,
} from "../types/discovery";
import type { OfferInput, StrategyListField, StrategyTextField } from "../types/strategy";
import { loadSession, saveSession } from "./storage";
import { sessionReducer, type Action } from "./sessionReducer";

interface SessionApi {
  session: DiscoverySession;
  activate: (section: SectionId) => void;
  enterAt: (section: SectionId, step: number) => void;
  setBusinessText: (field: BusinessTextField, value: string) => void;
  setDifferentiationUncertain: () => void;
  setBestCustomers: (value: string) => void;
  setDesiredText: (value: string) => void;
  setDesiredSame: () => void;
  setDesiredUncertain: () => void;
  toggleOutcome: (outcome: MarketingOutcome) => void;
  setSomethingElse: (value: string) => void;
  setTwelveMonth: (value: string) => void;
  setStrategyText: (field: StrategyTextField, value: string) => void;
  toggleStrategy: (field: StrategyListField, value: string) => void;
  setStrategyValue: (field: "awareness" | "capacity" | "time", value: string | null) => void;
  saveOffer: (offer: OfferInput) => void;
  removeOffer: (id: string) => void;
  setPresence: (field: "instagram" | "tiktok" | "website" | "note", value: string) => void;
  setWhyUncertain: () => void;
  toggleTrait: (pole: PersonalityPoleId, trait: PersonalityTrait) => void;
  addCustomTrait: (pole: PersonalityPoleId, value: string) => void;
  removeCustomTrait: (pole: PersonalityPoleId, value: string) => void;
  setSpectrum: (dimensionId: SpectrumDimensionId, value: number) => void;
  neutralSpectrum: (dimensionId: SpectrumDimensionId) => void;
  chooseVisual: (comparisonId: string, choice: VisualChoice) => void;
  togglePreferredPalette: (paletteId: string) => void;
  toggleCloserBoard: (paletteId: string) => void;
  toggleColourNuance: (nuanceId: string) => void;
  setColourNuance: (nuanceId: string, reaction: "love" | "interesting" | "not_me") => void;
  toggleAvoidedPalette: (paletteId: string) => void;
  setColourPush: (push: import("../types/creativeReading").ColourPush | null) => void;
  setColourRelationship: (value: ColourRelationship) => void;
  addExistingColour: (hex: string) => void;
  removeExistingColour: (hex: string) => void;
  toggleTypeWorld: (worldId: string, directionId: TypographyDirectionId) => void;
  togglePreferredType: (directionId: TypographyDirectionId) => void;
  toggleTypeRefinement: (faceId: string) => void;
  toggleAvoidedType: (directionId: TypographyDirectionId) => void;
  togglePreferredImagery: (directionId: ImageryDirectionId) => void;
  setImageryReaction: (directionId: ImageryDirectionId, reaction: "love" | "interesting" | "not_me") => void;
  setCloserStill: (stillId: string, reaction: "love" | "interesting" | "not_me") => void;
  toggleAvoidedImagery: (directionId: ImageryDirectionId) => void;
  chooseVoice: (roundId: string, optionId: string) => void;
  setVoiceLanguage: (field: "preferred" | "avoided", value: string) => void;
  addInspiration: (polarity: "positive" | "negative", name: string, url: string, note: string) => void;
  removeInspiration: (polarity: "positive" | "negative", id: string) => void;
  beginAnalysis: () => void;
  recordAnalysis: (result: AnalysisSuccess, evidence: DiscoveryEvidence) => void;
  failAnalysis: (error: AnalysisFailureCode) => void;
  answerClarification: (questionId: string, answer: { text?: string; optionId?: string }) => void;
  clarifyUncertain: (questionId: string) => void;
  beginProfile: () => void;
  recordProfile: (version: DiscoveryProfileVersion, failureCode: AnalysisFailureCode | null) => void;
  setProfileFeedback: (feedback: ProfileFeedback) => void;
  beginRefinement: () => void;
  recordRefinement: (version: DiscoveryProfileVersion, failureCode: AnalysisFailureCode | null) => void;
  setTerritoryReaction: (territoryId: string, response: TerritoryReactionResponse, note: string) => void;
  setTerritoryPreference: (preference: string | null) => void;
  beginStrategist: () => void;
  recordStrategist: (evidenceHash: string, reading: import("../types/creativeReading").CreativeReading) => void;
  failStrategist: (evidenceHash: string, failureCode: string) => void;
  reset: () => void;
  hydrate: (session: DiscoverySession) => void;
  setPersister: (persist: (session: DiscoverySession) => void) => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, loadSession);
  const persistRef = useRef<(next: DiscoverySession) => void>(saveSession);

  useEffect(() => {
    persistRef.current(session);
  }, [session]);

  const send = useCallback((action: Action) => {
    dispatch(action);
  }, []);

  const activate = useCallback((section: SectionId) => send({ type: "activate", section }), [send]);
  const enterAt = useCallback(
    (section: SectionId, step: number) => send({ type: "enter", section, step }),
    [send],
  );
  const setBusinessText = useCallback(
    (field: BusinessTextField, value: string) => send({ type: "business-text", field, value }),
    [send],
  );
  const setDifferentiationUncertain = useCallback(() => send({ type: "differentiation-uncertain" }), [send]);
  const setBestCustomers = useCallback(
    (value: string) => send({ type: "audience-current", value }),
    [send],
  );
  const setDesiredText = useCallback(
    (value: string) => send({ type: "audience-desired-text", value }),
    [send],
  );
  const setDesiredSame = useCallback(() => send({ type: "audience-desired-same" }), [send]);
  const setDesiredUncertain = useCallback(() => send({ type: "audience-desired-uncertain" }), [send]);
  const toggleOutcome = useCallback(
    (outcome: MarketingOutcome) => send({ type: "toggle-outcome", outcome }),
    [send],
  );
  const setSomethingElse = useCallback(
    (value: string) => send({ type: "goals-something-else", value }),
    [send],
  );
  const setTwelveMonth = useCallback(
    (value: string) => send({ type: "goals-horizon", value }),
    [send],
  );
  const setStrategyText = useCallback(
    (field: StrategyTextField, value: string) => send({ type: "strategy-text", field, value }),
    [send],
  );
  const toggleStrategy = useCallback(
    (field: StrategyListField, value: string) => send({ type: "strategy-toggle", field, value }),
    [send],
  );
  const setStrategyValue = useCallback(
    (field: "awareness" | "capacity" | "time", value: string | null) => send({ type: "strategy-set", field, value }),
    [send],
  );
  const saveOffer = useCallback((offer: OfferInput) => send({ type: "strategy-offer", offer }), [send]);
  const removeOffer = useCallback((id: string) => send({ type: "strategy-offer-remove", id }), [send]);
  const setPresence = useCallback(
    (field: "instagram" | "tiktok" | "website" | "note", value: string) => send({ type: "strategy-presence", field, value }),
    [send],
  );
  const setWhyUncertain = useCallback(() => send({ type: "strategy-uncertain" }), [send]);
  const toggleTrait = useCallback(
    (pole: PersonalityPoleId, trait: PersonalityTrait) => send({ type: "toggle-trait", pole, trait }),
    [send],
  );
  const addCustomTrait = useCallback(
    (pole: PersonalityPoleId, value: string) => send({ type: "add-custom-trait", pole, value }),
    [send],
  );
  const removeCustomTrait = useCallback(
    (pole: PersonalityPoleId, value: string) => send({ type: "remove-custom-trait", pole, value }),
    [send],
  );
  const setSpectrum = useCallback(
    (dimensionId: SpectrumDimensionId, value: number) => send({ type: "set-spectrum", dimensionId, value }),
    [send],
  );
  const neutralSpectrum = useCallback(
    (dimensionId: SpectrumDimensionId) => send({ type: "neutral-spectrum", dimensionId }),
    [send],
  );
  const chooseVisual = useCallback(
    (comparisonId: string, choice: VisualChoice) => send({ type: "choose-visual", comparisonId, choice }),
    [send],
  );
  const togglePreferredPalette = useCallback(
    (paletteId: string) => send({ type: "toggle-preferred-palette", paletteId }),
    [send],
  );
  const toggleCloserBoard = useCallback(
    (paletteId: string) => send({ type: "toggle-closer-board", paletteId }),
    [send],
  );
  const toggleColourNuance = useCallback(
    (nuanceId: string) => send({ type: "toggle-colour-nuance", nuanceId }),
    [send],
  );
  const setColourNuance = useCallback(
    (nuanceId: string, reaction: "love" | "interesting" | "not_me") => send({ type: "set-colour-nuance", nuanceId, reaction }),
    [send],
  );
  const toggleAvoidedPalette = useCallback(
    (paletteId: string) => send({ type: "toggle-avoided-palette", paletteId }),
    [send],
  );
  const setColourPush = useCallback(
    (push: import("../types/creativeReading").ColourPush | null) => send({ type: "set-colour-push", push }),
    [send],
  );
  const setColourRelationship = useCallback(
    (value: ColourRelationship) => send({ type: "set-colour-relationship", value }),
    [send],
  );
  const addExistingColour = useCallback((hex: string) => send({ type: "add-existing-colour", hex }), [send]);
  const removeExistingColour = useCallback((hex: string) => send({ type: "remove-existing-colour", hex }), [send]);
  const toggleTypeWorld = useCallback(
    (worldId: string, directionId: TypographyDirectionId) => send({ type: "toggle-type-world", worldId, directionId }),
    [send],
  );
  const togglePreferredType = useCallback(
    (directionId: TypographyDirectionId) => send({ type: "toggle-preferred-type", directionId }),
    [send],
  );
  const toggleTypeRefinement = useCallback((faceId: string) => send({ type: "toggle-type-refinement", faceId }), [send]);
  const toggleAvoidedType = useCallback(
    (directionId: TypographyDirectionId) => send({ type: "toggle-avoided-type", directionId }),
    [send],
  );
  const togglePreferredImagery = useCallback(
    (directionId: ImageryDirectionId) => send({ type: "toggle-preferred-imagery", directionId }),
    [send],
  );
  const setImageryReaction = useCallback(
    (directionId: ImageryDirectionId, reaction: "love" | "interesting" | "not_me") =>
      send({ type: "set-imagery-reaction", directionId, reaction }),
    [send],
  );
  const setCloserStill = useCallback(
    (stillId: string, reaction: "love" | "interesting" | "not_me") =>
      send({ type: "set-closer-still", stillId, reaction }),
    [send],
  );
  const toggleAvoidedImagery = useCallback(
    (directionId: ImageryDirectionId) => send({ type: "toggle-avoided-imagery", directionId }),
    [send],
  );
  const chooseVoice = useCallback(
    (roundId: string, optionId: string) => send({ type: "choose-voice", roundId, optionId }),
    [send],
  );
  const setVoiceLanguage = useCallback(
    (field: "preferred" | "avoided", value: string) => send({ type: "voice-language", field, value }),
    [send],
  );
  const addInspiration = useCallback(
    (polarity: "positive" | "negative", name: string, url: string, note: string) =>
      send({ type: "add-inspiration", polarity, name, url, note }),
    [send],
  );
  const removeInspiration = useCallback(
    (polarity: "positive" | "negative", id: string) => send({ type: "remove-inspiration", polarity, id }),
    [send],
  );
  const beginAnalysis = useCallback(() => send({ type: "begin-analysis" }), [send]);
  const recordAnalysis = useCallback(
    (result: AnalysisSuccess, evidence: DiscoveryEvidence) =>
      send({ type: "record-analysis", sessionId: session.id, result, evidenceSent: evidence }),
    [send, session.id],
  );
  const failAnalysis = useCallback(
    (error: AnalysisFailureCode) => send({ type: "fail-analysis", sessionId: session.id, error }),
    [send, session.id],
  );
  const answerClarification = useCallback(
    (questionId: string, answer: { text?: string; optionId?: string }) =>
      send({ type: "answer-clarification", questionId, ...answer }),
    [send],
  );
  const clarifyUncertain = useCallback(
    (questionId: string) => send({ type: "clarify-uncertain", questionId }),
    [send],
  );
  const beginProfile = useCallback(() => send({ type: "begin-profile" }), [send]);
  const recordProfile = useCallback(
    (version: DiscoveryProfileVersion, failureCode: AnalysisFailureCode | null) =>
      send({ type: "record-profile", sessionId: session.id, version, failureCode }),
    [send, session.id],
  );
  const setProfileFeedback = useCallback(
    (feedback: ProfileFeedback) => send({ type: "set-profile-feedback", feedback }),
    [send],
  );
  const beginRefinement = useCallback(() => send({ type: "begin-refinement" }), [send]);
  const recordRefinement = useCallback(
    (version: DiscoveryProfileVersion, failureCode: AnalysisFailureCode | null) =>
      send({ type: "record-refinement", sessionId: session.id, version, failureCode }),
    [send, session.id],
  );
  const setTerritoryReaction = useCallback(
    (territoryId: string, response: TerritoryReactionResponse, note: string) =>
      send({ type: "set-territory-reaction", territoryId, response, note }),
    [send],
  );
  const setTerritoryPreference = useCallback(
    (preference: string | null) => send({ type: "set-territory-preference", preference }),
    [send],
  );
  const beginStrategist = useCallback(() => send({ type: "begin-strategist" }), [send]);
  const recordStrategist = useCallback(
    (evidenceHash: string, reading: import("../types/creativeReading").CreativeReading) =>
      send({ type: "record-strategist", evidenceHash, reading }),
    [send],
  );
  const failStrategist = useCallback(
    (evidenceHash: string, failureCode: string) => send({ type: "fail-strategist", evidenceHash, failureCode }),
    [send],
  );
  const reset = useCallback(() => send({ type: "reset" }), [send]);
  const hydrate = useCallback((next: DiscoverySession) => send({ type: "hydrate", session: next }), [send]);
  const setPersister = useCallback((persist: (next: DiscoverySession) => void) => {
    persistRef.current = persist;
  }, []);

  const api = useMemo<SessionApi>(
    () => ({
      session,
      activate,
      enterAt,
      setBusinessText,
      setDifferentiationUncertain,
      setBestCustomers,
      setDesiredText,
      setDesiredSame,
      setDesiredUncertain,
      toggleOutcome,
      setSomethingElse,
      setTwelveMonth,
      setStrategyText,
      toggleStrategy,
      setStrategyValue,
      saveOffer,
      removeOffer,
      setPresence,
      setWhyUncertain,
      toggleTrait,
      addCustomTrait,
      removeCustomTrait,
      setSpectrum,
      neutralSpectrum,
      chooseVisual,
      togglePreferredPalette,
      toggleCloserBoard,
      toggleColourNuance,
      setColourNuance,
      toggleAvoidedPalette,
      setColourPush,
      setColourRelationship,
      addExistingColour,
      removeExistingColour,
      toggleTypeWorld,
      togglePreferredType,
      toggleTypeRefinement,
      toggleAvoidedType,
      togglePreferredImagery,
      setImageryReaction,
      setCloserStill,
      toggleAvoidedImagery,
      chooseVoice,
      setVoiceLanguage,
      addInspiration,
      removeInspiration,
      beginAnalysis,
      recordAnalysis,
      failAnalysis,
      answerClarification,
      clarifyUncertain,
      beginProfile,
      recordProfile,
      setProfileFeedback,
      beginRefinement,
      recordRefinement,
      setTerritoryReaction,
      setTerritoryPreference,
      beginStrategist,
      recordStrategist,
      failStrategist,
      reset,
      hydrate,
      setPersister,
    }),
    [
      session,
      activate,
      enterAt,
      setBusinessText,
      setDifferentiationUncertain,
      setBestCustomers,
      setDesiredText,
      setDesiredSame,
      setDesiredUncertain,
      toggleOutcome,
      setSomethingElse,
      setTwelveMonth,
      setStrategyText,
      toggleStrategy,
      setStrategyValue,
      saveOffer,
      removeOffer,
      setPresence,
      setWhyUncertain,
      toggleTrait,
      addCustomTrait,
      removeCustomTrait,
      setSpectrum,
      neutralSpectrum,
      chooseVisual,
      togglePreferredPalette,
      toggleCloserBoard,
      toggleColourNuance,
      setColourNuance,
      toggleAvoidedPalette,
      setColourPush,
      setColourRelationship,
      addExistingColour,
      removeExistingColour,
      toggleTypeWorld,
      togglePreferredType,
      toggleTypeRefinement,
      toggleAvoidedType,
      togglePreferredImagery,
      setImageryReaction,
      setCloserStill,
      toggleAvoidedImagery,
      chooseVoice,
      setVoiceLanguage,
      addInspiration,
      removeInspiration,
      beginAnalysis,
      recordAnalysis,
      failAnalysis,
      answerClarification,
      clarifyUncertain,
      beginProfile,
      recordProfile,
      setProfileFeedback,
      beginRefinement,
      recordRefinement,
      setTerritoryReaction,
      setTerritoryPreference,
      beginStrategist,
      recordStrategist,
      failStrategist,
      reset,
      hydrate,
      setPersister,
    ],
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
