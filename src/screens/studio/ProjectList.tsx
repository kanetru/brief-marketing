import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ActionGroup } from "../../components/ActionGroup";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { DEMO_ACCOUNT } from "../../domain/project/account";
import { workspaceAttention } from "../../domain/intelligence/attention";
import { clientCardModel } from "../../domain/workspace/clientCard";
import { clientInitials, clientLogo } from "../../domain/workspace/clientLogo";
import { LAST_CLIENT_KEY } from "../../domain/workspace/managerNav";
import { organicFixture } from "../../fixtures/brandFixtures";
import { useProjects } from "../../state/ProjectContext";
import type { BriefProject } from "../../types/project";

export function ProjectList() {
  const { projects, create } = useProjects();
  const navigate = useNavigate();
  const removed = removedNotice(useLocation().state);
  const [searchParams] = useSearchParams();
  const [creating, setCreating] = useState(() => searchParams.get("new") === "1");
  const [clientName, setClientName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const ranked = useMemo(() => {
    const order = new Map(workspaceAttention(projects).map((item, index) => [item.projectId, index]));
    return [...projects].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [projects]);

  function openNew(event: FormEvent) {
    event.preventDefault();
    const project = create({ clientName, businessName, website, category });
    navigate(`/studio/${project.id}`, { state: { created: true } });
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
          <h1>Welcome, {firstName(DEMO_ACCOUNT.name)}</h1>
        </div>
      </header>
      {removed ? <p className="studio-notice" role="status">{removed} removed.</p> : null}
      {creating ? (
        <form className="studio-create surface-card" onSubmit={openNew}>
          <h2>Onboard new client</h2>
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
          <ActionGroup>
            <button type="submit" className="studio-button">Create client</button>
            <button type="button" className="studio-text-button" onClick={openExample}>
              Worked example
            </button>
          </ActionGroup>
        </form>
      ) : null}
      <h2>Your clients</h2>
      <ul className="client-grid" data-screen="client-cards">
          {ranked.length === 0 ? <li className="studio-empty">No clients yet.</li> : null}
          {ranked.map((project) => (
            <ClientCard key={project.id} project={project} />
          ))}
        </ul>
      <ActionGroup className="home-actions">
        <button type="button" className="studio-button" onClick={() => setCreating((open) => !open)}>Onboard new client</button>
        <Link className="studio-button" to="/studio/look">Make Brief your own</Link>
      </ActionGroup>
    </div>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

function removedNotice(state: unknown): string {
  if (!state || typeof state !== "object" || !("removed" in state)) return "";
  const value = (state as { removed?: unknown }).removed;
  return typeof value === "string" ? value.trim() : "";
}

export function ClientCard({ project }: { project: BriefProject }) {
  const card = clientCardModel(project);
  const selected = typeof sessionStorage !== "undefined" && sessionStorage.getItem(LAST_CLIENT_KEY) === project.id;
  return (
    <li className="client-tile" data-screen="attention-row">
      <Link to={`/studio/${project.id}`} className="surface-card client-card" data-selected={selected ? "true" : "false"} data-tone={card.tone}>
        <span className="client-identity">
          <ClientMark name={card.name} project={project} />
          <span className="client-name">
            <strong>{card.name}</strong>
            <span>{card.subtitle}</span>
          </span>
        </span>
        <span>{card.competitors}</span>
        <span>{card.opportunities}</span>
      </Link>
    </li>
  );
}

function ClientMark({ name, project }: { name: string; project: BriefProject }) {
  const logo = clientLogo(project, "light");
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return (
      <span className="client-mark" data-logo="fallback" aria-hidden="true">
        <span>{clientInitials(name)}</span>
      </span>
    );
  }
  return (
    <span className="client-mark" data-logo="image">
      <img src={logo.src} alt="" onError={() => setFailed(true)} />
    </span>
  );
}
