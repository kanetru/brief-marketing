import { useEffect, useRef, useState } from "react";
import type { CompetitorView, MarketCardView, MatterCard, OpportunityView, OriginalResponse, ResearchPartial } from "../../domain/workspace/managerView";
import type { TechnicalDetail } from "../../types/marketDiscovery";

export function OverviewBoard({
  read,
  matters,
  needsResearch,
  onFindCompetitors,
}: {
  read: string;
  matters: MatterCard[];
  needsResearch: boolean;
  onFindCompetitors: () => void;
}) {
  return (
    <div className="manager-stack" data-screen="overview">
      <section className="surface-card">
        <p className="card-kicker">The read</p>
        {read ? read.split(/\n\s*\n/).map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>) : <p>Brief is building the first read.</p>}
      </section>
      {matters.length > 0 ? (
        <section>
          <h2>What matters now</h2>
          <div className="card-grid">
            {matters.map((item) => (
              <article key={item.id} className="surface-card">
                <p className="card-kicker">{item.kicker}</p>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {needsResearch ? (
        <section className="surface-card" data-screen="find-competitors">
          <h2>Market research hasn't run yet.</h2>
          <p>Brief can find competitors and accounts worth watching.</p>
          <button type="button" className="studio-button" onClick={onFindCompetitors}>Find competitors</button>
        </section>
      ) : null}
    </div>
  );
}

export function CompetitorBoard({
  views,
  busy,
  failed,
  onFind,
  onAdd,
  partial = null,
  technical = [],
  devDetails = false,
  onRetryInstagram,
  onRetryTikTok,
  onRetryAnalysis,
}: {
  views: CompetitorView[];
  busy: boolean;
  failed: boolean;
  onFind: () => void;
  onAdd: (name: string) => void;
  partial?: ResearchPartial | null;
  technical?: TechnicalDetail[];
  devDetails?: boolean;
  onRetryInstagram?: () => void;
  onRetryTikTok?: () => void;
  onRetryAnalysis?: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const selected = views.find((item) => item.id === open) ?? null;
  return (
    <section data-screen="competitors">
      <header className="board-head">
        <div>
          <h2>Competitors</h2>
          <p className="studio-meta">{views.length === 0 ? "No accounts yet" : `${views.length} ${views.length === 1 ? "account" : "accounts"} worth watching`}</p>
        </div>
        <div className="studio-row">
          <button type="button" className="studio-button" disabled={busy} onClick={onFind}>{busy ? "Researching…" : "Find more"}</button>
          <button type="button" className="studio-text-button" onClick={() => setAdding((value) => !value)}>+ Add</button>
        </div>
      </header>
      {adding ? (
        <form className="studio-row" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onAdd(name.trim());
          setName("");
          setAdding(false);
        }}>
          <input aria-label="Competitor name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <button type="submit" className="studio-button">Add</button>
        </form>
      ) : null}
      {busy ? (
        <div className="surface-card" data-screen="research-progress" role="status">
          <p>Researching the market…</p>
          <p>Searching Instagram</p>
          <p>Searching TikTok</p>
          <p>Reviewing candidate accounts</p>
          <p>Comparing with the brand</p>
        </div>
      ) : null}
      {failed && !busy ? (
        <div className="surface-card" data-screen="research-error">
          <p>Market research couldn't finish.</p>
          <button type="button" className="studio-button" onClick={onFind}>Try again</button>
          {devDetails ? <TechnicalDetails items={technical} /> : null}
        </div>
      ) : null}
      {partial && !busy && !failed ? (
        <div className="surface-card" data-screen="research-partial">
          {partial.instagramFailed || partial.tiktokFailed ? <p>{partial.discovered === 1 ? "1 account found." : `${partial.discovered} accounts found.`}</p> : <p>Accounts found.</p>}
          {partial.instagramFailed ? <p>Instagram research couldn't finish.</p> : null}
          {partial.tiktokFailed ? <p>TikTok research couldn't finish.</p> : null}
          {partial.classificationFailed ? <p>Brief couldn't analyse them yet.</p> : null}
          {partial.instagramFailed ? <button type="button" className="studio-button" onClick={onRetryInstagram}>Retry Instagram</button> : null}
          {partial.tiktokFailed ? <button type="button" className="studio-button" onClick={onRetryTikTok}>Retry TikTok</button> : null}
          {partial.classificationFailed ? <button type="button" className="studio-button" onClick={onRetryAnalysis}>Retry analysis</button> : null}
          {devDetails ? <TechnicalDetails items={technical} /> : null}
        </div>
      ) : null}
      {views.length === 0 && !busy && !failed ? (
        <div className="surface-card" data-screen="competitors-empty">
          <h2>No market research yet.</h2>
          <p>Brief can use what it learned about this client to find competitors and accounts worth watching.</p>
          <button type="button" className="studio-button" onClick={onFind}>Find competitors</button>
        </div>
      ) : views.length > 0 ? (
        <div className="card-grid cards-competitors">
          {views.map((item) => (
            <article
              key={item.id}
              className="surface-card competitor-card"
              data-badge={item.badge}
              data-selected={open === item.id ? "true" : "false"}
              role="button"
              tabIndex={0}
              aria-label={`View ${item.name}`}
              onClick={() => setOpen(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpen(item.id);
                }
              }}
            >
              <h3>{item.name}</h3>
              <p className="card-badge">{item.badge}</p>
              {item.platforms ? <p>{item.platforms}</p> : null}
              {item.owns ? <p><span className="card-kicker">What they appear to own</span>{item.owns}</p> : null}
              {item.themes ? <p><span className="card-kicker">Current themes</span>{item.themes}</p> : null}
              {item.change ? <p><span className="card-kicker">Recent change</span>{item.change}</p> : null}
              {item.metrics.map((metric) => <p key={metric} className="studio-meta">{metric}</p>)}
              <span className="studio-text-button">View</span>
            </article>
          ))}
        </div>
      ) : null}
      {selected ? <CompetitorDetail view={selected} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

export function TechnicalDetails({ items }: { items: TechnicalDetail[] }) {
  if (items.length === 0) return null;
  return (
    <details>
      <summary>Technical details</summary>
      {items.map((item) => (
        <div key={`${item.stage}-${item.httpStatus ?? ""}-${item.message}`}>
          <p>Stage</p>
          <p>{item.stage}</p>
          {item.httpStatus ? (
            <>
              <p>HTTP</p>
              <p>{item.httpStatus}</p>
            </>
          ) : null}
          <p>Message</p>
          <p>{item.message}</p>
        </div>
      ))}
    </details>
  );
}

export function CompetitorDetail({ view, onClose }: { view: CompetitorView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dismiss = useRef(onClose);
  dismiss.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="layer-backdrop" data-layer="drawer" role="presentation" onClick={onClose}>
      <aside className="layer-drawer surface-drawer" role="dialog" aria-modal="true" aria-label={view.name} data-screen="competitor-detail" onClick={(event) => event.stopPropagation()}>
        <header className="layer-head">
          <h2>{view.name}</h2>
          <button ref={closeRef} type="button" className="layer-close" onClick={onClose}>Close</button>
        </header>
        <p className="card-badge">{view.badge}</p>
        {view.summary ? <section><h3>Summary</h3><p>{view.summary}</p></section> : null}
        {view.why ? <section><h3>Why they matter</h3><p>{view.why}</p></section> : null}
        {view.positioning ? <section><h3>Positioning</h3><p>{view.positioning}</p></section> : null}
        {view.themes ? <section><h3>Current themes</h3><p>{view.themes}</p></section> : null}
        {view.posts.length > 0 ? <section><h3>Recent posts</h3>{view.posts.map((post) => <p key={post}>{post}</p>)}</section> : null}
        {view.language ? <section><h3>Language</h3><p>{view.language}</p></section> : null}
        {view.social ? <section><h3>Social activity</h3><p>{view.social}</p></section> : null}
        {view.evidence ? <section className="surface-inset"><h3>Evidence</h3><p>{view.evidence}</p></section> : null}
      </aside>
    </div>
  );
}

export function MarketBoard({ cards }: { cards: MarketCardView[] }) {
  if (cards.length === 0) {
    return (
      <section className="surface-card" data-screen="market-empty">
        <h2>Market</h2>
        <p>Market analysis will appear after competitor research.</p>
      </section>
    );
  }
  return (
    <section data-screen="market">
      <h2>Market</h2>
      <div className="card-grid">
        {cards.map((card) => (
          <article key={card.id} className="surface-card">
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            {card.share ? <p className="studio-meta">{card.share}</p> : null}
            {card.ratio !== null ? (
              <div className="share-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(card.ratio * 100)}%` }} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function OpportunityBoard({
  items,
  onSave,
  onDismiss,
}: {
  items: OpportunityView[];
  onSave: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section className="surface-card" data-screen="opportunities-empty">
        <h2>Opportunities</h2>
        <p>Brief needs enough brand and market evidence before suggesting opportunities.</p>
      </section>
    );
  }
  return (
    <section data-screen="opportunities">
      <h2>Opportunities</h2>
      <div className="card-grid">
        {items.map((item) => (
          <article key={item.id} className="surface-card" data-saved={item.saved ? "true" : "false"}>
            <p className="card-kicker">{item.index}</p>
            <h3>{item.title}</h3>
            <p><span className="card-kicker">Why</span>{item.why}</p>
            <p><span className="card-kicker">Opportunity</span>{item.move}</p>
            <p><span className="card-kicker">Could become</span>{item.could}</p>
            <div className="studio-row">
              <button type="button" className="studio-button" data-testid="save-opportunity" onClick={() => onSave(item.id)}>{item.saved ? "Saved" : "Save"}</button>
              <button type="button" className="studio-text-button" onClick={() => onDismiss(item.id)}>Dismiss</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResponseBoard({ lines }: { lines: OriginalResponse[] }) {
  if (lines.length === 0) return <section className="surface-card"><p>No answers yet.</p></section>;
  return (
    <section data-screen="original-responses" className="card-grid">
      {lines.map((line) => (
        <article key={`${line.label}-${line.text.slice(0, 16)}`} className="surface-card">
          <p className="card-kicker">{line.label}</p>
          <p>{line.text}</p>
        </article>
      ))}
    </section>
  );
}
