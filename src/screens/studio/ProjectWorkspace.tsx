import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { buildBrandIntelligence } from "../../domain/brandIntelligence";
import { STARTER_WORKFLOWS, starterPrompt } from "../../domain/project/agentPack";
import { adaptiveFollowUps } from "../../domain/project/adaptiveQuestions";
import { attentionLine } from "../../domain/project/attention";
import { buildProjectIntelligence } from "../../domain/project/assemble";
import { nextAssetStatus } from "../../domain/project/assetRegister";
import { sharePath } from "../../domain/project/access";
import { describeClientSite } from "../../domain/project/research/compare";
import { requestSiteResearch } from "../../services/researchClient";
import { useProjects } from "../../state/ProjectContext";
import type { AgentFile, AssetCategory, AssetItem, BriefProject, CategoryPattern, DiscoveryStatus, ProjectIntelligence, ResearchTension, SourceQuote, UnderstandingField } from "../../types/project";

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

interface ResearchRun {
  status: "reading" | "complete";
  label: string;
  pages: string[];
  competitorsResearched: number;
}

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
  const [researchRun, setResearchRun] = useState<ResearchRun | null>(null);
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
          <LoverLoverLogo kind="secondary" color="choc" className="studio-logo" alt="Lover Lover" />
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
          tensions={intelligence.tensions}
          evidence={intelligence.evidence}
          opportunities={intelligence.opportunities}
          run={researchRun}
          onAdd={(competitor) => api.setCompetitor(project.id, competitor)}
          onRemove={(id) => api.removeCompetitor(project.id, id)}
          onResearch={async () => {
            const pages: string[] = [];
            let competitorsResearched = 0;
            const targets = project.competitors.filter((item) => item.website.trim()).slice(0, 10);
            if (project.website) {
              setResearchRun({ status: "reading", label: project.businessName, pages: [], competitorsResearched: 0 });
              const research = await requestSiteResearch(project.website, project.businessName);
              api.setWebsiteResearch(project.id, research);
              for (const item of research.site?.pages ?? []) pages.push(item.label);
            }
            for (const competitor of targets) {
              setResearchRun({ status: "reading", label: competitor.name, pages: [...pages], competitorsResearched });
              const research = await requestSiteResearch(competitor.website, competitor.name);
              api.setCompetitorResearch(project.id, competitor.id, research);
              if ((research.site?.pages.length ?? 0) > 0) {
                competitorsResearched += 1;
                for (const item of research.site?.pages ?? []) pages.push(`${competitor.name} · ${item.label}`);
              }
            }
            setResearchRun({ status: "complete", label: project.businessName, pages, competitorsResearched });
            setNotice(pages.length > 0 ? "Research is now evidence. Published copy is not a fact about the business." : "Research is unavailable.");
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
  tensions,
  evidence,
  opportunities,
  run,
  onAdd,
  onRemove,
  onResearch,
}: {
  project: BriefProject;
  profiles: ProjectIntelligence["competitors"];
  category: ProjectIntelligence["category"];
  tensions: ResearchTension[];
  evidence: ProjectIntelligence["evidence"];
  opportunities: ProjectIntelligence["opportunities"];
  run: ResearchRun | null;
  onAdd: (competitor: { id: string; name: string; website: string; notes: string }) => void;
  onRemove: (id: string) => void;
  onResearch: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const site = project.websiteResearch?.site;
  const reading = site ? describeClientSite(site) : null;
  const canResearch = Boolean(project.website) || project.competitors.some((item) => item.website.trim());
  const storedPages = [
    ...(site?.pages.map((page) => page.label) ?? []),
    ...project.competitors.flatMap((item) => (project.competitorResearch?.[item.id]?.site?.pages ?? []).map((page) => `${item.name} · ${page.label}`)),
  ];
  const published = evidence.filter((item) => item.claimScope === "published_copy").length;
  const researchOpportunities = opportunities.filter((item) => item.id === "opp-making" || item.id === "opp-longevity" || (item.marketEvidence?.length ?? 0) > 0).length;
  return (
    <section className="studio-panel">
      <h2>Market</h2>
      <p>Brief compares the client's discovery, the client's site, and the competitor pages it actually read.</p>
      {category ? (
        <div className="studio-cards">
          <p className="studio-kicker">The market · {category.basis === "research" ? "retrieved pages" : "notes only"}</p>
          <p>{category.observation}</p>
          {PATTERN_GROUPS.map((group) => {
            const items = category.patterns.filter((pattern) => group.types.includes(pattern.patternType ?? "") || group.titles.includes(pattern.title));
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                <h3>{group.title}</h3>
                {items.map((pattern) => (
                  <PatternCard key={pattern.id} pattern={pattern} evidence={evidence} open={openId === pattern.id} onToggle={() => setOpenId(openId === pattern.id ? null : pattern.id)} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p>Category synthesis is unavailable until at least one competitor has notes or a retrieved page.</p>
      )}
      <article className="studio-card">
        <p className="studio-kicker">{run?.status === "reading" ? "Reading the market" : run?.status === "complete" ? "Something is taking shape" : storedPages.length > 0 ? "Research on record" : "Research"}</p>
        {run?.status === "reading" && run.label ? <p>{run.label}</p> : null}
        <ul className="studio-evidence">
          {(run ? run.pages : storedPages).map((page) => <li key={page}>✓ {page}</li>)}
        </ul>
        {run?.status === "complete" || (!run && storedPages.length > 0) ? (
          <p className="studio-meta">
            {(run?.status === "complete" ? run.pages.length : storedPages.length)} pages read
            {" · "}{(run?.status === "complete" ? run.competitorsResearched : profiles.filter((item) => item.basis === "research").length)} competitors researched
            {" · "}{published} evidence items
            {" · "}{category?.patterns.length ?? 0} category patterns
            {" · "}{researchOpportunities} opportunities
          </p>
        ) : null}
        <button type="button" className="studio-button" disabled={!canResearch || run?.status === "reading"} onClick={() => void onResearch()}>Research</button>
      </article>
      <article className="studio-card">
        <p className="studio-kicker">Client website</p>
        {site && reading ? (
          <>
            <h3>{site.positioning || "No headline"}</h3>
            <p>{reading.says}</p>
            {site.offers.length > 0 ? <p>Offer · {site.offers.join(", ")}</p> : null}
            {site.audienceSignals.length > 0 ? <p>Audience on the page · {site.audienceSignals.join(", ")}</p> : <p className="studio-meta">Audience was not named. Brief left it blank.</p>}
            {site.claims.length > 0 ? <p>Claims · {site.claims.join("; ")}</p> : null}
            {site.callsToAction.length > 0 ? <p>Primary ask · {site.callsToAction[0]}</p> : null}
            {site.proof.length > 0 ? <p>Proof · {site.proof.join(" ")}</p> : <p className="studio-meta">No concrete proof line on the pages read.</p>}
            {reading.emphasises.length > 0 ? <p>Emphasises · {reading.emphasises.join(", ")}</p> : null}
            {site.unansweredQuestions.map((line) => <p key={line} className="studio-meta">{line}</p>)}
            {site.researchLimitations.map((line) => <p key={line} className="studio-meta">{line}</p>)}
          </>
        ) : (
          <p>{project.websiteResearch?.unavailableReason || "Not read yet. A URL is not a fact about the business."}</p>
        )}
      </article>
      {tensions.length > 0 ? (
        <div className="studio-cards">
          <h3>Tensions with this client</h3>
          {tensions.map((item) => (
            <article key={item.id} className="studio-card">
              <p className="studio-kicker">{item.kind.replaceAll("_", " ")} · hypothesis</p>
              <h3>{item.title}</h3>
              <p>{item.statement}</p>
              <EvidenceToggle
                id={item.id}
                title={item.title}
                quotes={item.quotes}
                evidenceIds={item.evidenceIds}
                evidence={evidence}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            </article>
          ))}
        </div>
      ) : null}
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
        <h3>Competitors</h3>
        {profiles.map((profile) => {
          const researched = project.competitorResearch?.[profile.id]?.site;
          return (
            <article key={profile.id} className="studio-card" data-basis={profile.basis}>
              <p className="studio-kicker">{profile.basis === "unavailable" ? "Research unavailable" : profile.basis === "research" ? "Retrieved pages" : "From your notes"}</p>
              <h3>{profile.name}</h3>
              {profile.website ? <p>{profile.website}</p> : null}
              {researched ? <p className="studio-meta">{researched.pages.length} pages read · {researched.researchedAt.slice(0, 10)}</p> : null}
              {profile.basis === "unavailable" ? <p>{profile.unavailableReason}</p> : null}
              {profile.headline ? <p>{profile.headline}</p> : null}
              {profile.basis !== "unavailable" && profile.apparentPositioning ? <p>{profile.apparentPositioning}</p> : null}
              {profile.offer ? <p>Offer · {profile.offer}</p> : null}
              {profile.audience ? <p>Audience · {profile.audience}</p> : null}
              {profile.basis === "research" && !profile.audience ? <p className="studio-meta">Audience was not on the pages read. Brief left it blank.</p> : null}
              {profile.proof ? <p>Proof · {profile.proof}</p> : null}
              {profile.callsToAction ? <p>Ask · {profile.callsToAction}</p> : null}
              {profile.tone ? <p>{profile.tone}</p> : null}
              {profile.contentThemes ? <p>{profile.contentThemes}</p> : null}
              {profile.basis === "research" ? <p className="studio-meta">Visual research is limited. The pictures were not read.</p> : null}
              <div className="studio-row">
                <button type="button" className="studio-text-button" onClick={() => onRemove(profile.id)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const PATTERN_GROUPS: Array<{ title: string; types: string[]; titles: string[] }> = [
  { title: "What everyone does", types: ["common_claim", "common_offer", "audience_pattern", "content_pattern", "cta_pattern"], titles: ["Category pattern", "Visual pattern"] },
  { title: "Where they differ", types: ["differentiation_signal"], titles: [] },
  { title: "Category language", types: ["category_cliche", "common_language"], titles: ["Language pattern"] },
  { title: "Proof", types: ["proof_pattern"], titles: [] },
  { title: "White space", types: ["whitespace_hypothesis", "underused_theme"], titles: ["White space"] },
];

function PatternCard({
  pattern,
  evidence,
  open,
  onToggle,
}: {
  pattern: CategoryPattern;
  evidence: ProjectIntelligence["evidence"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="studio-card">
      <p className="studio-kicker">{pattern.patternType?.replaceAll("_", " ") ?? pattern.title} · {pattern.epistemicStatus} · {pattern.prevalence ?? `${pattern.count} of ${pattern.total}`}</p>
      <h3>{pattern.title}</h3>
      <p>{pattern.statement}</p>
      {pattern.implication ? <p className="studio-meta">{pattern.implication}</p> : null}
      <EvidenceToggle id={pattern.id} title={pattern.title} quotes={pattern.quotes ?? []} evidenceIds={pattern.evidenceIds} evidence={evidence} open={open} onToggle={onToggle} />
    </article>
  );
}

function EvidenceToggle({
  title,
  quotes,
  evidenceIds,
  evidence,
  open,
  onToggle,
}: {
  id: string;
  title: string;
  quotes: SourceQuote[];
  evidenceIds: string[];
  evidence: ProjectIntelligence["evidence"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button type="button" className="studio-text-button" onClick={onToggle}>{open ? "Hide evidence" : "View evidence"}</button>
      {open ? (
        <div className="studio-evidence">
          <p className="studio-kicker">{title}</p>
          <p>Supported by</p>
          {quotes.map((quote) => (
            <blockquote key={`${quote.who}-${quote.page}-${quote.text}`}>
              <p className="studio-kicker">{quote.who}</p>
              <p>{quote.page}</p>
              <p>“{quote.text}”</p>
              {quote.url ? <p className="studio-meta">{quote.url}</p> : null}
            </blockquote>
          ))}
          {quotes.length === 0 ? evidenceIds.map((id) => {
            const record = evidence.find((item) => item.id === id);
            return <p key={id}><span>{record?.claimScope === "published_copy" ? "published copy" : record?.epistemicStatus ?? "source"}</span> {record?.text ?? id}</p>;
          }) : null}
        </div>
      ) : null}
    </>
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
            <p>{item.observation || item.why}</p>
            {item.hypothesis ? <p><strong>Hypothesis. </strong>{item.hypothesis}</p> : null}
            {item.observation && item.why !== item.observation ? <p>{item.why}</p> : null}
            <p><strong>Try. </strong>{item.action}</p>
            {item.requiredAssets && item.requiredAssets.length > 0 ? <p className="studio-meta">Requires · {item.requiredAssets.join(", ")}</p> : null}
            {item.impactHypothesis ? <p className="studio-meta">{item.impactHypothesis}</p> : null}
            <ul className="studio-evidence">
              {item.evidenceIds.map((id) => {
                const record = evidence.find((entry) => entry.id === id);
                return record ? <li key={id}><span>{record.claimScope === "published_copy" ? "published copy" : record.epistemicStatus}</span><p>{record.text}</p></li> : null;
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
                <p className="studio-kicker">{priority} · {asset.category === "photo_video" ? "photo" : asset.category}</p>
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
              <span>{asset.fileRef && asset.fileRef !== asset.name ? `${asset.name} · ${asset.fileRef}` : asset.name}</span>
              <em>{asset.category === "photo_video" ? "Photo" : asset.category}</em>
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
