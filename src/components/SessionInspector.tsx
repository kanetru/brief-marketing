import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
            Client evidence, structured choices, and explicit uncertainty. Observations and the
            profile stay empty until a later layer writes them.
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
      <pre>{json}</pre>
    </aside>
  );
}
