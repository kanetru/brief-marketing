import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { buildBrandIntelligence } from "../domain/brandIntelligence";
import { buildDiscoveryEvidence } from "../domain/evidence";
import { activeProfileVersion } from "../domain/profileRequest";
import { deriveVisualSignal } from "../domain/visualSignal";
import { useSession } from "../state/SessionContext";

interface InspectorControls {
  open: boolean;
  toggle: () => void;
}

const InspectorContext = createContext<InspectorControls | null>(null);

export function SessionInspector({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  const controls = useMemo(() => ({ open, toggle }), [open, toggle]);

  if (!import.meta.env.DEV) return children;

  return (
    <InspectorContext.Provider value={controls}>
      {children}
      {open ? <InspectorPanel onClose={close} /> : null}
    </InspectorContext.Provider>
  );
}

export function SessionToggle() {
  const controls = useContext(InspectorContext);
  if (!controls) return null;

  return (
    <button
      type="button"
      className="session-link"
      aria-expanded={controls.open}
      data-testid="session-toggle"
      onClick={controls.toggle}
    >
      Session
    </button>
  );
}

function InspectorPanel({ onClose }: { onClose: () => void }) {
  const { session, reset } = useSession();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"session" | "evidence" | "clarification" | "profile" | "versions" | "signals">("session");
  const intelligence = buildBrandIntelligence(session);
  const json = JSON.stringify(session, null, 2);
  const visualSignal = deriveVisualSignal(session.visualPreferences);
  const evidence = buildDiscoveryEvidence(session);
  const profileVersion = activeProfileVersion(session.discoveryProfile.versions, session.discoveryProfile.activeVersion);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function resetSession() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    reset();
    setConfirming(false);
    onClose();
    navigate("/demo/start");
  }

  return (
    <aside className="inspector-panel" role="dialog" aria-label="Discovery session inspector">
      <div className="inspector-bar">
        <div>
          <p className="inspector-title">Discovery session</p>
          <p className="inspector-note">
            Client evidence, then the analysis payload, observations, and the questions that were kept.
            Nothing here is a brand decision.
          </p>
        </div>
        <div className="inspector-actions">
          <button type="button" className="inspector-button" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="inspector-button" onClick={resetSession}>
            {confirming ? "Confirm reset" : "Reset"}
          </button>
          <button type="button" className="inspector-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
        {(
          [
            ["session", "Session"],
            ["evidence", "Evidence"],
            ["clarification", "Clarification"],
            ["profile", "Profile"],
            ["versions", "Profile versions"],
            ["signals", "Brand signals"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="inspector-scroll">
        {tab === "session" ? (
          <>
            <EvidenceBlock title="Earlier evidence" data={{ business: session.business, audience: session.audience, goals: session.goals, personality: session.personality }} startOpen />
            <EvidenceBlock title="personalitySpectrum" data={session.personalitySpectrum} />
            <EvidenceBlock title="visualPreferences" data={session.visualPreferences} />
            <EvidenceBlock title="Derived visual signal" note="Computed while this panel is open. Not stored, and not an observation." data={visualSignal ?? { state: "not_enough_choices" }} />
            <EvidenceBlock title="colourPreferences" data={session.colourPreferences} />
            <EvidenceBlock title="typographyPreferences" data={session.typographyPreferences} />
            <EvidenceBlock title="imageryPreferences" data={session.imageryPreferences} />
            <EvidenceBlock title="voicePreferences" data={session.voicePreferences} />
            <EvidenceBlock title="inspiration" data={session.inspiration} />
            <EvidenceBlock title="Full session" data={session} />
          </>
        ) : null}
        {tab === "evidence" ? (
          <>
            <EvidenceBlock title="Evidence sent to agent" note="Built on demand. Derived signals are labelled derived_signal." data={evidence} startOpen />
            <EvidenceBlock title="Evidence from the last analysis" data={session.agentObservations.evidenceSent ?? { state: "not_sent" }} />
          </>
        ) : null}
        {tab === "clarification" ? (
          <>
            <EvidenceBlock title="Raw structured agent response" data={session.agentObservations.rawModelResponse ?? { state: session.agentObservations.status, failureCode: session.agentObservations.failureCode }} startOpen />
            <EvidenceBlock title="Filtered observations" data={session.agentObservations.items} startOpen />
            <EvidenceBlock title="Selected questions" data={session.agentQuestions.selected} />
            <EvidenceBlock title="Candidate questions" data={session.agentQuestions.candidates} />
          </>
        ) : null}
        {tab === "profile" ? (
          <>
            <EvidenceBlock
              title="Profile state"
              data={{
                status: session.discoveryProfile.status,
                failureCode: session.discoveryProfile.failureCode,
                clientFeedback: session.discoveryProfile.clientFeedback,
                source: profileVersion?.source ?? null,
                usedFallback: profileVersion?.usedFallback ?? null,
                provider: profileVersion?.provider ?? null,
                model: profileVersion?.model ?? null,
              }}
              startOpen
            />
            <EvidenceBlock title="Rejected statements" data={profileVersion?.rejectedStatements ?? []} startOpen />
            <EvidenceBlock title="Validated profile" data={profileVersion?.content ?? { state: "not_compiled" }} />
            <EvidenceBlock title="Raw profile response" data={profileVersion?.rawModelResponse ?? { state: "none" }} />
          </>
        ) : null}
        {tab === "versions" ? <EvidenceBlock title="Profile versions" data={session.discoveryProfile.versions} startOpen /> : null}
        {tab === "signals" ? (
          <>
            <EvidenceBlock title="Weights" note={intelligence.weightingNotes} data={{ note: intelligence.weightingNotes }} startOpen />
            <EvidenceBlock title="Normalised contributions" data={intelligence.model.contributions} startOpen />
            <EvidenceBlock title="Cross-modal reinforcement" data={intelligence.model.reinforcement} />
            <EvidenceBlock title="Negative evidence" data={{ hardAvoids: intelligence.model.hardAvoids, softAvoids: intelligence.model.softAvoids }} />
            <EvidenceBlock title="Final brand signal model" data={intelligence.model} />
            <EvidenceBlock title="Draft territories" data={intelligence.draftTerritories} />
            <EvidenceBlock title="Unresolved fork" data={{ question: intelligence.forkQuestion, tensions: intelligence.draftModel.tensions }} />
            <EvidenceBlock title="Clarification decision" data={session.agentQuestions.selected.filter((question) => question.id === "creative-fork")} />
            <EvidenceBlock title="Final territories" data={intelligence.territories} />
          </>
        ) : null}
      </div>
    </aside>
  );
}

function EvidenceBlock({
  title,
  note,
  data,
  startOpen = false,
}: {
  title: string;
  note?: string;
  data: unknown;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);

  return (
    <details
      className="evidence"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      {note ? <p className="inspector-note">{note}</p> : null}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
