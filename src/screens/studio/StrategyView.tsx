import { useEffect, useState, type ReactNode } from "react";
import { ActionGroup } from "../../components/ActionGroup";
import { CHANNEL_LABEL } from "../../domain/project/strategy/channels";
import type { ClientBrain } from "../../types/clientRead";
import type { StrategicPlan } from "../../types/strategy";

type Area = "read" | "matters" | "customer" | "channels" | "content" | "plan" | "unknown";

export function StrategyView({
  area,
  plan,
  brain,
  insight,
  openQuestions,
  onReread,
  onSave,
}: {
  area: Area;
  plan: StrategicPlan;
  brain: ClientBrain;
  insight: string;
  openQuestions: string[];
  onReread: () => Promise<void>;
  onSave: (fieldId: string, text: string, status: "approved" | "edited" | "rejected") => void;
}) {
  const live = brain.source === "live_model";
  const output = brain.output;
  return (
    <section className="studio-panel">
      {import.meta.env.DEV ? (
        <p className="studio-kicker" data-strategist={brain.source}>
          Strategist: {live ? `live model${brain.model ? ` · ${brain.model}` : ""}` : "local fallback"}
          {brain.stale ? " · new evidence since this reading" : ""}
        </p>
      ) : null}
      {area === "read" ? (
        <>
          <h2>The read</h2>
          <p className="read-prose">{output.clientRead}</p>
          {live && output.clientReadEvidenceIds.length > 0 ? <p className="studio-meta">Tied to {output.clientReadEvidenceIds.join(", ")}</p> : null}
          {brain.challenges.map((line) => <p key={line} className="studio-meta">{line}</p>)}
          <ActionGroup>
            <button type="button" className="studio-button" onClick={() => void onReread()}>Read this client</button>
          </ActionGroup>
          {insight ? <p className="studio-meta">From the market: {insight}</p> : null}
        </>
      ) : null}
      {area === "matters" ? (
        <>
          <h2>What matters</h2>
          {output.observations.length === 0 ? <p>Nothing here until a model has read the client. The rules are not standing in for that.</p> : null}
          {output.observations.map((item) => (
            <article key={item.id} className="studio-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="studio-meta">{item.evidenceIds.join(", ")}</p>
              <ActionGroup className="card-actions">
                <button type="button" className="studio-text-button" onClick={() => onSave(`client.observation.${item.id}`, item.body, "rejected")}>Set aside</button>
              </ActionGroup>
            </article>
          ))}
          {output.tensions.length > 0 ? <h3>Things that don't quite line up</h3> : null}
          {output.tensions.filter((item) => item.managerDecision !== "rejected").map((item) => (
            <article key={item.id} className="studio-card">
              <p>{item.observation}</p>
              <p>{item.sideA}</p>
              <p>{item.sideB}</p>
              <p className="studio-meta">{item.whyItMatters}</p>
              <p className="studio-meta">Hypothesis · {item.managerDecision}</p>
              <ActionGroup className="card-actions">
                <button type="button" className="studio-button" onClick={() => onSave(`client.tension.${item.id}`, item.observation, "approved")}>Approve</button>
                <button type="button" className="studio-text-button" onClick={() => onSave(`client.tension.${item.id}`, item.observation, "rejected")}>Reject</button>
                <button type="button" className="studio-text-button" onClick={() => onSave(`client.tension.${item.id}`, `${item.observation}\n\nInvestigate.`, "edited")}>Investigate</button>
              </ActionGroup>
            </article>
          ))}
          {output.hypotheses.filter((item) => item.managerDecision !== "rejected").map((item) => (
            <article key={item.id} className="studio-card">
              <p className="studio-kicker">Hypothesis · approving this does not make it a fact</p>
              <p>{item.statement}</p>
              <ActionGroup className="card-actions">
                <button type="button" className="studio-button" onClick={() => onSave(`client.hypothesis.${item.id}`, item.statement, "approved")}>Approve direction</button>
                <button type="button" className="studio-text-button" onClick={() => onSave(`client.hypothesis.${item.id}`, item.statement, "rejected")}>Reject</button>
              </ActionGroup>
            </article>
          ))}
        </>
      ) : null}
      {area === "customer" ? <Customer plan={plan} /> : null}
      {area === "channels" ? <Channels live={live} brain={brain} plan={plan} /> : null}
      {area === "content" ? <Content live={live} brain={brain} plan={plan} /> : null}
      {area === "plan" ? <Plan live={live} brain={brain} plan={plan} onSave={onSave} /> : null}
      {area === "unknown" ? (
        <>
          <h2>What we don't know</h2>
          {output.unknowns.length === 0 && openQuestions.length === 0 ? <p>Nothing unresolved is strong enough to list.</p> : null}
          <ul className="studio-questions">
            {output.unknowns.map((item) => <li key={item.id}>{item.question} <span>{item.whyItMatters}</span></li>)}
            {output.unknowns.length === 0 ? openQuestions.map((item) => <li key={item}>{item}</li>) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Customer({ plan }: { plan: StrategicPlan }) {
  const audience = plan.audience;
  const rows: Array<[string, string]> = [
    ["When they start looking", audience.situation],
    ["What they want afterwards", audience.desiredOutcome],
    ["What makes them hesitate", audience.anxieties],
    ["What they dislike", audience.frustrations],
    ["What they need to believe", audience.trustSignals],
    ["Where they are when they find you", audience.awarenessState === "unknown" ? "" : audience.awarenessState.replaceAll("_", " ")],
    ["What they lean toward", audience.attractionSignals.join(", ")],
  ].filter((row): row is [string, string] => Boolean(row[1].trim()));
  return (
    <div>
      <h2>The customer</h2>
      <p>{audience.identitySignals || "Who this should matter to has not been said."}</p>
      {rows.length === 0 ? <p>How they decide is still unknown. No demographic profile has been invented.</p> : rows.map(([label, value]) => (
        <article key={label} className="studio-card">
          <p className="studio-kicker">{label}</p>
          <p>{value}</p>
        </article>
      ))}
    </div>
  );
}

function Channels({ live, brain, plan }: { live: boolean; brain: ClientBrain; plan: StrategicPlan }) {
  const groups = ["primary", "secondary", "test", "maintain", "deprioritise", "not_now"] as const;
  const reasoned = live ? brain.output.channels : [];
  return (
    <div>
      <h2>Where to show up</h2>
      {reasoned.length === 0 ? (
        <>
          <p>These are rule candidates. A model reading can accept, revise, or reject them. The ranking is not the decision.</p>
          {groups.map((priority) => {
            const items = plan.channels.filter((item) => item.priority === priority);
            if (items.length === 0) return null;
            return (
              <section key={priority}>
                <h3>{priority.replace("_", " ")}</h3>
                {items.map((item) => (
                  <article key={item.channel} className="studio-card">
                    <p className="studio-kicker">{CHANNEL_LABEL[item.channel]} · candidate</p>
                    <p>{item.role}</p>
                    <p className="studio-meta">{item.why}</p>
                  </article>
                ))}
              </section>
            );
          })}
        </>
      ) : groups.map((priority) => {
        const items = reasoned.filter((item) => item.priority === priority);
        if (items.length === 0) return null;
        return (
          <section key={priority}>
            <h3>{priority.replace("_", " ")}</h3>
            {items.map((item) => (
              <article key={item.channel} className="studio-card">
                <p className="studio-kicker">{CHANNEL_LABEL[item.channel]}</p>
                <p>{item.role}</p>
                <p>{item.why}</p>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Content({ live, brain, plan }: { live: boolean; brain: ClientBrain; plan: StrategicPlan }) {
  const territories = live && brain.output.territories.length > 0 ? brain.output.territories : [];
  return (
    <div>
      <h2>What to talk about</h2>
      {territories.length === 0 ? (
        <>
          <p>Rule candidates only. They are not the content strategy until a reading adopts or replaces them.</p>
          {plan.territories.map((item) => (
            <article key={item.id} className="studio-card">
              <h3>{item.name}</h3>
              <p>{item.idea}</p>
              <p className="studio-meta">Candidate. Avoid: {item.risk}</p>
            </article>
          ))}
        </>
      ) : territories.map((item) => (
        <article key={item.id} className="studio-card">
          <h3>{item.name}</h3>
          <p>{item.idea}</p>
          <p className="studio-meta">{item.audienceNeed}</p>
          <p className="studio-meta">{item.purpose}</p>
          <p className="studio-meta">Avoid: {item.risk}</p>
        </article>
      ))}
    </div>
  );
}

function Plan({
  live,
  brain,
  plan,
  onSave,
}: {
  live: boolean;
  brain: ClientBrain;
  plan: StrategicPlan;
  onSave: (fieldId: string, text: string, status: "approved" | "edited" | "rejected") => void;
}) {
  const goal = plan.goals[0];
  const reasoned = live ? brain.output.roadmap : [];
  return (
    <div>
      <h2>The plan</h2>
      {goal ? (
        <article className="studio-card">
          <p className="studio-kicker">What a good year would be · {goal.outcomeType}</p>
          <p>{goal.desiredOutcome || "Not said yet."}</p>
          <p>{goal.commercialImportance}</p>
        </article>
      ) : null}
      {live && brain.output.positioning.statement ? (
        <Editable
          kicker={`Position · hypothesis · ${brain.output.positioning.decisionStatus}. Approving does not make this a fact.`}
          original={brain.output.positioning.statement}
          onSave={(text, status) => onSave("client.positioning", text, status)}
        />
      ) : (
        <article className="studio-card">
          <p className="studio-kicker">A rule candidate for position, not the reading</p>
          <p>{plan.positioning.statement}</p>
        </article>
      )}
      {reasoned.length > 0 ? (
        <ol className="roadmap">
          {reasoned.map((stage) => (
            <li key={stage.id}>
              <p className="studio-kicker">{stage.horizon}</p>
              <h3>{stage.objective}</h3>
              <p>{stage.why}</p>
              <p className="studio-meta">{stage.success}</p>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p className="roadmap-rail">A possible sequence from the rules. The reading can replace it.</p>
          <ol className="roadmap">
            {plan.roadmap.map((stage) => (
              <li key={stage.id}>
                <p className="studio-kicker">{stage.marker} · {stage.horizon}</p>
                <p>{stage.objective}</p>
              </li>
            ))}
          </ol>
        </>
      )}
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
  useEffect(() => setText(original), [original]);
  const same = text.trim() === original.trim();
  return (
    <article className="studio-card">
      <p className="studio-kicker">{kicker}</p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} />
      {children}
      <ActionGroup className="card-actions">
        <button type="button" className="studio-button" onClick={() => onSave(text, same ? "approved" : "edited")}>
          {same ? "Approve direction" : "Save edit"}
        </button>
      </ActionGroup>
    </article>
  );
}
