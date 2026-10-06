import { useEffect, useRef, useState } from "react";
import { ActionGroup } from "../../components/ActionGroup";
import { nameMatches } from "../../domain/project/removeClient";

export function RemoveClientSection({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="client-remove" data-screen="remove-client">
      <h2>Remove client</h2>
      <p>Permanently remove this client and their Brief data.</p>
      <button type="button" className="studio-button remove-client" onClick={() => setOpen(true)}>Remove client</button>
      {open ? (
        <RemoveClientDialog
          name={name}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            onRemove();
          }}
        />
      ) : null}
    </section>
  );
}

export function RemoveClientDialog({
  name,
  typed,
  onType,
  onCancel,
  onConfirm,
}: {
  name: string;
  typed?: string;
  onType?: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [local, setLocal] = useState("");
  const value = typed ?? local;
  const setValue = onType ?? setLocal;
  const inputRef = useRef<HTMLInputElement>(null);
  const matched = nameMatches(name, value);
  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="layer-backdrop" data-layer="modal" role="presentation" onClick={onCancel}>
      <div className="layer-modal" role="dialog" aria-modal="true" aria-labelledby="remove-client-title" data-screen="remove-client-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="layer-body">
          <h2 id="remove-client-title">Remove {name}?</h2>
          <p>This will permanently remove this client from Brief, including their discovery, brand understanding, market research, competitors and opportunities.</p>
          <p>This cannot be undone.</p>
          <label>
            Type {name} to confirm
            <input ref={inputRef} value={value} autoComplete="off" onChange={(event) => setValue(event.target.value)} />
          </label>
        </div>
        <ActionGroup footer>
          <button type="button" className="studio-button remove-client" disabled={!matched} onClick={onConfirm}>Remove client</button>
          <button type="button" className="studio-text-button" onClick={onCancel}>Cancel</button>
        </ActionGroup>
      </div>
    </div>
  );
}
