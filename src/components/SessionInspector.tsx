import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { buildDiscoveryEvidence } from "../domain/evidence";
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
  const json = JSON.stringify(session, null, 2);
  const visualSignal = deriveVisualSignal(session.visualPreferences);
  const evidence = buildDiscoveryEvidence(session);

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
      <div className="inspector-scroll">
        <EvidenceBlock title="personalitySpectrum" data={session.personalitySpectrum} startOpen />
        <EvidenceBlock title="visualPreferences" data={session.visualPreferences} startOpen />
        <EvidenceBlock
          title="Derived visual signal"
          note="Computed from the raw choices while this panel is open. Not stored on the session, and not an observation."
          data={visualSignal ?? { state: "not_enough_choices" }}
          startOpen
        />
        <EvidenceBlock title="colourPreferences" data={session.colourPreferences} startOpen />
        <EvidenceBlock title="typographyPreferences" data={session.typographyPreferences} startOpen />
        <EvidenceBlock title="imageryPreferences" data={session.imageryPreferences} startOpen />
        <EvidenceBlock title="voicePreferences" data={session.voicePreferences} startOpen />
        <EvidenceBlock title="inspiration" data={session.inspiration} startOpen />
        <EvidenceBlock
          title="Evidence sent to agent"
          note="Built from the session on demand. Derived signals are labelled derived_signal. This is the shape posted to /api/discovery/analyze."
          data={evidence}
        />
        <EvidenceBlock
          title="Evidence from the last analysis"
          note="The payload stored with the analysis, so you can see exactly what was sent even if the session has moved on."
          data={session.agentObservations.evidenceSent ?? { state: "not_sent" }}
        />
        <EvidenceBlock
          title="Raw structured agent response"
          data={session.agentObservations.rawModelResponse ?? { state: session.agentObservations.status, failureCode: session.agentObservations.failureCode }}
        />
        <EvidenceBlock title="Filtered observations" data={session.agentObservations.items} startOpen />
        <EvidenceBlock title="Selected questions" data={session.agentQuestions.selected} startOpen />
        <EvidenceBlock title="Candidate questions" data={session.agentQuestions.candidates} />
        <EvidenceBlock title="Earlier evidence" data={{
          business: session.business,
          audience: session.audience,
          goals: session.goals,
          personality: session.personality,
        }} />
        <EvidenceBlock title="Full session" data={session} />
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
