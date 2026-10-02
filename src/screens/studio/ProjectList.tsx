import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { DEMO_ACCOUNT } from "../../domain/project/account";
import { attentionLine, needsAttention } from "../../domain/project/attention";
import { buildProjectIntelligence } from "../../domain/project/assemble";
import { organicFixture } from "../../fixtures/brandFixtures";
import { useProjects } from "../../state/ProjectContext";
import type { BriefProject, DiscoveryStatus } from "../../types/project";

const STATUS: Record<DiscoveryStatus, string> = {
  draft: "Not sent",
  invited: "Waiting for the client",
  opened: "Client opened discovery",
  in_progress: "Discovery in progress",
  submitted: "Discovery complete",
  follow_up_requested: "Follow-up with the client",
  follow_up_complete: "Follow-up complete",
  closed: "Closed",
};

export function ProjectList() {
  const { projects, create } = useProjects();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const ranked = useMemo(() => {
    return [...projects].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)));
  }, [projects]);
  const attention = projects.filter(needsAttention).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function openNew(event: FormEvent) {
    event.preventDefault();
    const project = create({ clientName, businessName, website, category });
    navigate(`/studio/${project.id}`);
  }

  function openExample() {
    const discovery = organicFixture();
    discovery.progress = { ...discovery.progress, section: "complete", furthest: "complete" };
    const project = create({
      clientName: "North Workshop",
      businessName: "North Workshop",
      website: "",
      category: "Furniture",
      discovery,
      discoveryStatus: "submitted",
    });
    navigate(`/studio/${project.id}`);
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div>
          <LoverLoverLogo kind="secondary" color="choc" className="studio-logo" alt="Lover Lover" />
          <p className="studio-kicker">{DEMO_ACCOUNT.workspaceName}</p>
          <h1>{greeting}, {DEMO_ACCOUNT.name.split(" ")[0]}.</h1>
          <p className="studio-lead">
            {projects.length} {projects.length === 1 ? "client" : "clients"}. {attention} {attention === 1 ? "needs" : "need"} attention.
          </p>
        </div>
        <Link to="/demo/start">Preview discovery</Link>
      </header>
      <div className="studio-split">
        <form className="studio-create" onSubmit={openNew}>
          <p className="studio-kicker">New client</p>
          <h2>Start a project.</h2>
          <label>
            Client
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Who you're working with" />
          </label>
          <label>
            Business
            <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="The name customers use" />
          </label>
          <label>
            Website
            <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="What kind of business" />
          </label>
          <button type="submit" className="studio-button">Create project</button>
          <button type="button" className="studio-text-button" onClick={openExample}>
            Open another worked example
          </button>
        </form>
        <ul className="studio-project-list">
          {ranked.length === 0 ? <li className="studio-empty">No clients yet. A project is where the understanding accumulates.</li> : null}
          {ranked.map((project) => (
            <ClientRow key={project.id} project={project} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClientRow({ project }: { project: BriefProject }) {
  const intelligence = useMemo(() => buildProjectIntelligence(project, project.updatedAt), [project]);
  const line = attentionLine(project, intelligence);
  return (
    <li>
      <Link to={`/studio/${project.id}`}>
        <strong>{project.businessName || "Untitled project"}</strong>
        <span>{STATUS[project.discoveryStatus]}</span>
        <em>
          {intelligence.opportunities.length} {intelligence.opportunities.length === 1 ? "opportunity" : "opportunities"}
          {" · "}
          {intelligence.openQuestions.length} unresolved {intelligence.openQuestions.length === 1 ? "question" : "questions"}
        </em>
        <p className="studio-attention">{line}</p>
      </Link>
    </li>
  );
}
