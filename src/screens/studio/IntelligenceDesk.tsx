import { useState } from "react";
import { ActionGroup, BadgeRow } from "../../components/ActionGroup";
import { Overlay } from "../../components/Overlay";
import { assembleBrandBrain } from "../../domain/intelligence/brain";
import { runDueJobs } from "../../domain/intelligence/jobs";
import { competitorCount, formatChecked, platformsFor } from "../../domain/workspace/clientCard";
import { historyDate, historyLine } from "../../domain/workspace/historyLines";
import { competitorCards } from "../../domain/workspace/marketCards";
import { MarketDiscoveryPanel } from "./MarketDiscoveryPanel";
import type { BriefProject, ProjectIntelligence } from "../../types/project";
import type { DataOrigin, IntelligenceItem, ManagerReaction, Signal } from "../../types/intelligence";

const ORIGIN: Record<DataOrigin, string> = {
  live: "Live",
  cached: "Cached",
  stale: "Stale",
  demo: "Demo",
  unavailable: "Unavailable",
};

function originOf(project: BriefProject): DataOrigin {
  const origins = new Set((project.watch?.signals ?? []).map((signal) => signal.origin));
  if (origins.has("demo")) return "demo";
  if (origins.has("stale")) return "stale";
  if (origins.has("cached")) return "cached";
  if (origins.has("live")) return "live";
  return "unavailable";
}

function readingItems(reading: BriefProject["watch"]["readings"][number] | null) {
  if (!reading) return { latest: [] as IntelligenceItem[], watching: [] as IntelligenceItem[], opportunities: [] as IntelligenceItem[] };
  return {
    latest: [...reading.importantChanges, ...reading.challengedDecisions],
    watching: [...reading.watchItems, ...reading.thingsNotWorthReactingTo, ...reading.questions],
    opportunities: reading.opportunities,
  };
}

export function IntelligenceDesk({
  project,
  onReact,
  onFindCompetitors,
}: {
  project: BriefProject;
  intelligence: ProjectIntelligence;
  onReact: (reaction: ManagerReaction) => void;
  onFindCompetitors?: () => void;
}) {
  const [view, setView] = useState<"feed" | "morning" | "week">("feed");
  const [notice, setNotice] = useState("");
  const watch = project.watch;
  const reading = watch.readings[0] ?? null;
  const origin = originOf(project);
  const groups = readingItems(reading);
  const platforms = platformsFor(project);
  const empty = watch.signals.length === 0 && watch.jobs.length === 0;
  const quiet = !empty && groups.latest.length === 0 && groups.opportunities.length === 0;

  return (
    <section className="studio-panel intel" data-screen="intelligence">
      <p className="studio-meta">
        Last checked {formatChecked(watch.updatedAt)}
        {" · "}{competitorCount(project)} competitors
        {platforms.length ? ` · ${platforms.join(" + ")}` : ""}
      </p>
      <p className="provenance" data-origin={origin}>{ORIGIN[origin]}</p>
      <div className="intel-switch">
        <button type="button" className="studio-text-button" onClick={() => {
          const next = runDueJobs(watch, new Date().toISOString(), () => ({ signals: [], error: "" }));
          const due = next.jobs.some((job, index) => job.lastRunAt !== watch.jobs[index]?.lastRunAt);
          setNotice(due ? "Checked." : "Nothing due.");
        }}>Check now</button>
        <button type="button" aria-current={view === "morning" ? "page" : undefined} onClick={() => setView(view === "morning" ? "feed" : "morning")}>Today</button>
        <button type="button" aria-current={view === "week" ? "page" : undefined} onClick={() => setView(view === "week" ? "feed" : "week")}>This week</button>
      </div>
      {notice ? <p className="studio-notice">{notice}</p> : null}
      {view === "morning" ? <DailyBriefView project={project} /> : null}
      {view === "week" ? <WeeklyReadView project={project} /> : null}
      {view === "feed" ? (
        empty ? <EmptyWatch submitted={project.discoveryStatus === "submitted"} onFindCompetitors={onFindCompetitors} /> : (
          <>
            {quiet ? <QuietState /> : null}
            <Feed title="Latest" items={groups.latest} reactions={watch.reactions} signals={watch.signals} onReact={onReact} />
            <Feed title="Watching" items={groups.watching} reactions={watch.reactions} signals={watch.signals} onReact={onReact} />
            <Feed title="Opportunities" items={groups.opportunities} reactions={watch.reactions} signals={watch.signals} onReact={onReact} />
          </>
        )
      ) : null}
    </section>
  );
}

function EmptyWatch({ submitted, onFindCompetitors }: { submitted: boolean; onFindCompetitors?: () => void }) {
  if (!submitted) {
    return (
      <div className="intel-quiet" data-screen="nothing-to-watch">
        <h3>Nothing to watch</h3>
      </div>
    );
  }
  return (
    <div className="intel-quiet" data-screen="first-read">
      <h3>Discovery complete.</h3>
      <p>Brief is building the first read.</p>
      <p>Brand holds what they told us. Market is where the competitors go.</p>
      <p>Market not researched yet.</p>
      <p>Find competitors and accounts worth watching.</p>
      {onFindCompetitors ? (
        <ActionGroup>
          <button type="button" className="studio-button" onClick={onFindCompetitors}>Find competitors</button>
        </ActionGroup>
      ) : null}
    </div>
  );
}

function QuietState() {
  return (
    <div className="intel-quiet" data-screen="nothing-changed">
      <h3>Nothing significant changed</h3>
    </div>
  );
}

function Feed({
  title,
  items,
  reactions,
  signals,
  onReact,
}: {
  title: string;
  items: IntelligenceItem[];
  reactions: ManagerReaction[];
  signals: Signal[];
  onReact: (reaction: ManagerReaction) => void;
}) {
  return (
    <div>
      <h3 className="intel-bucket">{title}</h3>
      {items.length === 0 ? <p className="studio-meta">None</p> : null}
      {items.map((item) => (
        <IntelligenceCard key={item.id} item={item} reactions={reactions} signals={signals.filter((signal) => item.signalIds.includes(signal.id))} onReact={onReact} />
      ))}
    </div>
  );
}

function IntelligenceCard({
  item,
  reactions,
  signals,
  onReact,
}: {
  item: IntelligenceItem;
  reactions: ManagerReaction[];
  signals: Signal[];
  onReact: (reaction: ManagerReaction) => void;
}) {
  const [open, setOpen] = useState(false);
  const saved = reactions.some((reaction) => reaction.targetId === item.id && reaction.action === "save");
  const aside = reactions.find((reaction) => reaction.targetId === item.id && (reaction.action === "dismiss" || reaction.action === "not_relevant" || reaction.action === "investigate"));
  const actionable = item.kind === "change" || item.kind === "opportunity" || item.kind === "challenge";
  const when = item.bucket === "today" ? "Today" : item.bucket === "week" ? "This week" : "Watching";
  return (
    <article className="intel-card" data-testid="intel-card" data-kind={item.kind}>
      <p className="studio-kicker">{item.eyebrow} · {when}</p>
      <div className="card-identity">
        <h3>{item.headline}</h3>
        <BadgeRow>
          <p className="provenance card-badge" data-origin={item.origin}>{ORIGIN[item.origin]}</p>
        </BadgeRow>
      </div>
      <p>{item.evidence}</p>
      {item.whyItMatters ? <><p className="intel-label">Why it matters</p><p>{item.whyItMatters}</p></> : null}
      {item.possibleMove ? <><p className="intel-label">Brief suggests</p><p>{item.possibleMove}</p></> : null}
      {item.epistemicStatus === "hypothesis" ? <p className="studio-meta">Hypothesis</p> : null}
      {saved ? <p className="studio-notice">Saved</p> : null}
      {aside ? <p className="studio-notice">{aside.action === "investigate" ? "Investigate" : "Dismissed"}</p> : null}
      <ActionGroup className="intel-actions card-actions">
        {actionable ? <button type="button" className="studio-button" data-testid="save-opportunity" onClick={() => onReact(reaction(item.id, "save"))}>Save</button> : null}
        {actionable ? <button type="button" className="studio-text-button" onClick={() => onReact(reaction(item.id, "investigate"))}>Investigate</button> : null}
        <button type="button" className="studio-text-button" data-testid="dismiss-signal" onClick={() => onReact(reaction(item.id, "dismiss"))}>Dismiss</button>
        <button type="button" className="studio-text-button" data-testid="view-evidence" onClick={() => setOpen(true)}>Evidence</button>
      </ActionGroup>
      {open ? (
        <Overlay variant="drawer" title="Evidence" testId="evidence-drawer" onClose={() => setOpen(false)}>
          {signals.length === 0 ? <p>No signal attached.</p> : null}
          {signals.map((signal) => (
            <p key={signal.id}><span className="provenance" data-origin={signal.origin}>{ORIGIN[signal.origin]}</span> {signal.description}</p>
          ))}
        </Overlay>
      ) : null}
    </article>
  );
}

function reaction(targetId: string, action: ManagerReaction["action"]): ManagerReaction {
  return {
    id: crypto.randomUUID(),
    targetType: action === "save" ? "opportunity" : "signal",
    targetId,
    action,
    note: "",
    at: new Date().toISOString(),
  };
}

export function DailyBriefView({ project }: { project: BriefProject }) {
  const brief = project.watch.dailyBriefs[0];
  if (!brief) return <div className="intel-quiet"><h3>No brief yet</h3></div>;
  return (
    <div data-screen="daily-brief">
      <p className="provenance" data-origin={brief.source === "demo" ? "demo" : brief.source === "live_model" ? "live" : "unavailable"}>{brief.source === "demo" ? "Demo" : brief.source === "live_model" ? "Live" : "Not read"}</p>
      <ol className="intel-brief-list">
        {brief.items.map((item, index) => (
          <li key={item.id}><span>{index + 1}</span><div><strong>{item.headline}</strong><p>{item.possibleMove || item.evidence}</p></div></li>
        ))}
      </ol>
    </div>
  );
}

export function WeeklyReadView({ project }: { project: BriefProject }) {
  const weekly = project.watch.weeklyReads[0];
  if (!weekly) return <div className="intel-quiet"><h3>No weekly read</h3></div>;
  const blocks = [
    ["Persisted", weekly.persisted],
    ["Disappeared", weekly.disappeared],
    ["Competitors", weekly.convergence],
    ["Language", weekly.customerLanguage],
    ["Search", weekly.searchMovement],
    ["Opportunities", weekly.opportunities],
    ["Stronger", weekly.hypothesesStrengthened],
    ["Weaker", weekly.hypothesesWeakened],
    ["Reconsider", weekly.decisionsToReconsider],
  ] as const;
  return (
    <div data-screen="weekly-read">
      <p className="provenance" data-origin={weekly.source === "demo" ? "demo" : "unavailable"}>{weekly.source === "demo" ? "Demo" : "Not a live read"} · {weekly.period}</p>
      {blocks.map(([title, lines]) => lines.length === 0 ? null : (
        <div key={title}>
          <p className="intel-label">{title}</p>
          {lines.map((line) => <p key={line}>{line}</p>)}
        </div>
      ))}
    </div>
  );
}

function Cheat({ title, text }: { title: string; text: string }) {
  const body = text.trim() || "Not established yet.";
  const short = body.length > 220 ? `${body.slice(0, 217).trim()}…` : body;
  return (
    <article className="cheat-card">
      <h3>{title}</h3>
      <p>{short}</p>
      {body.length > 220 ? <details><summary>More</summary><p>{body}</p></details> : null}
    </article>
  );
}

export function BrandBrainPanel({ project, intelligence }: { project: BriefProject; intelligence: ProjectIntelligence }) {
  const brain = assembleBrandBrain(project, intelligence);
  const avoid = intelligence.strategy.language.avoid.filter(Boolean).join(" · ");
  const language = [...intelligence.strategy.language.owned, ...intelligence.strategy.language.customer].filter(Boolean).join(" · ");
  return (
    <section className="studio-panel" data-screen="brand-brain">
      <div className="cheat-grid">
        <Cheat title="What they do" text={brain.business} />
        <Cheat title="What they want" text={brain.goals} />
        <Cheat title="Who they're talking to" text={brain.customers} />
        <Cheat title="Positioning" text={brain.positioning} />
        <Cheat title="Voice" text={brain.verbalIdentity} />
        <Cheat title="Visual direction" text={brain.visualIdentity} />
        <Cheat title="Key language" text={language} />
        <Cheat title="Things to avoid" text={avoid} />
        <Cheat title="Constraints" text={brain.constraints} />
        <Cheat title="Proof" text={brain.proof} />
      </div>
      <details>
        <summary>More</summary>
        <p>{brain.narrative}</p>
        {brain.unknowns.length > 0 ? <p className="studio-meta">{brain.unknowns.join(" ")}</p> : null}
      </details>
    </section>
  );
}

export function HistoryPanel({ project }: { project: BriefProject }) {
  const events = [...project.history].reverse();
  const revisions = [...project.watch.revisions].reverse();
  return (
    <section className="studio-panel" data-screen="history">
      <ol className="timeline">
        {events.map((event) => (
          <li key={`${event.version}-${event.kind}-${event.at}`}>
            <span>{historyDate(event.at)}</span>
            <p>{historyLine(event)}</p>
          </li>
        ))}
        {revisions.map((revision) => (
          <li key={`${revision.version}-${revision.at}`}>
            <span>{historyDate(revision.at)}</span>
            <p>{revision.summary}</p>
          </li>
        ))}
      </ol>
      {events.length === 0 && revisions.length === 0 ? <p>No history yet.</p> : null}
    </section>
  );
}

export function MarketWatch({ project, intelligence }: { project: BriefProject; intelligence: ProjectIntelligence }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const cards = competitorCards(project);
  const open = project.watch.competitors.find((competitor) => competitor.id === openId) ?? null;
  const search = project.watch.signals.filter((signal) => signal.sourceType === "search");
  const social = project.watch.signals.filter((signal) => signal.sourceType === "social");
  const news = project.watch.signals.filter((signal) => signal.sourceType === "news");
  const trends = project.watch.signals.filter((signal) => signal.sourceType === "market" || (/trend|theme/i.test(signal.type) && signal.sourceType !== "social"));
  const topics = [...new Set(project.watch.signals.flatMap((signal) => (signal.metadata.themes ?? "").split(/[,·]/).map((item) => item.trim()).filter(Boolean)))];
  const demo = project.watch.signals.some((signal) => signal.origin === "demo") || project.watch.competitors.some((competitor) => competitor.origin === "demo");
  return (
    <div data-screen="market-watch">
      <MarketDiscoveryPanel project={project} intelligence={intelligence} />
      <BadgeRow>
        <h3 className="intel-bucket">Competitors</h3>
        {demo ? <p className="provenance card-badge" data-origin="demo">Demo</p> : null}
      </BadgeRow>
      {cards.length === 0 ? <p>None</p> : null}
      {cards.map((card) => (
        <article key={card.id} className="intel-card" data-screen="competitor">
          <h3>{card.name}</h3>
          {card.channel ? <p>{card.channel}</p> : null}
          {card.followers ? <p className="studio-meta">{card.followers}</p> : null}
          {card.recentChange ? <p><span className="intel-label">Recent change</span> {card.recentChange}</p> : null}
          {card.themes ? <p><span className="intel-label">Themes</span> {card.themes}</p> : null}
          <ActionGroup className="card-actions">
            <button type="button" className="studio-text-button" onClick={() => setOpenId(card.id)}>Open competitor</button>
          </ActionGroup>
        </article>
      ))}
      <h3 className="intel-bucket">Trends</h3>
      {trends.length === 0 ? <p>None</p> : trends.map((signal) => <p key={signal.id}>{signal.title}</p>)}
      <h3 className="intel-bucket">Search / keywords</h3>
      {search.length === 0 ? <p>None</p> : search.map((signal) => <p key={signal.id}>{signal.title}</p>)}
      <h3 className="intel-bucket">Social patterns</h3>
      {social.length === 0 ? <p>None</p> : social.map((signal) => <p key={signal.id}>{signal.title}</p>)}
      <h3 className="intel-bucket">News</h3>
      {news.length === 0 ? <p>None</p> : news.map((signal) => <p key={signal.id}>{signal.title}</p>)}
      <h3 className="intel-bucket">Watched topics</h3>
      {topics.length === 0 ? <p>None</p> : <p>{topics.join(" · ")}</p>}
      {open ? (
        <Overlay variant="modal" title={open.name} testId="competitor-modal" onClose={() => setOpenId(null)}>
          {open.website ? <p>{open.website}</p> : null}
          {open.snapshots.map((snapshot) => <p key={snapshot.at}><span className="intel-label">{snapshot.at.slice(0, 10)}</span> {snapshot.note}</p>)}
        </Overlay>
      ) : null}
    </div>
  );
}
