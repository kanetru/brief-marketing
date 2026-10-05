import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { parseEntries } from "../domain/multiEntry";
import { LIMITS } from "../domain/options";
import type { InspirationReference } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function InspirationScreen() {
  const { session, addInspiration, removeInspiration } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("inspiration");
  const positive = step === 0;

  return (
    <DiscoveryLayout
      section="inspiration"
      step={step}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "inspiration", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`inspiration-${step}`}>
        {positive ? (
          <ReferenceStep
            title="Who gets it right?"
            supporting="Who do you pay attention to? They don't have to be competitors."
            noteLabel="What do you like about them?"
            references={session.inspiration.positiveReferences}
            limit={LIMITS.inspirationPositive}
            onAdd={(name, url, note) => addInspiration("positive", name, url, note)}
            onRemove={(id) => removeInspiration("positive", id)}
          />
        ) : (
          <ReferenceStep
            title="Anyone you definitely don't want to resemble?"
            supporting="A name is enough. The note is only if you want to say what to steer clear of."
            noteLabel="What is it you want to avoid?"
            references={session.inspiration.negativeReferences}
            limit={LIMITS.inspirationNegative}
            onAdd={(name, url, note) => addInspiration("negative", name, url, note)}
            onRemove={(id) => removeInspiration("negative", id)}
          />
        )}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function ReferenceStep({
  title,
  supporting,
  noteLabel,
  references,
  limit,
  onAdd,
  onRemove,
}: {
  title: string;
  supporting: string;
  noteLabel: string;
  references: InspirationReference[];
  limit: number;
  onAdd: (name: string, url: string, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const full = references.length >= limit;

  function add(raw = name) {
    const names = parseEntries(raw);
    if (names.length === 0) {
      setMessage("A name is the only required bit.");
      return;
    }
    if (full) {
      setMessage(limit === 5 ? "Five is plenty." : "Three is plenty.");
      return;
    }
    names.slice(0, limit - references.length).forEach((item, index) => onAdd(item, index === 0 ? url : "", index === 0 ? note : ""));
    setName("");
    setUrl("");
    setNote("");
    setMessage(null);
  }

  return (
    <QuestionScreen kicker="Inspiration" title={title} supporting={supporting}>
      {full ? null : (
        <form
          className="reference-composer"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <input
            className="reference-name"
            aria-label="Name"
            placeholder="Name"
            value={name}
            onChange={(event) => {
              const next = event.target.value;
              if (/[,;\n]/.test(next)) add(next);
              else setName(next);
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!/[,;\n]/.test(text)) return;
              event.preventDefault();
              add(`${name}${text}`);
            }}
          />
          <input
            className="reference-optional"
            aria-label="URL, optional"
            placeholder="URL, if you have one"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <input
            className="reference-optional"
            aria-label={`${noteLabel} Optional.`}
            placeholder={`${noteLabel} Optional.`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button type="submit" className="text-button reference-add">
            Add
          </button>
        </form>
      )}
      <ul className="reference-list">
        {references.map((reference) => (
          <li key={reference.id}>
            <div>
              <p className="reference-title">{reference.name}</p>
              {reference.note ? <p className="reference-note">{reference.note}</p> : null}
              {reference.url ? <p className="reference-url">{reference.url}</p> : null}
            </div>
            <button type="button" className="quiet" onClick={() => onRemove(reference.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="gentle" role="status">
        {message ?? (references.length === 0 ? "You can leave this open." : "")}
      </p>
    </QuestionScreen>
  );
}
