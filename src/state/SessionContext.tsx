import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  BusinessTextField,
  DiscoverySession,
  MarketingOutcome,
  PersonalityPoleId,
  PersonalityTrait,
  SectionId,
} from "../types/discovery";
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
  toggleTrait: (pole: PersonalityPoleId, trait: PersonalityTrait) => void;
  addCustomTrait: (pole: PersonalityPoleId, value: string) => void;
  removeCustomTrait: (pole: PersonalityPoleId, value: string) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, loadSession);

  useEffect(() => {
    saveSession(session);
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
  const reset = useCallback(() => send({ type: "reset" }), [send]);

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
      toggleTrait,
      addCustomTrait,
      removeCustomTrait,
      reset,
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
      toggleTrait,
      addCustomTrait,
      removeCustomTrait,
      reset,
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
