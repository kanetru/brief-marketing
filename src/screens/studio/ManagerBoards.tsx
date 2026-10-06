import { useEffect, useRef, useState } from "react";
import { ActionGroup, BadgeRow } from "../../components/ActionGroup";
import { badgeLabel, type CompetitorView, type OpportunityView, type OriginalResponse, type ResearchPartial } from "../../domain/workspace/managerView";
import type { MarketFacts } from "../../domain/workspace/plainAnalytics";
import type { PositioningCard } from "../../domain/workspace/positioning";
import type { TechnicalDetail } from "../../types/marketDiscovery";

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
  onAsk,
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
  onAsk?: (name: string) => void;
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
          <p className="studio-meta">{views.length === 0 ? "No competitors yet" : `${views.length} ${views.length === 1 ? "competitor" : "competitors"}`}</p>
        </div>
        <ActionGroup>
          <button type="button" className="studio-button" disabled={busy} onClick={onFind}>{busy ? "Researching…" : "Find more"}</button>
          <button type="button" className="studio-text-button" onClick={() => setAdding((value) => !value)}>+ Add</button>
        </ActionGroup>
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
          <ActionGroup>
            <button type="button" className="studio-button" onClick={onFind}>Try again</button>
          </ActionGroup>
          {devDetails ? <TechnicalDetails items={technical} /> : null}
        </div>
      ) : null}
      {partial && !busy && !failed ? (
        <div className="surface-card" data-screen="research-partial">
          {partial.instagramFailed || partial.tiktokFailed ? <p>{partial.discovered === 1 ? "1 account found." : `${partial.discovered} accounts found.`}</p> : <p>Accounts found.</p>}
          {partial.instagramFailed ? <p>Instagram research couldn't finish.</p> : null}
          {partial.tiktokFailed ? <p>TikTok research couldn't finish.</p> : null}
          {partial.classificationFailed ? <p>Brief couldn't analyse them yet.</p> : null}
          <ActionGroup>
            {partial.instagramFailed ? <button type="button" className="studio-button" onClick={onRetryInstagram}>Retry Instagram</button> : null}
            {partial.tiktokFailed ? <button type="button" className="studio-button" onClick={onRetryTikTok}>Retry TikTok</button> : null}
            {partial.classificationFailed ? <button type="button" className="studio-button" onClick={onRetryAnalysis}>Retry analysis</button> : null}
          </ActionGroup>
          {devDetails ? <TechnicalDetails items={technical} /> : null}
        </div>
      ) : null}
      {views.length === 0 && !busy && !failed ? (
        <div className="surface-card" data-screen="competitors-empty">
          <h2>No market research yet.</h2>
          <p>Brief can use what it learned about this client to find competitors and accounts worth watching.</p>
          <ActionGroup>
            <button type="button" className="studio-button" onClick={onFind}>Find competitors</button>
          </ActionGroup>
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
              <div className="card-identity">
                <h3>{item.name}</h3>
                <BadgeRow>
                  <p className="card-badge">{badgeLabel(item.badge)}</p>
                </BadgeRow>
              </div>
              {item.stats?.accounts.map((account) => (
                <p key={`${account.platform}-${account.handle}`} className="metric-row">
                  <span>{account.handle ? `${account.platform} @${account.handle}` : account.platform}</span>
                  {account.followers ? <span>{account.followers}</span> : null}
                </p>
              ))}
              {item.stats?.metrics.map((metric) => (
                <p key={metric.label} className="metric-row">
                  <span>{metric.label}</span>
                  <span>{metric.value}</span>
                </p>
              ))}
              {item.stats?.changes.map((change) => <p key={change}>{change}</p>)}
              {(item.stats?.themes || item.themes) ? <p><span className="card-kicker">Top themes</span>{item.stats?.themes || item.themes}</p> : null}
              <div className="action-group card-actions">
                <span className="studio-text-button">View analytics</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {selected ? <CompetitorDetail view={selected} onClose={() => setOpen(null)} onAsk={onAsk} /> : null}
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

export function CompetitorDetail({ view, onClose, onAsk }: { view: CompetitorView; onClose: () => void; onAsk?: (name: string) => void }) {
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
        {onAsk ? <button type="button" className="studio-text-button" onClick={() => onAsk(view.name)}>Ask Brief about {view.name}</button> : null}
        <div className="layer-body">
          <BadgeRow>
            <p className="card-badge">{badgeLabel(view.badge)}</p>
          </BadgeRow>
          <section>
            <h3>Overview</h3>
            {view.stats?.website ? <p className="metric-row"><span>Website</span><a href={view.stats.websiteUrl}>{view.stats.website}</a></p> : null}
            {view.summary ? <p>{view.summary}</p> : null}
            {view.stats?.monitoredSince ? <p className="studio-meta">Monitored since {view.stats.monitoredSince}</p> : null}
            {view.stats?.updated ? <p className="studio-meta">Last updated {view.stats.updated}</p> : null}
          </section>
          <section>
            <h3>Social performance</h3>
            {(view.stats?.accounts ?? []).map((account) => (
              <p key={`${account.platform}-${account.handle}`} className="metric-row">
                <span>{account.handle ? `${account.platform} @${account.handle}` : account.platform}</span>
                {account.followers ? <span>{account.followers}</span> : null}
                {account.url ? <a href={account.url}>Open</a> : null}
              </p>
            ))}
            {(view.stats?.metrics ?? []).map((metric) => (
              <p key={metric.label} className="metric-row"><span>{metric.label}</span><span>{metric.value}</span></p>
            ))}
            {view.stats && view.stats.followersSeries.length >= 2 ? <FollowerChart points={view.stats.followersSeries} /> : null}
            {view.stats?.historyNote ? <p>{view.stats.historyNote}</p> : null}
            {!view.stats ? <p>No social metrics yet.</p> : null}
          </section>
          {(view.stats?.themes || view.themes) ? <section><h3>Content</h3><p>{view.stats?.themes || view.themes}</p></section> : null}
          {((view.stats?.topPosts.length ?? 0) > 0 || view.posts.length > 0) ? (
            <section>
              <h3>Recent posts</h3>
              {(view.stats?.topPosts ?? []).map((post) => (
                <p key={post.text}>{post.text}{post.detail ? <span className="studio-meta"> {post.detail}</span> : null}</p>
              ))}
              {(view.stats?.topPosts.length ?? 0) > 0 ? null : view.posts.map((post) => <p key={post}>{post}</p>)}
            </section>
          ) : null}
          {(view.stats?.changes.length ?? 0) > 0 ? (
            <section>
              <h3>Changes</h3>
              {view.stats?.changes.map((change) => <p key={change}>{change}</p>)}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function MarketBoard({ facts, positioning = [], onAsk }: { facts: MarketFacts; positioning?: PositioningCard[]; onAsk?: () => void }) {
  if (facts.competitors === 0 && facts.posts === 0) {
    return (
      <section className="surface-card" data-screen="market-empty">
        <h2>Market</h2>
        <p>Market analysis will appear after competitor research.</p>
      </section>
    );
  }
  return (
    <section data-screen="market" className="manager-stack">
      <h2>Market</h2>
      <div className="stat-strip">
        {facts.competitors > 0 ? <p><strong>{facts.competitors}</strong><span>{facts.competitors === 1 ? "Competitor" : "Competitors"}</span></p> : null}
        {facts.posts > 0 ? <p><strong>{facts.posts}</strong><span>{facts.posts === 1 ? "Post" : "Posts"}</span></p> : null}
      </div>
      {positioning.length > 0 ? (
        <section data-screen="positioning">
          <h3>Positioning</h3>
          <div className="card-grid">
            {positioning.map((card) => (
              <article key={card.title} className="surface-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
          {onAsk ? <button type="button" className="studio-text-button" onClick={onAsk}>Ask Brief</button> : null}
        </section>
      ) : null}
      <section className="surface-card">
        <h3>Market summary</h3>
        {facts.facts.map((fact) => <p key={fact}>{fact}</p>)}
      </section>
      {facts.growing.length > 0 ? <section className="surface-card"><h3>What&apos;s growing</h3>{facts.growing.map((line) => <p key={line}>{line}</p>)}</section> : null}
      {facts.declining.length > 0 ? <section className="surface-card"><h3>What&apos;s declining</h3>{facts.declining.map((line) => <p key={line}>{line}</p>)}</section> : null}
      {facts.topics.length > 0 ? (
        <section className="surface-card">
          <h3>What competitors are talking about</h3>
          <p>{facts.topics.join(" · ")}</p>
        </section>
      ) : null}
      {facts.interpretation.length > 0 ? (
        <section className="surface-card">
          <h3>What&apos;s changing</h3>
          {facts.interpretation.map((line) => <p key={line}>{line}</p>)}
        </section>
      ) : null}
    </section>
  );
}

function FollowerChart({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  return (
    <div className="spark" role="img" aria-label={`Followers over time, from ${points[0]} to ${points[points.length - 1]}`}>
      {points.map((point, index) => (
        <span key={`${point}-${index}`} style={{ height: `${16 + ((point - min) / span) * 48}px` }} />
      ))}
    </div>
  );
}

export function OpportunityBoard({
  items,
  onSave,
  onDismiss,
  onAsk,
}: {
  items: OpportunityView[];
  onSave: (id: string) => void;
  onDismiss: (id: string) => void;
  onAsk?: (title: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section className="surface-card" data-screen="opportunities-empty">
        <h2>Opportunities</h2>
        <p>Brief needs to know the client and the market before suggesting opportunities.</p>
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
            {(item.basis ?? []).length > 0 ? (
              <details>
                <summary>Why Brief thinks this</summary>
                {(item.basis ?? []).map((line) => <p key={line}>{line}</p>)}
              </details>
            ) : null}
            <ActionGroup className="card-actions">
              <button type="button" className="studio-button" data-testid="save-opportunity" onClick={() => onSave(item.id)}>{item.saved ? "Saved" : "Save"}</button>
              {onAsk ? <button type="button" className="studio-text-button" onClick={() => onAsk(item.title)}>Ask Brief</button> : null}
              <button type="button" className="studio-text-button" onClick={() => onDismiss(item.id)}>Dismiss</button>
            </ActionGroup>
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
