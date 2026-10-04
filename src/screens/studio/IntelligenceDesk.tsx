import { useState } from "react";
import { assembleBrandBrain } from "../../domain/intelligence/brain";
import { runDueJobs } from "../../domain/intelligence/jobs";
import type { BriefProject, ProjectIntelligence } from "../../types/project";
import type { DataOrigin, IntelligenceItem, ManagerReaction, Signal } from "../../types/intelligence";

const ORIGIN: Record<DataOrigin, string> = {
  live: "Live",
  cached: "Cached",
  stale: "Stale",
  demo: "Demo data",
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

export function IntelligenceDesk({
  project,
  intelligence,
  onReact,
}: {
  project: BriefProject;
  intelligence: ProjectIntelligence;
  onReact: (reaction: ManagerReaction) => void;
}) {
  const [view, setView] = useState<"feed" | "morning" | "week">("feed");
  const [notice, setNotice] = useState("");
  const watch = project.watch;
  const reading = watch.readings[0] ?? null;
  const brain = assembleBrandBrain(project, intelligence);
  const origin = originOf(project);
  const competitors = watch.competitors.length;
  const search = watch.signals.filter((signal) => signal.sourceType === "search").length;
  const topics = watch.signals.filter((signal) => signal.sourceType === "news" || signal.sourceType === "market").length;
  const sites = watch.jobs.filter((job) => job.jobType === "website").length;
  const quiet = !reading || (reading.importantChanges.length === 0 && reading.opportunities.length === 0 && reading.challengedDecisions.length === 0);
  const empty = watch.signals.length === 0 && watch.jobs.length === 0;

  return (
    <section className="studio-panel intel" data-screen="intelligence">
      <p className="studio-kicker">Intelligence</p>
      <h2>Here's what I noticed.</h2>
      <p className="intel-sentence">{brain.currentStrategicRead}</p>
      <p className="studio-meta">Updated {watch.updatedAt.slice(0, 10)} · Watching {competitors} competitors · {search} search themes · {topics} market topics · {sites} websites</p>
      <p className="provenance" data-origin={origin}>{ORIGIN[origin]}{origin === "demo" ? " · Social counts, search, news, and prices are not live." : ""}</p>
      <p className="studio-meta">No background monitor is running. A check happens when you ask.</p>
      <div className="intel-switch">
        <button type="button" aria-current={view === "feed" ? "page" : undefined} onClick={() => setView("feed")}>The desk</button>
        <button type="button" aria-current={view === "morning" ? "page" : undefined} onClick={() => setView("morning")}>This morning</button>
        <button type="button" aria-current={view === "week" ? "page" : undefined} onClick={() => setView("week")}>The week</button>
        <button type="button" className="studio-text-button" onClick={() => {
          const next = runDueJobs(watch, new Date().toISOString(), () => ({ signals: [], error: "" }));
          const due = next.jobs.some((job, index) => job.lastRunAt !== watch.jobs[index]?.lastRunAt);
          setNotice(due ? "Checked what was due. Nothing new was fetched from a live provider." : "Nothing is due. The last check is still the one on screen.");
        }}>Check now</button>
      </div>
      {notice ? <p className="studio-notice">{notice}</p> : null}
      {view === "morning" ? <DailyBriefView project={project} /> : null}
      {view === "week" ? <WeeklyReadView project={project} /> : null}
      {view === "feed" ? (
        empty ? (
          <EmptyWatch />
        ) : quiet ? (
          <QuietState />
        ) : (
          <Feed readingItems={reading} reactions={watch.reactions} signals={watch.signals} onReact={onReact} />
        )
      ) : null}
    </section>
  );
}

function EmptyWatch() {
  return (
    <div className="intel-quiet" data-screen="nothing-to-watch">
      <h3>Nothing to watch yet.</h3>
      <p>Brief can hold what it knows about the brand. Add competitors and the topics that could matter, and it will start watching what changes around them.</p>
    </div>
  );
}

function QuietState() {
  return (
    <div className="intel-quiet" data-screen="nothing-changed">
      <h3>Nothing important changed.</h3>
      <p>Brief checked the sources being watched. Nothing moved enough to warrant your attention. That is a good day.</p>
    </div>
  );
}

function Feed({
  readingItems,
  reactions,
  signals,
  onReact,
}: {
  readingItems: NonNullable<BriefProject["watch"]["readings"][number]>;
  reactions: ManagerReaction[];
  signals: Signal[];
  onReact: (reaction: ManagerReaction) => void;
}) {
  const groups = [
    ["Today", [...readingItems.importantChanges, ...readingItems.opportunities.filter((item) => item.bucket === "today")]],
    ["This week", [...readingItems.opportunities.filter((item) => item.bucket !== "today"), ...readingItems.changedHypotheses, ...readingItems.challengedDecisions, ...readingItems.questions]],
    ["Watching", [...readingItems.watchItems, ...readingItems.thingsNotWorthReactingTo]],
  ] as const;
  return (
    <div>
      {groups.map(([label, items]) => items.length === 0 ? null : (
        <div key={label}>
          <h3 className="intel-bucket">{label}</h3>
          {items.map((item) => (
            <IntelligenceCard key={item.id} item={item} reactions={reactions} signals={signals.filter((signal) => item.signalIds.includes(signal.id))} onReact={onReact} />
          ))}
        </div>
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
  return (
    <article className="intel-card" data-testid="intel-card" data-kind={item.kind}>
      <p className="studio-kicker">{item.eyebrow}</p>
      <h3>{item.headline}</h3>
      <p className="provenance" data-origin={item.origin}>{ORIGIN[item.origin]}</p>
      <p className="intel-label">What happened</p>
      <p>{item.evidence}</p>
      {item.whyItMatters ? <><p className="intel-label">Why it matters</p><p>{item.whyItMatters}</p></> : null}
      {item.briefRead ? <><p className="intel-label">Brief's read</p><p className="intel-read">{item.briefRead}</p></> : null}
      {item.possibleMove ? <><p className="intel-label">Possible move</p><p>{item.possibleMove}</p></> : null}
      {item.epistemicStatus === "hypothesis" ? <p className="studio-meta">Hypothesis. Your approval would not make it a fact.</p> : null}
      {item.strategyRelation === "support" ? <p className="studio-meta">This supports the current hypothesis. It does not settle it.</p> : null}
      {item.strategyRelation === "challenge" ? <p className="studio-meta">This challenges an earlier read. You decide whether to revisit it.</p> : null}
      {item.strategyRelation === "not_affect" ? <p className="studio-meta">This does not affect the current strategy.</p> : null}
      {saved ? <p className="studio-notice">Saved. Brief will remember you wanted to keep this.</p> : null}
      {aside ? <p className="studio-notice">{aside.action === "investigate" ? "Marked to investigate." : "Set aside. Brief will not keep leading with it unless the evidence materially changes."}</p> : null}
      <div className="intel-actions">
        {actionable ? (
          <button type="button" className="studio-button" data-testid="save-opportunity" onClick={() => onReact(reaction(item.id, "save"))}>Save opportunity</button>
        ) : null}
        {actionable ? (
          <button type="button" className="studio-text-button" onClick={() => onReact(reaction(item.id, "investigate"))}>Investigate</button>
        ) : null}
        <button type="button" className="studio-text-button" onClick={() => onReact(reaction(item.id, "not_relevant"))}>Not relevant</button>
        <button type="button" className="studio-text-button" data-testid="dismiss-signal" onClick={() => onReact(reaction(item.id, "dismiss"))}>Dismiss</button>
        <button type="button" className="studio-text-button" data-testid="view-evidence" onClick={() => setOpen((value) => !value)}>{open ? "Hide evidence" : "View evidence"}</button>
      </div>
      {open ? (
        <div className="intel-drawer" data-testid="evidence-drawer">
          {signals.length === 0 ? <p>No signal is attached.</p> : null}
          {signals.map((signal) => (
            <p key={signal.id}><span className="provenance" data-origin={signal.origin}>{ORIGIN[signal.origin]}</span> {signal.description}</p>
          ))}
        </div>
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
  if (!brief) {
    return <div className="intel-quiet"><h3>No morning brief yet.</h3><p>It appears after a check has something, or nothing, to say.</p></div>;
  }
  return (
    <div data-screen="daily-brief">
      <p className="provenance" data-origin={brief.source === "demo" ? "demo" : brief.source === "live_model" ? "live" : "unavailable"}>{brief.source === "demo" ? "Demo data" : brief.source === "live_model" ? "Live model" : "Not read yet"}</p>
      <h3 className="intel-brief-title">{brief.greeting}</h3>
      <ol className="intel-brief-list">
        {brief.items.map((item, index) => (
          <li key={item.id}><span>{index + 1}</span><div><strong>{item.headline}</strong><p>{item.briefRead || item.evidence}</p></div></li>
        ))}
      </ol>
      <p className="intel-read">{brief.quietLine}</p>
    </div>
  );
}

export function WeeklyReadView({ project }: { project: BriefProject }) {
  const weekly = project.watch.weeklyReads[0];
  if (!weekly) return <div className="intel-quiet"><h3>No weekly read yet.</h3></div>;
  const blocks = [
    ["What persisted", weekly.persisted],
    ["What disappeared", weekly.disappeared],
    ["Where competitors converged", weekly.convergence],
    ["Customer language", weekly.customerLanguage],
    ["Search", weekly.searchMovement],
    ["Opportunities", weekly.opportunities],
    ["Hypotheses getting stronger", weekly.hypothesesStrengthened],
    ["Hypotheses getting weaker", weekly.hypothesesWeakened],
    ["Worth reconsidering", weekly.decisionsToReconsider],
  ] as const;
  return (
    <div data-screen="weekly-read">
      <p className="provenance" data-origin={weekly.source === "demo" ? "demo" : "unavailable"}>{weekly.source === "demo" ? "Demo data" : "Not a live read"} · {weekly.period}</p>
      <h3 className="intel-brief-title">The week, read slowly.</h3>
      {blocks.map(([title, lines]) => lines.length === 0 ? null : (
        <div key={title}>
          <p className="intel-label">{title}</p>
          {lines.map((line) => <p key={line}>{line}</p>)}
        </div>
      ))}
    </div>
  );
}

export function BrandBrainPanel({ project, intelligence }: { project: BriefProject; intelligence: ProjectIntelligence }) {
  const brain = assembleBrandBrain(project, intelligence);
  const rows = [
    ["Identity", brain.identity],
    ["The business", brain.business],
    ["What they want", brain.goals],
    ["Customers", brain.customers],
    ["How people decide", brain.customerJourney],
    ["Position", brain.positioning],
    ["Proof", brain.proof],
    ["What is still unknown", brain.unknowns.join(" ") || "Nothing listed."],
  ];
  return (
    <section className="studio-panel" data-screen="brand-brain">
      <p className="studio-kicker">Brand</p>
      <h2>What Brief understands.</h2>
      <p className="intel-read">{brain.narrative}</p>
      <p className="studio-meta">Version {brain.version} · {brain.evidenceIds.length} pieces of evidence · Updated {brain.updatedAt.slice(0, 10)}</p>
      {rows.map(([label, text]) => (
        <div key={label}>
          <p className="intel-label">{label}</p>
          <p>{text}</p>
        </div>
      ))}
      {brain.contradictions.length > 0 ? (
        <div>
          <p className="intel-label">Contradictions</p>
          {brain.contradictions.map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : null}
      <p className="studio-meta">{brain.currentStrategicRead}</p>
    </section>
  );
}

export function HistoryPanel({ project }: { project: BriefProject }) {
  const revisions = [...project.watch.revisions].reverse();
  return (
    <section className="studio-panel" data-screen="history">
      <p className="studio-kicker">History</p>
      <h2>What changed, and why.</h2>
      <p>Earlier reads stay. A new observation does not rewrite them.</p>
      {revisions.length === 0 ? <p>No revision is stored yet.</p> : null}
      {revisions.map((revision) => (
        <article key={`${revision.version}-${revision.at}`} className="intel-card">
          <p className="studio-kicker">{revision.summary} · {revision.at.slice(0, 10)}</p>
          {revision.previous ? <p><span className="intel-label">Before</span> {revision.previous}</p> : null}
          <p>{revision.current}</p>
          <p className="studio-meta">{revision.why}</p>
        </article>
      ))}
      <h3 className="intel-bucket">Project</h3>
      <ul className="studio-evidence">
        {[...project.history].reverse().map((event) => (
          <li key={`${event.version}-${event.kind}`}><span>{event.at.slice(0, 10)} · {event.kind}</span>{event.note}</li>
        ))}
      </ul>
    </section>
  );
}

export function MarketWatch({ project }: { project: BriefProject }) {
  const search = project.watch.signals.filter((signal) => signal.sourceType === "search");
  const news = project.watch.signals.filter((signal) => signal.sourceType === "news" || signal.sourceType === "market");
  return (
    <div data-screen="market-watch">
      <p className="provenance" data-origin="demo">Demo data · Search, social, news, and prices below are a sample. Website pages you research are a separate, stored extract.</p>
      <h3 className="intel-bucket">Competitors being watched</h3>
      {project.watch.competitors.length === 0 ? <p>No competitor is on a watch yet.</p> : null}
      {project.watch.competitors.map((competitor) => (
        <article key={competitor.id} className="intel-card" data-screen="competitor">
          <p className="studio-kicker">{competitor.relationship} · {ORIGIN[competitor.origin]}</p>
          <h3>{competitor.name}</h3>
          {competitor.snapshots.map((snapshot) => (
            <p key={snapshot.at}><span className="intel-label">{snapshot.at.slice(0, 10)}</span> {snapshot.note}</p>
          ))}
        </article>
      ))}
      <h3 className="intel-bucket">Search</h3>
      {search.length === 0 ? <p>No search theme is being watched.</p> : null}
      {search.map((signal) => (
        <p key={signal.id}><span className="provenance" data-origin={signal.origin}>{ORIGIN[signal.origin]}</span> {signal.title}. {signal.description}</p>
      ))}
      <h3 className="intel-bucket">News and prices</h3>
      {news.length === 0 ? <p>Nothing in the category was kept.</p> : null}
      {news.map((signal) => (
        <p key={signal.id}><span className="provenance" data-origin={signal.origin}>{ORIGIN[signal.origin]}</span> {signal.description}</p>
      ))}
    </div>
  );
}
