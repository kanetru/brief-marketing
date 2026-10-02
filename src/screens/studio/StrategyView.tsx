import { useEffect, useState, type ReactNode } from "react";
import { CHANNEL_LABEL } from "../../domain/project/strategy/channels";
import type { ChannelPriority, StrategicPlan } from "../../types/strategy";

const AREAS = [
  ["goals", "Goals"],
  ["audience", "Audience"],
  ["journey", "Journey"],
  ["channels", "Channels"],
  ["content", "Content"],
  ["roadmap", "Roadmap"],
] as const;

const CHANNEL_GROUPS: Array<[ChannelPriority, string]> = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["test", "Test"],
  ["maintain", "Maintain"],
  ["deprioritise", "Deprioritise"],
  ["not_now", "Not now"],
];

type Area = (typeof AREAS)[number][0];

export function StrategyView({
  plan,
  insight,
  onSave,
}: {
  plan: StrategicPlan;
  insight: string;
  onSave: (fieldId: string, text: string, status: "approved" | "edited") => void;
}) {
  const [area, setArea] = useState<Area>("goals");
  return (
    <section className="studio-panel">
      <p className="studio-kicker">Derived from the discovery. Not a second copy.</p>
      <h2>Where this should go.</h2>
      <nav className="strategy-subnav" aria-label="Strategy">
        {AREAS.map(([id, label]) => (
          <button key={id} type="button" aria-current={area === id ? "page" : undefined} onClick={() => setArea(id)}>
            {label}
          </button>
        ))}
      </nav>
      {area === "goals" ? <Goals plan={plan} insight={insight} onSave={onSave} /> : null}
      {area === "audience" ? <Audience plan={plan} /> : null}
      {area === "journey" ? <Journey plan={plan} /> : null}
      {area === "channels" ? <Channels plan={plan} /> : null}
      {area === "content" ? <Content plan={plan} /> : null}
      {area === "roadmap" ? <Roadmap plan={plan} onSave={onSave} /> : null}
    </section>
  );
}

function Goals({
  plan,
  insight,
  onSave,
}: {
  plan: StrategicPlan;
  insight: string;
  onSave: (fieldId: string, text: string, status: "approved" | "edited") => void;
}) {
  const goal = plan.goals[0];
  return (
    <div className="studio-group">
      {goal ? (
        <Editable
          kicker={`${goal.outcomeType} · ${goal.targetDate} · ${goal.managerApproved ? "approved" : "unreviewed"}`}
          original={goal.desiredOutcome}
          onSave={(text, status) => onSave(goal.id, text, status)}
        >
          {goal.baseline && goal.target ? <p className="studio-meta">{goal.baseline} → {goal.target}. Only the numbers they gave.</p> : null}
          <p>{goal.commercialImportance}</p>
          {goal.constraints.length > 0 ? <p className="studio-meta">{goal.constraints.join(" ")}</p> : null}
        </Editable>
      ) : <p>No year has been named.</p>}
      <article className="studio-card">
        <p className="studio-kicker">Positioning · {plan.positioning.epistemicStatus} · {plan.positioning.decisionStatus}</p>
        <Editable
          kicker="Social position"
          original={plan.positioning.statement}
          onSave={(text, status) => onSave("strategy.positioning", text, status)}
        />
      </article>
      {insight ? <p className="studio-meta">Market: {insight}</p> : null}
      {plan.openQuestions.length > 0 ? (
        <ul className="studio-questions">
          {plan.openQuestions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function Audience({ plan }: { plan: StrategicPlan }) {
  const audience = plan.audience;
  const rows: Array<[string, string]> = [
    ["Situation", audience.situation],
    ["Afterwards", audience.desiredOutcome],
    ["Hesitation", audience.anxieties],
    ["What they dislike", audience.frustrations],
    ["What stops them", audience.objections],
    ["What they must believe", audience.trustSignals],
    ["Awareness", audience.awarenessState === "unknown" ? "" : audience.awarenessState.replaceAll("_", " ")],
    ["They lean toward", audience.attractionSignals.join(", ")],
  ];
  const filled = rows.filter(([, value]) => value.trim());
  return (
    <div className="studio-group">
      <p>No demographic persona. Demographics appear only when the client or the research actually supplied them.</p>
      {filled.length === 0 ? <p>The customer's situation is still unknown.</p> : filled.map(([label, value]) => (
        <article key={label} className="studio-card">
          <p className="studio-kicker">{label}</p>
          <p>{value}</p>
        </article>
      ))}
    </div>
  );
}

function Journey({ plan }: { plan: StrategicPlan }) {
  return (
    <ol className="journey">
      {plan.journey.map((stage) => (
        <li key={stage.id}>
          <p className="studio-kicker">{stage.stage}</p>
          <p>{stage.customerState}</p>
          <p className="studio-meta">Tension: {stage.tension}</p>
          <p className="studio-meta">Proof: {stage.proof}</p>
          <p className="studio-meta">Useful: {stage.content}</p>
          <p className="studio-meta">Where: {stage.channel}</p>
        </li>
      ))}
    </ol>
  );
}

function Channels({ plan }: { plan: StrategicPlan }) {
  return (
    <div className="studio-group">
      <h3>Where should we show up?</h3>
      {CHANNEL_GROUPS.map(([priority, label]) => {
        const items = plan.channels.filter((item) => item.priority === priority);
        if (items.length === 0) return null;
        return (
          <section key={priority} className="channel-group" data-priority={priority}>
            <h3>{label}</h3>
            {items.map((item) => (
              <article key={item.channel} className="studio-card">
                <p className="studio-kicker">{CHANNEL_LABEL[item.channel]}</p>
                <p>{item.role}</p>
                <p>{item.why}</p>
                <p className="studio-meta">For {item.forWhom}. Toward: {item.goal}</p>
                <p className="studio-meta">Limit: {item.limitation}</p>
                {item.needs.length > 0 ? <p className="studio-meta">Needs: {item.needs.join("; ")}</p> : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Content({ plan }: { plan: StrategicPlan }) {
  const language: Array<[string, string[]]> = [
    ["Owned", plan.language.owned],
    ["Customer", plan.language.customer],
    ["Category", plan.language.category],
    ["Search", plan.language.search],
    ["Clichés", plan.language.cliches],
    ["Avoid", plan.language.avoid],
  ];
  return (
    <div className="studio-group">
      {plan.territories.map((item) => (
        <article key={item.id} className="studio-card">
          <h3>{item.name}</h3>
          <p>{item.idea}</p>
          <p className="studio-meta">Need: {item.audienceNeed}</p>
          <p className="studio-meta">Purpose: {item.purpose}</p>
          <p className="studio-meta">Formats: {item.formats.join(", ")}</p>
          <p className="studio-meta">Needs: {item.assets.join(", ")}</p>
          <p className="studio-meta">Avoid: {item.risk}</p>
        </article>
      ))}
      {plan.proof.gaps.length > 0 ? (
        <article className="studio-card">
          <p className="studio-kicker">Proof still missing</p>
          {plan.proof.gaps.map((gap) => <p key={gap}>{gap}</p>)}
        </article>
      ) : null}
      {plan.collaborations.fits ? (
        <article className="studio-card">
          <p className="studio-kicker">Who belongs beside them</p>
          <p>{plan.collaborations.fits}</p>
          {plan.collaborations.wrong ? <p className="studio-meta">Wrong company: {plan.collaborations.wrong}</p> : null}
        </article>
      ) : null}
      <div className="studio-cards">
        {language.filter(([, values]) => values.length > 0).map(([label, values]) => (
          <article key={label} className="studio-card">
            <p className="studio-kicker">{label}</p>
            <p>{values.join(" · ")}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Roadmap({
  plan,
  onSave,
}: {
  plan: StrategicPlan;
  onSave: (fieldId: string, text: string, status: "approved" | "edited") => void;
}) {
  return (
    <div>
      <p className="roadmap-rail">Now → Build → Prove → Outcome</p>
      <ol className="roadmap">
        {plan.roadmap.map((stage) => (
          <li key={stage.id} data-marker={stage.marker}>
            <p className="studio-kicker">{stage.marker} · {stage.horizon} · {stage.phase}</p>
            <Editable
              kicker={stage.status}
              original={stage.objective}
              onSave={(text, status) => onSave(`roadmap.${stage.id}`, text, status)}
            >
              <p className="studio-meta">{stage.why}</p>
              <ul className="studio-questions">
                {stage.actions.map((action) => <li key={action}>{action}</li>)}
              </ul>
              <p className="studio-meta">Depends on: {stage.dependencies.join("; ")}</p>
              <p className="studio-meta">Signal: {stage.success}</p>
            </Editable>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Editable({
  kicker,
  original,
  onSave,
  children,
}: {
  kicker: string;
  original: string;
  onSave: (text: string, status: "approved" | "edited") => void;
  children?: ReactNode;
}) {
  const [text, setText] = useState(original);
  useEffect(() => {
    setText(original);
  }, [original]);
  const same = text.trim() === original.trim();
  return (
    <article className="studio-card">
      <p className="studio-kicker">{kicker}</p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} />
      {children}
      <div className="studio-row">
        <button type="button" className="studio-button" onClick={() => onSave(text, same ? "approved" : "edited")}>
          {same ? "Approve" : "Save edit"}
        </button>
      </div>
    </article>
  );
}
