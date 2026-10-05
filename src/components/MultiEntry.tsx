import { useState } from "react";
import { parseEntries } from "../domain/multiEntry";

export function MultiEntry({
  values,
  onChange,
  placeholder,
  labelledBy,
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  labelledBy: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const next = parseEntries(raw);
    if (next.length === 0) {
      setDraft("");
      return;
    }
    const merged = [...values];
    for (const name of next) {
      if (!merged.some((item) => item.toLowerCase() === name.toLowerCase())) merged.push(name);
    }
    onChange(merged);
    setDraft("");
  }

  function take(raw: string) {
    if (/[,;\n]/.test(raw)) commit(raw);
    else setDraft(raw);
  }

  return (
    <div className="multi-entry">
      {values.length > 0 ? (
        <ul className="chip-list">
          {values.map((name) => (
            <li key={name}>
              <span>{name}</span>
              <button type="button" className="quiet" onClick={() => onChange(values.filter((item) => item !== name))}>Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        className="text-response is-short"
        aria-labelledby={labelledBy}
        placeholder={placeholder}
        rows={2}
        value={draft}
        onChange={(event) => take(event.target.value)}
        onBlur={() => commit(draft)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (!/[,;\n]/.test(text)) return;
          event.preventDefault();
          commit(`${draft}${text}`);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            commit(draft);
          }
        }}
      />
    </div>
  );
}
