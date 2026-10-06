import { useState } from "react";
import { ActionGroup } from "../../components/ActionGroup";
import { clientLogo } from "../../domain/workspace/clientLogo";
import { textValue } from "../../state/textEvidence";
import type { AssetCategory, BriefProject, ContentIdea, ContentIdeaStatus, LibraryAsset, WorkNote } from "../../types/project";

const IDEA_STATUS: Record<ContentIdeaStatus, string> = {
  idea: "Idea",
  in_progress: "In progress",
  done: "Done",
};

export function FilesPanel({
  assets,
  category,
  onAdd,
  onRemove,
}: {
  assets: LibraryAsset[];
  category?: "contracts" | "brand";
  onAdd: (asset: LibraryAsset) => void;
  onRemove: (id: string) => void;
}) {
  const shown = assets.filter((asset) => {
    if (category === "contracts") return asset.tags.includes("contract") || asset.category === "proof";
    if (category === "brand") return asset.category === "brand" || asset.tags.includes("brand");
    return true;
  });
  return (
    <section className="studio-panel" data-screen={category === "contracts" ? "contracts" : "files"}>
      <h2>{category === "contracts" ? "Contracts" : category === "brand" ? "Brand files" : "Files"}</h2>
      <FileForm category={category} onAdd={onAdd} />
      {shown.length === 0 ? <p>Nothing here yet.</p> : null}
      <ul className="studio-files">
        {shown.map((asset) => (
          <li key={asset.id}>
            <span>{asset.name}</span>
            <span className="studio-meta">{asset.category} · {asset.createdAt.slice(0, 10)}</span>
            {asset.fileRef ? <a href={asset.fileRef} download={asset.name}>Open</a> : null}
            <button type="button" onClick={() => onRemove(asset.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FileForm({ category, onAdd }: { category?: "contracts" | "brand"; onAdd: (asset: LibraryAsset) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AssetCategory>(category === "contracts" ? "proof" : category === "brand" ? "brand" : "content");
  const [fileRef, setFileRef] = useState("");
  const [fileName, setFileName] = useState("");
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault();
        const label = name.trim() || fileName;
        if (!label) return;
        const now = new Date().toISOString();
        onAdd({
          id: crypto.randomUUID(),
          name: label,
          category: kind,
          description: "",
          fileRef,
          tags: category === "contracts" ? ["contract"] : category === "brand" ? ["brand"] : [],
          notes: "",
          createdAt: now,
          updatedAt: now,
          approval: "unreviewed",
          relatedOpportunityId: null,
        });
        setName("");
        setFileRef("");
        setFileName("");
      }}
    >
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="2026 Social Media Agreement.pdf" /></label>
      {category ? null : (
        <label>
          Type
          <select value={kind} onChange={(event) => setKind(event.target.value as AssetCategory)}>
            <option value="brand">Brand</option>
            <option value="content">Content</option>
            <option value="photo_video">Photography</option>
            <option value="web">Web</option>
            <option value="proof">Contract</option>
          </select>
        </label>
      )}
      <label>
        File
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setFileName(file.name);
            if (!name.trim()) setName(file.name);
            const reader = new FileReader();
            reader.onload = () => setFileRef(typeof reader.result === "string" ? reader.result : "");
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <button type="submit" className="studio-button">Add file</button>
    </form>
  );
}

export function IdeasPanel({
  ideas,
  onChange,
}: {
  ideas: ContentIdea[];
  onChange: (ideas: ContentIdea[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="studio-panel" data-screen="content-ideas">
      <h2>Content ideas</h2>
      <button type="button" className="studio-button" onClick={() => setAdding((open) => !open)}>Add idea</button>
      {adding ? (
        <form
          className="studio-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onChange([{ id: crypto.randomUUID(), title: title.trim(), body: body.trim(), status: "idea", at: new Date().toISOString() }, ...ideas]);
            setTitle("");
            setBody("");
            setAdding(false);
          }}
        >
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Notes<textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button type="submit" className="studio-button">Save idea</button>
        </form>
      ) : null}
      {ideas.length === 0 ? <p>No ideas yet.</p> : null}
      <div className="card-grid">
        {ideas.map((idea) => (
          <article key={idea.id} className="surface-card">
            {editing === idea.id ? (
              <IdeaEditor
                idea={idea}
                onSave={(next) => {
                  onChange(ideas.map((item) => item.id === idea.id ? next : item));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <h3>{idea.title}</h3>
                {idea.body ? <p>{idea.body}</p> : null}
                <p className="studio-meta">Status {IDEA_STATUS[idea.status]}</p>
                <p className="studio-meta">Added {idea.at.slice(0, 10)}</p>
                <ActionGroup className="card-actions">
                  <button type="button" className="studio-button" onClick={() => setEditing(idea.id)}>Edit</button>
                  <button type="button" className="studio-text-button" onClick={() => onChange(ideas.filter((item) => item.id !== idea.id))}>Delete</button>
                </ActionGroup>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function IdeaEditor({ idea, onSave, onCancel }: { idea: ContentIdea; onSave: (idea: ContentIdea) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body);
  const [status, setStatus] = useState<ContentIdeaStatus>(idea.status);
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onSave({ ...idea, title: title.trim(), body: body.trim(), status });
      }}
    >
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Notes<textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <label>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value as ContentIdeaStatus)}>
          <option value="idea">Idea</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </label>
      <ActionGroup>
        <button type="submit" className="studio-button">Save</button>
        <button type="button" className="studio-text-button" onClick={onCancel}>Cancel</button>
      </ActionGroup>
    </form>
  );
}

export function NotesPanel({
  notes,
  legacy,
  onChange,
  onLegacy,
}: {
  notes: WorkNote[];
  legacy: string;
  onChange: (notes: WorkNote[]) => void;
  onLegacy: (text: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="studio-panel" data-screen="notes">
      <h2>Notes</h2>
      <button type="button" className="studio-button" onClick={() => setAdding((open) => !open)}>Add note</button>
      {adding ? (
        <form
          className="studio-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            onChange([{ id: crypto.randomUUID(), text: text.trim(), at: new Date().toISOString() }, ...notes]);
            setText("");
            setAdding(false);
          }}
        >
          <label>Note<textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} /></label>
          <button type="submit" className="studio-button">Save note</button>
        </form>
      ) : null}
      {legacy.trim() ? (
        <article className="surface-card">
          {editing === "legacy" ? (
            <NoteEditor text={legacy} onSave={(next) => { onLegacy(next); setEditing(null); }} onCancel={() => setEditing(null)} />
          ) : (
            <>
              <p>{legacy}</p>
              <ActionGroup className="card-actions">
                <button type="button" className="studio-button" onClick={() => setEditing("legacy")}>Edit</button>
                <button type="button" className="studio-text-button" onClick={() => onLegacy("")}>Delete</button>
              </ActionGroup>
            </>
          )}
        </article>
      ) : null}
      {notes.length === 0 && !legacy.trim() ? <p>No notes yet.</p> : null}
      <div className="card-grid">
        {notes.map((note) => (
          <article key={note.id} className="surface-card">
            {editing === note.id ? (
              <NoteEditor
                text={note.text}
                onSave={(next) => {
                  onChange(notes.map((item) => item.id === note.id ? { ...item, text: next } : item));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p>{note.text}</p>
                <p className="studio-meta">{note.at.slice(0, 10)}</p>
                <ActionGroup className="card-actions">
                  <button type="button" className="studio-button" onClick={() => setEditing(note.id)}>Edit</button>
                  <button type="button" className="studio-text-button" onClick={() => onChange(notes.filter((item) => item.id !== note.id))}>Delete</button>
                </ActionGroup>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function NoteEditor({ text, onSave, onCancel }: { text: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(text);
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft.trim());
      }}
    >
      <label>Note<textarea rows={4} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <ActionGroup>
        <button type="submit" className="studio-button">Save</button>
        <button type="button" className="studio-text-button" onClick={onCancel}>Cancel</button>
      </ActionGroup>
    </form>
  );
}

export function BrandReference({ project }: { project: BriefProject }) {
  const logo = clientLogo(project, "light");
  const voiceAnswer = project.discovery?.voicePreferences?.preferredLanguage;
  const voice = voiceAnswer ? textValue(voiceAnswer).trim() : "";
  const files = project.library.filter((asset) => asset.category === "brand" || asset.tags.includes("brand") || asset.tags.includes("logo"));
  return (
    <section className="studio-panel" data-screen="brand">
      <h2>Brand</h2>
      {logo ? <img className="client-logo" src={logo.src} alt="" /> : <p>No logo yet. Add one in Files.</p>}
      {project.website ? <p>{project.website}</p> : null}
      {voice ? (
        <>
          <h3>Voice</h3>
          <p>{voice}</p>
        </>
      ) : null}
      {files.length > 0 ? (
        <>
          <h3>Files</h3>
          <ul className="studio-files">
            {files.map((asset) => (
              <li key={asset.id}>
                <span>{asset.name}</span>
                {asset.fileRef ? <a href={asset.fileRef} download={asset.name}>Open</a> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
