import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildBrandIntelligence } from "../../domain/brandIntelligence";
import { STARTER_WORKFLOWS, starterPrompt } from "../../domain/project/agentPack";
import { adaptiveFollowUps } from "../../domain/project/adaptiveQuestions";
import { attentionLine } from "../../domain/project/attention";
import { buildProjectIntelligence } from "../../domain/project/assemble";
import { nextAssetStatus } from "../../domain/project/assetRegister";
import { sharePath } from "../../domain/project/access";
import { requestPageResearch } from "../../services/researchClient";
import { useProjects } from "../../state/ProjectContext";
import type { AgentFile, AssetCategory, AssetItem, BriefProject, DiscoveryStatus, ProjectIntelligence, UnderstandingField } from "../../types/project";

const PANELS = [
  ["overview", "Overview"],
  ["understanding", "Understanding"],
  ["market", "Market"],
  ["creative", "Creative"],
  ["opportunities", "Opportunities"],
  ["assets", "Assets"],
  ["discovery", "Discovery"],
  ["pack", "Use in AI"],
] as const;

const DISCOVERY_LABEL: Record<DiscoveryStatus, string> = {
  draft: "Not sent",
  invited: "Waiting for the client",
  opened: "Client opened it",
  in_progress: "Discovery in progress",
  submitted: "Discovery complete",
  follow_up_requested: "Follow-up with the client",
  follow_up_complete: "Follow-up complete",
  closed: "Closed",
};

type Panel = (typeof PANELS)[number][0];

const KIND_LABEL: Record<UnderstandingField["kind"], string> = {
  fact: "Fact",
  preference: "Preference",
  inference: "Inference",
  hypothesis: "Hypothesis",
  recommendation: "Recommendation",
};

function fieldMark(field: UnderstandingField): string {
  if (field.decisionStatus === "approved" && field.epistemicStatus !== "fact") return "Approved direction";
  return KIND_LABEL[field.epistemicStatus];
}

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
  const worth = [
    attentionLine(project, intelligence),
    intelligence.contradictions[0]?.statement,
    intelligence.openQuestions[0]?.prompt,
  ].filter((line): line is string => Boolean(line)).slice(0, 3);

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
          <p className="studio-kicker"><Link to="/studio">Clients</Link> · {DISCOVERY_LABEL[project.discoveryStatus]}</p>
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
          project={project}
          intelligence={intelligence}
          idea={idea?.text ?? ""}
          worth={worth}
          onOpen={setPanel}
        />
      ) : null}
      {panel === "understanding" ? (
        <Understanding
          fields={intelligence.understanding.fields}
          evidence={intelligence.evidence}
          onSave={(fieldId, text, status) => api.setOverride(project.id, { fieldId, text, status, updatedAt: new Date().toISOString() })}
        />
      ) : null}
      {panel === "market" ? (
        <Market
          project={project}
          profiles={intelligence.competitors}
          category={intelligence.category}
          evidence={intelligence.evidence}
          onAdd={(competitor) => api.setCompetitor(project.id, competitor)}
          onRemove={(id) => api.removeCompetitor(project.id, id)}
          onResearch={async (competitorId, url) => {
            setNotice("Reading the page…");
            const research = await requestPageResearch(url);
            api.setCompetitorResearch(project.id, competitorId, research);
            setNotice(research.observation ? "What that site says is now evidence." : research.unavailableReason || "Research unavailable.");
          }}
          onReadSite={async () => {
            if (!project.website) return;
            setNotice("Reading the client site…");
            const research = await requestPageResearch(project.website);
            api.setWebsiteResearch(project.id, research);
            setNotice(research.observation ? "What the client site says is now evidence. It is not a fact about the business." : research.unavailableReason || "Research unavailable.");
          }}
        />
      ) : null}
      {panel === "creative" ? (
        <Creative reading={reading} reactions={project.discovery.territoryFeedback} />
      ) : null}
      {panel === "opportunities" ? <Opportunities items={intelligence.opportunities} evidence={intelligence.evidence} /> : null}
      {panel === "assets" ? (
        <Assets
          items={intelligence.assets}
          library={intelligence.library}
          onCycle={(asset) => api.setAssetState(project.id, asset.id, { status: nextAssetStatus(asset.status), owner: asset.owner, notes: asset.notes })}
          onAddLibrary={(asset) => api.addLibraryAsset(project.id, asset)}
        />
      ) : null}
      {panel === "discovery" ? (
        <DiscoveryPanel
          project={project}
          link={link}
          onCopy={() => void copy(link, "Discovery link copied.")}
          onSend={() => {
            api.sendDiscovery(project.id);
            setNotice("Discovery link is ready. The client can finish it. They cannot open this workspace.");
          }}
          onFollowUp={(prompts) => {
            api.requestFollowUp(project.id, prompts);
            setNotice("Follow-up is limited to those questions. The same link now opens only that.");
          }}
          onDetails={(details) => api.setDetails(project.id, details)}
          onNotes={(notes) => api.setNotes(project.id, notes)}
        />
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
  project,
  intelligence,
  idea,
  worth,
  onOpen,
}: {
  project: BriefProject;
  intelligence: ProjectIntelligence;
  idea: string;
  worth: string[];
  onOpen: (panel: Panel) => void;
}) {
  const interesting = intelligence.category?.patterns.slice(0, 3) ?? [];
  const facts = intelligence.understanding.fields.filter((field) => field.epistemicStatus === "fact").slice(0, 2);
  const unknown = intelligence.openQuestions.slice(0, 3);
  const moves = intelligence.opportunities.slice(0, 3);
  const strength = intelligence.discoveryProgress >= 80 ? "a strong working understanding" : intelligence.discoveryProgress >= 40 ? "a working understanding, with gaps still open" : "a thin picture so far";
  return (
    <section className="studio-panel">
      <p className="studio-kicker">The read</p>
      <h2>{idea || "The picture is still thin."}</h2>
      <p>Brief has {strength} of {project.businessName || "this business"}.</p>
      {worth.length > 0 ? (
        <div>
          <p className="studio-kicker">{worth.length} {worth.length === 1 ? "thing" : "things"} worth your attention</p>
          <ul className="studio-questions">
            {worth.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      ) : null}
      <div>
        <p className="studio-kicker">What's interesting</p>
        <div className="studio-cards">
          {interesting.map((pattern) => (
            <article key={pattern.id} className="studio-card">
              <p className="studio-kicker">{pattern.title} · hypothesis</p>
              <p>{pattern.statement}</p>
            </article>
          ))}
          {facts.map((field) => (
            <article key={field.id} className="studio-card">
              <p className="studio-kicker">{field.label} · fact</p>
              <p>{field.text}</p>
            </article>
          ))}
          {interesting.length === 0 && facts.length === 0 ? <p>Nothing strong enough to surface yet.</p> : null}
        </div>
      </div>
      <div>
        <p className="studio-kicker">Opportunities</p>
        <div className="studio-cards">
          {moves.map((item) => (
            <article key={item.id} className="studio-card">
              <h3>{item.title}</h3>
              <p>{item.why}</p>
            </article>
          ))}
        </div>
        <button type="button" className="studio-text-button" onClick={() => onOpen("opportunities")}>All opportunities</button>
      </div>
      <div>
        <p className="studio-kicker">What we don't know</p>
        {unknown.length === 0 ? <p>Nothing unresolved is strong enough to list.</p> : (
          <ul className="studio-questions">
            {unknown.map((item) => <li key={item.id}>{item.prompt}</li>)}
          </ul>
        )}
      </div>
      {project.websiteResearch?.observation ? (
        <article className="studio-card">
          <p className="studio-kicker">What the site says · published copy</p>
          <p>{project.websiteResearch.observation.headline}</p>
        </article>
      ) : null}
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
  const sections = ["business", "audience", "market", "brand", "marketing", "creative"] as const;
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
      <p className="studio-kicker">{field.label} · {fieldMark(field)} · {field.confidence}</p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} />
      <div className="studio-row">
        <button type="button" className="studio-button" onClick={() => onSave(field.id, text, text.trim() === field.text.trim() ? "approved" : "edited")}>
          {text.trim() === field.text.trim() ? "Approve direction" : "Save edit"}
        </button>
        {field.epistemicStatus !== "fact" ? <p className="studio-meta">Approving keeps this as a {field.epistemicStatus}. It does not become a fact.</p> : null}
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

function Market({
  project,
  profiles,
  category,
  evidence,
  onAdd,
  onRemove,
  onResearch,
  onReadSite,
}: {
  project: BriefProject;
  profiles: ProjectIntelligence["competitors"];
  category: ProjectIntelligence["category"];
  evidence: ProjectIntelligence["evidence"];
  onAdd: (competitor: { id: string; name: string; website: string; notes: string }) => void;
  onRemove: (id: string) => void;
  onResearch: (competitorId: string, url: string) => Promise<void>;
  onReadSite: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [openPattern, setOpenPattern] = useState<string | null>(null);
  const site = project.websiteResearch?.observation;
  return (
    <section className="studio-panel">
      <h2>Market</h2>
      <p>Patterns matter more than individual competitor reports. Empty fields stay empty.</p>
      <article className="studio-card">
        <p className="studio-kicker">Client website</p>
        {site ? (
          <>
            <h3>{site.headline || "No headline"}</h3>
            <p>{site.description || site.excerpt}</p>
            <p className="studio-meta">Published copy · {site.url} · {site.retrievedAt.slice(0, 10)}</p>
          </>
        ) : (
          <p>{project.websiteResearch?.unavailableReason || "Not read yet. A URL is not a fact about the business."}</p>
        )}
        <button type="button" className="studio-button" disabled={!project.website} onClick={() => void onReadSite()}>Read the client site</button>
      </article>
      {category ? (
        <div className="studio-cards">
          <p className="studio-kicker">Category intelligence · {category.basis === "research" ? "retrieved pages" : "notes only"}</p>
          <p>{category.observation}</p>
          {category.patterns.map((pattern) => (
            <article key={pattern.id} className="studio-card">
              <p className="studio-kicker">{pattern.title} · {pattern.epistemicStatus} · {pattern.count} of {pattern.total}</p>
              <h3>{pattern.title === "White space" ? "What might this mean?" : pattern.title}</h3>
              <p>{pattern.statement}</p>
              <button type="button" className="studio-text-button" onClick={() => setOpenPattern(openPattern === pattern.id ? null : pattern.id)}>
                {openPattern === pattern.id ? "Hide evidence" : "View evidence"}
              </button>
              {openPattern === pattern.id ? (
                <ul className="studio-evidence">
                  {pattern.evidenceIds.map((id) => {
                    const record = evidence.find((item) => item.id === id);
                    return <li key={id}><span>{record?.claimScope === "published_copy" ? "published copy" : record?.epistemicStatus ?? "source"}</span>{record?.text ?? id}</li>;
                  })}
                </ul>
              ) : null}
            </article>
          ))}
          {category.patterns.length === 0 ? <p>No pattern repeats across the sources on record.</p> : null}
        </div>
      ) : (
        <p>Category synthesis is unavailable until at least one competitor has notes or a retrieved page.</p>
      )}
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
        <button type="submit" className="studio-button" disabled={project.competitors.length >= 10}>Add competitor</button>
      </form>
      <div className="studio-cards">
        {profiles.map((profile) => (
          <article key={profile.id} className="studio-card" data-basis={profile.basis}>
            <p className="studio-kicker">{profile.basis === "unavailable" ? "Research unavailable" : profile.basis === "research" ? "Retrieved page" : "From your notes"}</p>
            <h3>{profile.name}</h3>
            {profile.website ? <p>{profile.website}</p> : null}
            {profile.basis === "unavailable" ? <p>{profile.unavailableReason}</p> : null}
            {profile.headline ? <p>{profile.headline}</p> : null}
            {profile.basis !== "unavailable" ? <p>{profile.apparentPositioning}</p> : null}
            {profile.basis === "research" && !profile.audience ? <p className="studio-meta">Audience was not on the page. Brief left it blank.</p> : null}
            <div className="studio-row">
              {profile.website ? <button type="button" className="studio-text-button" onClick={() => void onResearch(profile.id, profile.website)}>Read this page</button> : null}
              <button type="button" className="studio-text-button" onClick={() => onRemove(profile.id)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
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

function Opportunities({ items, evidence }: { items: ProjectIntelligence["opportunities"]; evidence: ProjectIntelligence["evidence"] }) {
  return (
    <section className="studio-panel">
      <h2>What you could do</h2>
      <div className="studio-cards">
        {items.map((item) => (
          <article key={item.id} className="studio-card">
            <p className="studio-kicker">{item.type} · {item.effort} effort · {item.confidence}</p>
            <h3>{item.title}</h3>
            <p>{item.why}</p>
            <p><strong>Try. </strong>{item.action}</p>
            {item.impactHypothesis ? <p className="studio-meta">{item.impactHypothesis}</p> : null}
            <ul className="studio-evidence">
              {item.evidenceIds.map((id) => {
                const record = evidence.find((entry) => entry.id === id);
                return record ? <li key={id}><span>{record.claimScope === "published_copy" ? "published copy" : record.epistemicStatus}</span>{record.text}</li> : null;
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function Assets({
  items,
  library,
  onCycle,
  onAddLibrary,
}: {
  items: AssetItem[];
  library: ProjectIntelligence["library"];
  onCycle: (asset: AssetItem) => void;
  onAddLibrary: (asset: ProjectIntelligence["library"][number]) => void;
}) {
  const [name, setName] = useState("");
  const [fileRef, setFileRef] = useState("");
  const [category, setCategory] = useState<AssetCategory>("photo_video");
  return (
    <section className="studio-panel">
      <h2>What should exist</h2>
      <p>The register is the work that still needs making. It is not a list of files.</p>
      <ol className="studio-assets">
        {(["now", "soon", "later"] as const).map((priority) => (
          items.filter((asset) => asset.priority === priority).map((asset) => (
            <li key={asset.id}>
              <div>
                <p className="studio-kicker">{priority} · {asset.category}</p>
                <h3>{asset.name}</h3>
                <p>{asset.reason}</p>
                <p className="studio-meta">Needs · {asset.sourceMaterial}</p>
              </div>
              <button type="button" className="studio-button" onClick={() => onCycle(asset)}>{asset.status.replace("_", " ")}</button>
            </li>
          ))
        ))}
      </ol>
      <h2>What you have</h2>
      <p>Files and references already in hand. Storage here is a note, not a library system.</p>
      {library.length === 0 ? <p>Nothing is on file yet.</p> : (
        <ul className="studio-files">
          {library.map((asset) => (
            <li key={asset.id}>
              <span>{asset.name}{asset.fileRef ? ` · ${asset.fileRef}` : ""}</span>
              <em>{asset.category}</em>
            </li>
          ))}
        </ul>
      )}
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const now = new Date().toISOString();
          onAddLibrary({
            id: crypto.randomUUID(),
            name: name.trim(),
            category,
            description: "",
            fileRef: fileRef.trim(),
            tags: [],
            notes: "",
            createdAt: now,
            updatedAt: now,
            approval: "unreviewed",
            relatedOpportunityId: null,
          });
          setName("");
          setFileRef("");
        }}
      >
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="founder interview transcript" /></label>
        <label>File or reference<input value={fileRef} onChange={(event) => setFileRef(event.target.value)} placeholder="workshop-joint-01.jpg" /></label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
            <option value="photo_video">Photo or video</option>
            <option value="brand">Brand</option>
            <option value="web">Web</option>
            <option value="content">Content</option>
            <option value="proof">Proof</option>
          </select>
        </label>
        <button type="submit" className="studio-button">Add to the library</button>
      </form>
    </section>
  );
}

function DiscoveryPanel({
  project,
  link,
  onCopy,
  onSend,
  onFollowUp,
  onDetails,
  onNotes,
}: {
  project: BriefProject;
  link: string;
  onCopy: () => void;
  onSend: () => void;
  onFollowUp: (prompts: Array<{ id: string; prompt: string }>) => void;
  onDetails: (details: { clientName: string; businessName: string; website: string; category: string }) => void;
  onNotes: (notes: string) => void;
}) {
  const [draft, setDraft] = useState({ clientName: project.clientName, businessName: project.businessName, website: project.website, category: project.category });
  const [note, setNote] = useState(project.managerNotes);
  const [custom, setCustom] = useState("");
  const suggested = adaptiveFollowUps(project.discovery, project.followUps).filter((item) => !item.answer.trim()).slice(0, 5);
  return (
    <section className="studio-panel">
      <p className="studio-kicker">{DISCOVERY_LABEL[project.discoveryStatus]}</p>
      <h2>The client teaches Brief. You keep the intelligence.</h2>
      <div className="studio-share">
        <p className="studio-link">{link}</p>
        <div className="studio-row">
          <button type="button" className="studio-button" onClick={onCopy}>Copy link</button>
          {project.discoveryStatus === "draft" ? <button type="button" className="studio-button" onClick={onSend}>Send discovery</button> : null}
        </div>
      </div>
      <form
        className="studio-form"
        onSubmit={(event) => {
          event.preventDefault();
          const prompts = suggested.map((item) => ({ id: item.id, prompt: item.prompt }));
          if (custom.trim()) prompts.push({ id: crypto.randomUUID(), prompt: custom.trim() });
          onFollowUp(prompts.slice(0, 5));
          setCustom("");
        }}
      >
        <p className="studio-kicker">Ask for more</p>
        <p>This reopens the same link onto these questions only.</p>
        {suggested.map((item) => <p key={item.id}>{item.prompt}</p>)}
        <label>
          Or one question of your own
          <textarea value={custom} onChange={(event) => setCustom(event.target.value)} rows={3} />
        </label>
        <button type="submit" className="studio-button" disabled={suggested.length === 0 && !custom.trim()}>Request follow-up</button>
      </form>
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
      <div>
        <p className="studio-kicker">How the understanding moved</p>
        <ul className="studio-questions">
          {[...project.history].reverse().map((event) => (
            <li key={`${event.version}-${event.kind}`}>
              {event.note || event.kind}
              <span>Version {event.version}</span>
            </li>
          ))}
        </ul>
      </div>
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
      <h2>Use this client anywhere.</h2>
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
