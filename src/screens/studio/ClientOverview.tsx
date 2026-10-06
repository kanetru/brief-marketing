import { useState } from "react";
import { clientRecord, type ClientRecord } from "../../domain/workspace/clientRecord";
import { positioningRead } from "../../domain/workspace/positioning";
import { clientInitials, clientLogo } from "../../domain/workspace/clientLogo";
import type { BriefProject, ClientOfferRecord, ClientProfile, ClientSocial } from "../../types/project";

export function ClientOverview({
  project,
  onDetails,
  onSocials,
  onProfile,
}: {
  project: BriefProject;
  onDetails: (details: { clientName: string; businessName: string; website: string; category: string }) => void;
  onSocials: (socials: ClientSocial[]) => void;
  onProfile: (profile: ClientProfile) => void;
}) {
  const record = clientRecord(project);
  const position = positioningRead(project)[0];
  const researched = (project.marketDiscovery?.candidates?.length ?? 0) > 0 || (project.watch?.competitors?.length ?? 0) > 0;
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <RecordEditor
        project={project}
        record={record}
        onCancel={() => setEditing(false)}
        onSave={(details, socials, profile) => {
          onDetails(details);
          onSocials(socials);
          onProfile(profile);
          setEditing(false);
        }}
      />
    );
  }
  return (
    <div className="manager-stack client-record" data-screen="overview">
      <section className="surface-card">
        <RecordMark project={project} name={record.name} />
        <h2>{record.name}</h2>
        {record.category ? <p className="studio-meta">{record.category}</p> : null}
        {record.description ? <p>{record.description}</p> : null}
        {record.website ? <RecordLinkRow link={record.website} /> : null}
        {record.socials.map((link) => <RecordLinkRow key={link.label} link={link} />)}
        {record.contact ? <p className="metric-row"><span>Contact</span><span>{record.contact}</span></p> : null}
        <button type="button" className="studio-text-button" onClick={() => setEditing(true)}>Edit</button>
      </section>
      {record.offers.length > 0 ? (
        <section>
          <h2>What they sell</h2>
          <div className="card-grid">
            {record.offers.map((offer) => (
              <article key={offer.name} className="surface-card">
                <h3>{offer.name}</h3>
                {offer.description ? <p>{offer.description}</p> : null}
                {offer.priceLabel ? <p className="studio-meta">{offer.priceLabel}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {record.audience ? (
        <section className="surface-card">
          <h2>Who they sell to</h2>
          <p>{record.audience}</p>
        </section>
      ) : null}
      {record.goal ? (
        <section className="surface-card">
          <h2>What they want</h2>
          <p>{record.goal}</p>
        </section>
      ) : null}
      {position ? (
        <section className="surface-card" data-screen="positioning-summary">
          <h2>Positioning</h2>
          <p>{position.body}</p>
        </section>
      ) : null}
      <p className="studio-meta">{researched ? "Research collected" : "Market research has not run"} · Updated {project.updatedAt.slice(0, 10)}</p>
    </div>
  );
}

function RecordLinkRow({ link }: { link: { label: string; value: string; href: string } }) {
  return (
    <p className="metric-row">
      <span>{link.label}</span>
      <span>{link.value}</span>
      <a href={link.href} target="_blank" rel="noopener noreferrer">Open</a>
    </p>
  );
}

function RecordMark({ project, name }: { project: BriefProject; name: string }) {
  const logo = clientLogo(project, "light");
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return <span className="client-mark" data-logo="fallback" aria-hidden="true"><span>{clientInitials(name)}</span></span>;
  }
  return (
    <span className="client-mark" data-logo="image">
      <img src={logo.src} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

function RecordEditor({
  project,
  record,
  onCancel,
  onSave,
}: {
  project: BriefProject;
  record: ClientRecord;
  onCancel: () => void;
  onSave: (
    details: { clientName: string; businessName: string; website: string; category: string },
    socials: ClientSocial[],
    profile: ClientProfile,
  ) => void;
}) {
  const instagram = project.socials?.find((item) => item.platform === "instagram")?.handle ?? "";
  const tiktok = project.socials?.find((item) => item.platform === "tiktok")?.handle ?? "";
  const [businessName, setBusinessName] = useState(project.businessName);
  const [clientName, setClientName] = useState(project.clientName);
  const [website, setWebsite] = useState(project.website);
  const [category, setCategory] = useState(project.category);
  const [description, setDescription] = useState(record.description);
  const [audience, setAudience] = useState(record.audience);
  const [goal, setGoal] = useState(record.goal);
  const [ig, setIg] = useState(instagram);
  const [tt, setTt] = useState(tiktok);
  const [offers, setOffers] = useState<ClientOfferRecord[]>(record.offers.length > 0 ? record.offers : [{ name: "", description: "", priceLabel: "" }]);

  return (
    <form
      className="studio-form surface-card"
      data-screen="overview-edit"
      onSubmit={(event) => {
        event.preventDefault();
        const socials: ClientSocial[] = [
          ...(project.socials ?? []).filter((item) => item.platform !== "instagram" && item.platform !== "tiktok"),
          { platform: "instagram", handle: ig.trim() },
          { platform: "tiktok", handle: tt.trim() },
        ];
        onSave(
          { clientName, businessName, website, category },
          socials,
          {
            description,
            audience,
            goal,
            offers: offers.filter((offer) => offer.name.trim()),
          },
        );
      }}
    >
      <h2>Edit client</h2>
      <label>Business<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label>
      <label>Contact<input value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
      <label>Website<input value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      <label>Instagram<input value={ig} onChange={(event) => setIg(event.target.value)} placeholder="@handle" /></label>
      <label>TikTok<input value={tt} onChange={(event) => setTt(event.target.value)} placeholder="@handle" /></label>
      <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
      <label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label>Who they sell to<textarea rows={3} value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
      <label>What they want<textarea rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
      <h3>What they sell</h3>
      {offers.map((offer, index) => (
        <div key={index} className="studio-form">
          <label>Name<input value={offer.name} onChange={(event) => setOffers(offers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label>
          <label>Description<input value={offer.description} onChange={(event) => setOffers(offers.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} /></label>
          <label>Price<input value={offer.priceLabel} onChange={(event) => setOffers(offers.map((item, itemIndex) => itemIndex === index ? { ...item, priceLabel: event.target.value } : item))} /></label>
        </div>
      ))}
      <button type="button" className="studio-text-button" onClick={() => setOffers([...offers, { name: "", description: "", priceLabel: "" }])}>Add product</button>
      <div className="action-group">
        <button type="submit" className="studio-button">Save</button>
        <button type="button" className="studio-text-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
