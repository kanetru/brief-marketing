import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildBrandIntelligence } from "../../domain/brandIntelligence";
import { STARTER_WORKFLOWS, starterPrompt } from "../../domain/project/agentPack";
import { buildProjectIntelligence } from "../../domain/project/assemble";
import { nextAssetStatus } from "../../domain/project/assetRegister";
import { sharePath } from "../../domain/project/access";
import { useProjects } from "../../state/ProjectContext";
import type { AgentFile, AssetItem, UnderstandingField } from "../../types/project";

const PANELS = [
  ["overview", "Overview"],
  ["understanding", "Understanding"],
  ["competitors", "Competitors"],
  ["creative", "Creative"],
  ["opportunities", "Opportunities"],
  ["assets", "Assets"],
  ["questions", "Open questions"],
  ["pack", "Use in AI"],
] as const;

type Panel = (typeof PANELS)[number][0];

const KIND_LABEL: Record<UnderstandingField["kind"], string> = {
  fact: "Said",
  preference: "Preference",
  inference: "Brief's reading",
  hypothesis: "Hypothesis",
  recommendation: "Recommendation",
};

export function ProjectWorkspace() {
  const { projectId = "" } = useParams();
  const api = useProjects();
  const project = api.projects.find((item) => item.id === projectId) ?? null;
  const [panel, setPanel] = useState<Panel>("overview");
  const [notice, setNotice] = useState("");
  const intelligence = useMemo(
    () => (project ? buildProjectIntelligence(project, project.updatedAt) : null),
    [project],
  );
  const reading = useMemo(
    () => (project ? buildBrandIntelligence(project.discovery).reading : null),
    [project],
  );

  if (!project || !intelligence || !reading) {
    return (
      <main className="studio-denied">
        <h1>That project isn't on this machine.</h1>
        <Link to="/studio">All clients</Link>
      </main>
    );
  }

  const link = `${window.location.origin}${sharePath(project.shareToken)}`;
  const idea = intelligence.understanding.fields.find((field) => field.id === "brand.central_idea");

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(label);
    } catch {
      setNotice("Copy didn't work in this browser. Download the file instead.");
    }
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div>
          <p className="studio-kicker"><Link to="/studio">Clients</Link> · {project.status}</p>
          <h1>{project.businessName || "Untitled project"}</h1>
          <p className="studio-lead">{project.clientName || "Client not named"}{project.category ? ` · ${project.category}` : ""}</p>
        </div>
        <p className="studio-version">Version {project.version}</p>
      </header>
      <nav className="studio-nav" aria-label="Project">
        {PANELS.map(([id, label]) => (
          <button key={id} type="button" aria-current={panel === id ? "page" : undefined} onClick={() => setPanel(id)}>
            {label}
          </button>
        ))}
      </nav>
      {notice ? <p className="studio-notice">{notice}</p> : null}
      {panel === "overview" ? (
        <Overview
          projectId={project.id}
          link={link}
          progress={intelligence.discoveryProgress}
          idea={idea?.text ?? ""}
          website={project.website}
          category={project.category}
          clientName={project.clientName}
          businessName={project.businessName}
          notes={project.managerNotes}
          updatedAt={project.updatedAt}
          onCopy={() => void copy(link, "Discovery link copied.")}
          onDetails={(details) => api.setDetails(project.id, details)}
          onNotes={(notes) => api.setNotes(project.id, notes)}
        />
      ) : null}
      {panel === "understanding" ? (
        <Understanding
          fields={intelligence.understanding.fields}
          evidence={intelligence.evidence}
          onSave={(fieldId, text, status) => api.setOverride(project.id, { fieldId, text, status, updatedAt: new Date().toISOString() })}
        />
      ) : null}
      {panel === "competitors" ? (
        <Competitors
          profiles={intelligence.competitors}
          category={intelligence.category}
          count={project.competitors.length}
          onAdd={(competitor) => api.setCompetitor(project.id, competitor)}
          onRemove={(id) => api.removeCompetitor(project.id, id)}
        />
      ) : null}
      {panel === "creative" ? (
        <Creative reading={reading} reactions={project.discovery.territoryFeedback} />
      ) : null}
      {panel === "opportunities" ? <Opportunities items={intelligence.opportunities} /> : null}
      {panel === "assets" ? (
        <Assets
          items={intelligence.assets}
          onCycle={(asset) => api.setAssetState(project.id, asset.id, { status: nextAssetStatus(asset.status), owner: asset.owner, notes: asset.notes })}
        />
      ) : null}
      {panel === "questions" ? (
        <Questions questions={intelligence.openQuestions} contradictions={intelligence.contradictions} />
      ) : null}
      {panel === "pack" ? (
        <AgentPackPanel
          files={intelligence.agentPack.files}
          master={intelligence.agentPack.master}
          generatedAt={intelligence.generatedAt}
          version={intelligence.agentPack.projectVersion}
          onCopy={(text, label) => void copy(text, label)}
          onRegenerate={() => {
            api.regenerate(project.id);
            setNotice("Context rebuilt from the current project.");
          }}
        />
      ) : null}
    </div>
  );
}

function Overview({
  link,
  progress,
  idea,
  website,
  category,
  clientName,
  businessName,
  notes,
  updatedAt,
  onCopy,
  onDetails,
  onNotes,
}: {
  projectId: string;
  link: string;
  progress: number;
  idea: string;
  website: string;
  category: string;
  clientName: string;
  businessName: string;
  notes: string;
  updatedAt: string;
  onCopy: () => void;
  onDetails: (details: { clientName: string; businessName: string; website: string; category: string }) => void;
  onNotes: (notes: string) => void;
}) {
  const [draft, setDraft] = useState({ clientName, businessName, website, category });
  const [note, setNote] = useState(notes);
  return (
    <section className="studio-panel">
      <p className="studio-kicker">Discovery {progress}% complete</p>
      <h2>{idea || "The picture is still thin."}</h2>
      <p className="studio-meta">Updated {updatedAt.slice(0, 16).replace("T", " ")}</p>
      <div className="studio-share">
        <p className="studio-kicker">Client discovery link</p>
        <p className="studio-link">{link}</p>
        <button type="button" className="studio-button" onClick={onCopy}>Copy link</button>
      </div>
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          onDetails(draft);
        }}
      >
        <label>Client<input value={draft.clientName} onChange={(event) => setDraft({ ...draft, clientName: event.target.value })} /></label>
        <label>Business<input value={draft.businessName} onChange={(event) => setDraft({ ...draft, businessName: event.target.value })} /></label>
        <label>Website<input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} /></label>
        <label>Category<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
        <button type="submit" className="studio-button">Save details</button>
      </form>
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          onNotes(note);
        }}
      >
        <label>
          What you already know
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Kept separate from what the client said." />
        </label>
        <button type="submit" className="studio-button">Save note</button>
      </form>
    </section>
  );
}

function Understanding({
  fields,
  evidence,
  onSave,
}: {
  fields: UnderstandingField[];
  evidence: Array<{ id: string; text: string; kind: string; sourceType: string }>;
  onSave: (fieldId: string, text: string, status: "approved" | "edited" | "rejected") => void;
}) {
  const sections = ["company", "audience", "market", "brand", "strategy", "creative"] as const;
  return (
    <section className="studio-panel">
      {sections.map((section) => {
        const group = fields.filter((field) => field.section === section);
        if (group.length === 0) return null;
        return (
          <div key={section} className="studio-group">
            <h2>{section}</h2>
            {group.map((field) => (
              <FieldCard key={`${field.id}:${field.kind}`} field={field} evidence={evidence.filter((item) => field.evidenceIds.includes(item.id))} onSave={onSave} />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function FieldCard({
  field,
  evidence,
  onSave,
}: {
  field: UnderstandingField;
  evidence: Array<{ id: string; text: string; kind: string; sourceType: string }>;
  onSave: (fieldId: string, text: string, status: "approved" | "edited" | "rejected") => void;
}) {
  const [text, setText] = useState(field.text);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setText(field.text);
  }, [field.text]);
  return (
    <article className="studio-card">
      <p className="studio-kicker">{field.label} · {KIND_LABEL[field.kind]} · {field.confidence}</p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} />
      <div className="studio-row">
        <button type="button" className="studio-button" onClick={() => onSave(field.id, text, text.trim() === field.text.trim() ? "approved" : "edited")}>
          {text.trim() === field.text.trim() ? "Approve" : "Save edit"}
        </button>
        <button type="button" className="studio-text-button" onClick={() => onSave(field.id, field.text, "rejected")}>
          Use Brief's version
        </button>
        <button type="button" className="studio-text-button" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide evidence" : "Evidence"}
        </button>
      </div>
      {open ? (
        <ul className="studio-evidence">
          {evidence.length === 0 ? <li>No source is attached yet.</li> : null}
          {evidence.map((item) => (
            <li key={item.id}><span>{item.kind} · {item.sourceType}</span>{item.text}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function Competitors({
  profiles,
  category,
  count,
  onAdd,
  onRemove,
}: {
  profiles: ReturnType<typeof buildProjectIntelligence>["competitors"];
  category: ReturnType<typeof buildProjectIntelligence>["category"];
  count: number;
  onAdd: (competitor: { id: string; name: string; website: string; notes: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <section className="studio-panel">
      <h2>Competitors</h2>
      <p>Add three to ten. A URL alone is not research. Brief has not visited these sites.</p>
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() && !website.trim()) return;
          onAdd({ id: crypto.randomUUID(), name, website, notes });
          setName("");
          setWebsite("");
          setNotes("");
        }}
      >
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Website<input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></label>
        <label>What you've actually seen<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Only what you can stand behind." /></label>
        <button type="submit" className="studio-button" disabled={count >= 10}>Add competitor</button>
      </form>
      <div className="studio-cards">
        {profiles.map((profile) => (
          <article key={profile.id} className="studio-card" data-basis={profile.basis}>
            <p className="studio-kicker">{profile.basis === "unavailable" ? "Research unavailable" : "From your notes"}</p>
            <h3>{profile.name}</h3>
            {profile.website ? <p>{profile.website}</p> : null}
            {profile.basis === "unavailable" ? <p>{profile.unavailableReason}</p> : <p>{profile.apparentPositioning}</p>}
            <button type="button" className="studio-text-button" onClick={() => onRemove(profile.id)}>Remove</button>
          </article>
        ))}
      </div>
      <aside className="studio-card">
        <p className="studio-kicker">Category</p>
        {category ? (
          <>
            <p>{category.observation}</p>
            {category.avoidCopying.map((line) => <p key={line}>{line}</p>)}
            {category.clientDifference.map((line) => <p key={line}>{line}</p>)}
          </>
        ) : (
          <p>Category synthesis is unavailable until a competitor has notes, or a research provider is connected. Nothing here was inferred from a website.</p>
        )}
      </aside>
    </section>
  );
}

function Creative({
  reading,
  reactions,
}: {
  reading: NonNullable<ReturnType<typeof buildBrandIntelligence>["reading"]>;
  reactions: { reactions: Array<{ territoryId: string; response: string; note: string }>; preference: string | null };
}) {
  return (
    <section className="studio-panel">
      <p className="studio-kicker">{reading.source === "fallback" ? "Fallback reading" : "Strategist reading"}</p>
      <h2>{reading.hypothesis.centralIdea}</h2>
      <p>{reading.hypothesis.strategicOpportunity}</p>
      <div className="studio-cards">
        {reading.territories.map((territory) => {
          const reaction = reactions.reactions.find((item) => item.territoryId === territory.archetypeId);
          return (
            <article key={territory.archetypeId} className="studio-card">
              <h3>{territory.name}</h3>
              <p>{territory.idea}</p>
              <p className="studio-meta">Risk · {territory.risk}</p>
              <p className="studio-meta">Voice · {territory.voice.idea}</p>
              {reaction ? <p className="studio-meta">Client · {reaction.response}{reaction.note ? ` — ${reaction.note}` : ""}</p> : null}
            </article>
          );
        })}
      </div>
      {reactions.preference ? <p className="studio-meta">Preference · {reactions.preference}</p> : null}
    </section>
  );
}

function Opportunities({ items }: { items: ReturnType<typeof buildProjectIntelligence>["opportunities"] }) {
  return (
    <section className="studio-panel">
      <h2>What to do with this</h2>
      <div className="studio-cards">
        {items.map((item) => (
          <article key={item.id} className="studio-card">
            <p className="studio-kicker">{item.type} · {item.effort} effort · {item.confidence}</p>
            <h3>{item.title}</h3>
            <p>{item.why}</p>
            <p><strong>Do this. </strong>{item.action}</p>
            {item.impactHypothesis ? <p className="studio-meta">{item.impactHypothesis}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Assets({ items, onCycle }: { items: AssetItem[]; onCycle: (asset: AssetItem) => void }) {
  return (
    <section className="studio-panel">
      <h2>What to make</h2>
      <ol className="studio-assets">
        {items.map((asset) => (
          <li key={asset.id}>
            <div>
              <p className="studio-kicker">{asset.category} · {asset.priority}</p>
              <h3>{asset.name}</h3>
              <p>{asset.reason}</p>
              <p className="studio-meta">Needs · {asset.sourceMaterial}</p>
            </div>
            <button type="button" className="studio-button" onClick={() => onCycle(asset)}>{asset.status.replace("_", " ")}</button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Questions({
  questions,
  contradictions,
}: {
  questions: ReturnType<typeof buildProjectIntelligence>["openQuestions"];
  contradictions: ReturnType<typeof buildProjectIntelligence>["contradictions"];
}) {
  return (
    <section className="studio-panel">
      <h2>Still unresolved</h2>
      {contradictions.length > 0 ? (
        <ul className="studio-questions">
          {contradictions.map((item) => <li key={item.id}><strong>Contradiction. </strong>{item.statement}</li>)}
        </ul>
      ) : <p>No contradiction is strong enough to flag.</p>}
      <ul className="studio-questions">
        {questions.map((item) => (
          <li key={item.id}>
            {item.prompt}
            <span>{item.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AgentPackPanel({
  files,
  master,
  generatedAt,
  version,
  onCopy,
  onRegenerate,
}: {
  files: AgentFile[];
  master: AgentFile;
  generatedAt: string;
  version: number;
  onCopy: (text: string, label: string) => void;
  onRegenerate: () => void;
}) {
  const named = (name: string) => files.find((file) => file.name === name);
  return (
    <section className="studio-panel">
      <p className="studio-kicker">Use this client in AI · version {version}</p>
      <h2>Give another tool the picture, not the questionnaire.</h2>
      <p className="studio-meta">Built {generatedAt.slice(0, 16).replace("T", " ")}. It changes when the project changes.</p>
      <div className="studio-row">
        <button type="button" className="studio-button" onClick={() => onCopy(master.markdown, "Complete context copied.")}>Copy complete context</button>
        <button type="button" className="studio-button" onClick={() => downloadFile("agent-pack.md", [master, ...files].map((file) => `# ${file.name}\n\n${file.markdown}`).join("\n\n---\n\n"))}>Download context pack</button>
        <button type="button" className="studio-text-button" onClick={onRegenerate}>Regenerate from latest</button>
      </div>
      <div className="studio-row">
        <CopyChip label="Brand voice" file={named("04_voice.md")} onCopy={onCopy} />
        <CopyChip label="Content strategy" file={named("07_content_strategy.md")} onCopy={onCopy} />
        <CopyChip label="Visual direction" file={named("05_visual_direction.md")} onCopy={onCopy} />
        <CopyChip label="Competitor context" file={named("06_competitors.md")} onCopy={onCopy} />
      </div>
      <h3>Start a task</h3>
      <div className="studio-row">
        {STARTER_WORKFLOWS.map((workflow) => (
          <button key={workflow.id} type="button" className="studio-text-button" onClick={() => onCopy(starterPrompt(workflow.id, { generatedAt, projectVersion: version, files, master }), `${workflow.label} prompt copied.`)}>
            {workflow.label}
          </button>
        ))}
      </div>
      <ul className="studio-files">
        {[master, ...files].map((file) => (
          <li key={file.name}>
            <span>{file.title}</span>
            <button type="button" onClick={() => downloadFile(file.name, file.markdown)}>Download</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CopyChip({
  label,
  file,
  onCopy,
}: {
  label: string;
  file: AgentFile | undefined;
  onCopy: (text: string, label: string) => void;
}) {
  if (!file) return null;
  return (
    <button type="button" className="studio-text-button" onClick={() => onCopy(file.markdown, `${label} copied.`)}>
      {label}
    </button>
  );
}

function downloadFile(name: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
