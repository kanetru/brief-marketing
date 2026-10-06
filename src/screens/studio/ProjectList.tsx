import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ActionGroup } from "../../components/ActionGroup";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { DEMO_ACCOUNT } from "../../domain/project/account";
import { sharePath } from "../../domain/project/access";
import { clientRemovalName } from "../../domain/project/removeClient";
import { workspaceAttention } from "../../domain/intelligence/attention";
import { clientCardModel } from "../../domain/workspace/clientCard";
import { clientInitials, clientLogo } from "../../domain/workspace/clientLogo";
import { LAST_CLIENT_KEY } from "../../domain/workspace/managerNav";
import { useProjects } from "../../state/ProjectContext";
import type { BriefProject } from "../../types/project";
import { RemoveClientDialog } from "./RemoveClient";

export function ProjectList() {
  const { projects, create, remove } = useProjects();
  const navigate = useNavigate();
  const removed = removedNotice(useLocation().state);
  const [searchParams] = useSearchParams();
  const [creating, setCreating] = useState(() => searchParams.get("new") === "1");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [removing, setRemoving] = useState<BriefProject | null>(null);
  const ranked = useMemo(() => {
    const order = new Map(workspaceAttention(projects).map((item, index) => [item.projectId, index]));
    return [...projects].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [projects]);

  function openNew(event: FormEvent) {
    event.preventDefault();
    const project = create({ clientName: contactName, businessName, contactEmail });
    navigate(`/studio/${project.id}`, { state: { created: true } });
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
            Business
            <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="The name customers use" />
          </label>
          <label>
            Contact name
            <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Contact email
            <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Optional" />
          </label>
          <ActionGroup>
            <button type="submit" className="studio-button">Create link</button>
          </ActionGroup>
        </form>
      ) : null}
      <h2>Your clients</h2>
      <ul className="client-grid" data-screen="client-cards">
          {ranked.length === 0 ? <li className="studio-empty">No clients yet.</li> : null}
          {ranked.map((project) => (
            <ClientCard key={project.id} project={project} onRemove={() => setRemoving(project)} />
          ))}
        </ul>
      {removing ? (
        <RemoveClientDialog
          name={clientRemovalName(removing)}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const label = clientRemovalName(removing);
            remove(removing.id);
            setRemoving(null);
            navigate("/studio", { state: { removed: label } });
          }}
        />
      ) : null}
      <ActionGroup className="home-actions">
        <button type="button" className="studio-button" onClick={() => setCreating((open) => !open)}>+ Onboard new client</button>
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

export function ClientCard({ project, onRemove }: { project: BriefProject; onRemove?: () => void }) {
  const card = clientCardModel(project);
  const selected = typeof sessionStorage !== "undefined" && sessionStorage.getItem(LAST_CLIENT_KEY) === project.id;
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
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
        <span className="card-go" aria-hidden="true">→</span>
      </Link>
      {onRemove ? (
        <div className="card-menu">
          <button type="button" className="studio-text-button" aria-label={`Actions for ${card.name}`} aria-expanded={menu} onClick={() => setMenu((open) => !open)}>•••</button>
          {menu ? (
            <div className="card-menu-list" role="menu">
              <Link role="menuitem" to={`/studio/${project.id}`}>Open client</Link>
              <button type="button" role="menuitem" data-client-link={sharePath(project.shareToken)} onClick={() => {
                const url = `${window.location.origin}${sharePath(project.shareToken)}`;
                void navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false));
              }}>{copied ? "Link copied" : "Copy onboarding link"}</button>
              <button type="button" role="menuitem" onClick={onRemove}>Remove client</button>
            </div>
          ) : null}
        </div>
      ) : null}
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
