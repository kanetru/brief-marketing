import { useEffect, useRef, useState } from "react";
import { briefReply, type BriefIdea, type BriefTurn } from "../../domain/workspace/briefing";
import type { BriefMessage, BriefProject } from "../../types/project";

const PROMPTS = [
  "What should I know before my client call?",
  "What are competitors doing differently?",
  "Where is the biggest positioning opportunity?",
  "Give me three content ideas from the research.",
];

export function AskBrief({
  project,
  open,
  seed,
  onClose,
  onMessages,
  onSaveIdea,
  onNote,
}: {
  project: BriefProject;
  open: boolean;
  seed: string;
  onClose: () => void;
  onMessages: (messages: BriefMessage[]) => void;
  onSaveIdea: (idea: BriefIdea) => void;
  onNote: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const messages = project.briefing ?? [];
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length]);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    const history: BriefTurn[] = messages.map((message) => ({ role: message.role, text: message.text }));
    const reply = briefReply(project, history, question);
    const now = new Date().toISOString();
    onMessages([
      ...messages,
      { id: crypto.randomUUID(), role: "manager", text: question, at: now },
      { id: crypto.randomUUID(), role: "brief", text: reply.text, at: now, basis: reply.basis },
    ]);
    setDraft("");
    setSaved("");
  }

  if (!open) return null;
  return (
    <div className="brief-layer" role="presentation">
      <section className="brief-sheet" role="dialog" aria-modal="true" aria-label="Ask Brief" data-screen="ask-brief">
        <header className="brief-head">
          <div>
            <p className="studio-kicker">Brief</p>
            <h2>Ask me anything about {project.businessName || "this client"}.</h2>
          </div>
          <button type="button" className="studio-text-button" onClick={onClose}>Close</button>
        </header>
        {seed ? <p className="brief-seed">{seed}</p> : null}
        <div className="brief-log">
          {messages.length === 0 ? (
            <div className="brief-prompts">
              {PROMPTS.map((prompt) => (
                <button key={prompt} type="button" className="brief-prompt" onClick={() => ask(prompt)}>{prompt}</button>
              ))}
            </div>
          ) : messages.map((message) => (
            <article key={message.id} className={message.role === "brief" ? "brief-turn is-brief" : "brief-turn"}>
              <p>{message.text}</p>
              {message.basis ? <p className="brief-basis">{message.basis}</p> : null}
              {message.role === "brief" ? (
                <div className="brief-actions">
                  <button type="button" onClick={() => { onNote(message.text); setSaved("Added to notes"); }}>Add to notes</button>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(message.text).then(() => setSaved("Copied")).catch(() => setSaved("Copy didn't work"))}>Copy</button>
                  {/^\d\. /m.test(message.text) ? message.text.split("\n").filter((line) => /^\d\. /.test(line)).map((line) => {
                    const title = line.replace(/^\d\. /, "").split(" — ")[0] ?? "Idea";
                    const body = line.split(" — ")[1] ?? line;
                    return (
                      <button key={line} type="button" onClick={() => { onSaveIdea({ title, body }); setSaved("Saved as a content idea"); }}>
                        Save “{title}”
                      </button>
                    );
                  }) : (
                    <button type="button" onClick={() => { onSaveIdea({ title: "From Brief", body: message.text }); setSaved("Saved as a content idea"); }}>Save as content idea</button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
          <div ref={end} />
        </div>
        {saved ? <p className="studio-notice" role="status">{saved}</p> : null}
        <form className="brief-compose" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
          <label className="visually-hidden" htmlFor="ask-brief">Ask Brief</label>
          <input id="ask-brief" value={draft} placeholder="Ask Brief..." onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" className="studio-button">Ask</button>
        </form>
      </section>
    </div>
  );
}
