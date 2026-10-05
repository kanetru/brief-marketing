import { CHANNEL_LABEL } from "../../domain/project/strategy/channels";
import type { IntelligenceItem, ManagerReaction } from "../../types/intelligence";
import type { ProjectIntelligence } from "../../types/project";
import type { StrategicPlan } from "../../types/strategy";

function Line({ title, text }: { title: string; text: string }) {
  const body = text.trim() || "Not set.";
  return (
    <article className="cheat-card">
      <h3>{title}</h3>
      <p>{body.length > 280 ? `${body.slice(0, 277).trim()}…` : body}</p>
    </article>
  );
}

export function StrategySummary({
  plan,
  questions,
}: {
  plan: StrategicPlan;
  questions: string[];
}) {
  const goal = plan.goals[0]?.desiredOutcome || plan.objective;
  const audience = [plan.audience.situation, plan.audience.desiredOutcome].filter(Boolean).join(" ");
  const channels = plan.channels
    .filter((item) => item.priority === "primary" || item.priority === "secondary")
    .map((item) => CHANNEL_LABEL[item.channel])
    .join(" · ");
  const direction = plan.territories.map((item) => item.name).filter(Boolean).join(" · ");
  const roadmap = plan.roadmap.map((item) => item.objective).filter(Boolean).slice(0, 3).join(" · ");
  return (
    <section className="studio-panel" data-screen="strategy-summary">
      <div className="cheat-grid">
        <Line title="Current goal" text={goal} />
        <Line title="Positioning" text={plan.positioning.statement} />
        <Line title="Audience" text={audience} />
        <Line title="Where to show up" text={channels} />
        <Line title="Content direction" text={direction} />
        <Line title="Roadmap" text={roadmap} />
        <Line title="Open questions" text={questions.slice(0, 4).join(" ")} />
      </div>
    </section>
  );
}

export function ContentDesk({
  plan,
  opportunities,
  saved,
}: {
  plan: StrategicPlan;
  opportunities: ProjectIntelligence["opportunities"];
  saved: Array<{ id: string; headline: string }>;
}) {
  const formats = [...new Set(plan.territories.flatMap((item) => item.formats).filter(Boolean))];
  const words = [...plan.language.owned, ...plan.language.customer, ...plan.language.search].filter(Boolean);
  return (
    <section className="studio-panel" data-screen="content-desk">
      <h3 className="intel-bucket">Content territories</h3>
      {plan.territories.length === 0 ? <p>None</p> : plan.territories.map((item) => (
        <article key={item.id} className="intel-card">
          <h3>{item.name}</h3>
          <p>{item.idea}</p>
        </article>
      ))}
      <h3 className="intel-bucket">Current opportunities</h3>
      {opportunities.length === 0 ? <p>None</p> : opportunities.map((item) => (
        <article key={item.id} className="intel-card">
          <h3>{item.title}</h3>
          <p>{item.why || item.action}</p>
        </article>
      ))}
      <h3 className="intel-bucket">Keywords / language</h3>
      <p>{words.length ? words.join(" · ") : "None"}</p>
      <h3 className="intel-bucket">Format opportunities</h3>
      <p>{formats.length ? formats.join(" · ") : "None"}</p>
      <h3 className="intel-bucket">Ideas saved from intelligence</h3>
      {saved.length === 0 ? <p>None</p> : saved.map((item) => <p key={item.id}>{item.headline}</p>)}
    </section>
  );
}

export function savedIdeas(items: IntelligenceItem[], reactions: ManagerReaction[]): Array<{ id: string; headline: string }> {
  const saved = new Set(reactions.filter((reaction) => reaction.action === "save").map((reaction) => reaction.targetId));
  return items.filter((item) => saved.has(item.id)).map((item) => ({ id: item.id, headline: item.headline }));
}
