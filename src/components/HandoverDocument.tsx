import { EvidenceNote } from "./EvidenceNote";
import { TerritoryCard } from "./TerritoryCard";
import { strengthLabel } from "../domain/brandSignals";
import type { DiscoveryEvidence } from "../domain/evidence";
import { describeEvidence } from "../domain/evidenceLabels";
import type { BrandIntelligence } from "../types/brandIntelligence";
import type { NarrativeSection, ProfileClarification, ProfileContent, ProfileStatement, TerritoryFeedback } from "../types/discovery";

export function HandoverDocument({
  content,
  evidence,
  clarifications,
  intelligence,
  feedback,
}: {
  content: ProfileContent;
  evidence: DiscoveryEvidence;
  clarifications: ProfileClarification[];
  intelligence: BrandIntelligence;
  feedback: TerritoryFeedback;
}) {
  return (
    <article className="handover-doc">
      <header className="handover-mast">
        <p className="profile-kicker">Media manager handover</p>
        <h1>What we heard</h1>
        <p className="profile-summary">
          Evidence, signals, and creative territories to explore. Not a finished identity, and not an instruction to use one direction.
        </p>
      </header>

      <BrandSignalBrief intelligence={intelligence} />
      <TerritoryBrief intelligence={intelligence} feedback={feedback} />
      <StartingPoint intelligence={intelligence} />

      <div className="handover-grid cols-3">
        <Snapshot title="Business" section={content.businessSummary} evidence={evidence} clarifications={clarifications} />
        <Snapshot title="Audience" section={content.audienceSummary} evidence={evidence} clarifications={clarifications} />
        <Snapshot title="Marketing priorities" section={content.marketingGoals} evidence={evidence} clarifications={clarifications} />
      </div>

      <SignalList
        title="Strong signals"
        empty="Nothing was consistent enough to call out as a strong pattern."
        items={content.strongSignals}
        evidence={evidence}
        clarifications={clarifications}
      />

      <section className="handover-section">
        <h2>Things they explicitly don't want</h2>
        {content.hardAvoids.length === 0 ? (
          <p className="profile-summary">They did not explicitly reject a direction in the sections that record avoids.</p>
        ) : (
          <ul className="avoid-list">
            {content.hardAvoids.map((item) => (
              <li key={`${item.sourcePath}-${item.detail}`}>
                <span>{item.label}</span>
                {item.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SignalList
        title="Mixed signals"
        empty="No tension was strong enough to call out."
        items={content.mixedSignals}
        evidence={evidence}
        clarifications={clarifications}
      />

      <SignalList
        title="Open questions"
        empty="Nothing was left explicitly unresolved."
        items={content.unresolvedQuestions}
        evidence={evidence}
        clarifications={clarifications}
      />

      <section className="handover-section">
        <h2>Worth discussing first</h2>
        {content.discussionPoints.length === 0 ? (
          <p className="profile-summary">No extra conversation prompt was strong enough to add.</p>
        ) : (
          <ol className="discuss-list">
            {content.discussionPoints.map((point) => (
              <li key={point.id}>
                <p>{point.prompt}</p>
                <EvidenceNote references={point.evidenceReferences} evidence={evidence} clarifications={clarifications} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="handover-grid cols-2">
        <Snapshot title="Visual signals" section={content.visualPreferences} evidence={evidence} clarifications={clarifications} />
        <Snapshot title="Colour" section={content.colourPreferences} evidence={evidence} clarifications={clarifications} />
        <Snapshot title="Typography" section={content.typographyPreferences} evidence={evidence} clarifications={clarifications} />
        <Snapshot title="Imagery" section={content.imageryPreferences} evidence={evidence} clarifications={clarifications} />
      </div>

      <Snapshot title="Voice" section={content.voicePreferences} evidence={evidence} clarifications={clarifications} />
      <Snapshot title="Inspiration" section={content.inspirationSummary} evidence={evidence} clarifications={clarifications} />

      <details className="raw-discovery">
        <summary>Original answers</summary>
        <ul>
          {listedPaths(evidence).map((path) => (
            <li key={path}>{describeEvidence(path, evidence, clarifications)}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function Snapshot({
  title,
  section,
  evidence,
  clarifications,
}: {
  title: string;
  section: NarrativeSection;
  evidence: DiscoveryEvidence;
  clarifications: ProfileClarification[];
}) {
  if (!section.summary && section.statements.length === 0) return null;
  const references = unique(section.statements.flatMap((item) => item.evidenceReferences));
  return (
    <section className="handover-section">
      <h2>{title}</h2>
      {section.summary ? <p className="profile-summary">{section.summary}</p> : null}
      <EvidenceNote references={references} evidence={evidence} clarifications={clarifications} />
    </section>
  );
}

function SignalList({
  title,
  empty,
  items,
  evidence,
  clarifications,
}: {
  title: string;
  empty: string;
  items: ProfileStatement[];
  evidence: DiscoveryEvidence;
  clarifications: ProfileClarification[];
}) {
  return (
    <section className="handover-section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="profile-summary">{empty}</p>
      ) : (
        <ul className="signal-list">
          {items.map((item) => (
            <li key={item.id}>
              <p>{item.statement}</p>
              <p className="signal-status">{statusLabel(item.status)}</p>
              <EvidenceNote references={item.evidenceReferences} evidence={evidence} clarifications={clarifications} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusLabel(status: ProfileStatement["status"]): string {
  if (status === "direct") return "From what they said";
  if (status === "strong_pattern") return "A repeated pattern";
  if (status === "possible_pattern") return "A possible pattern";
  if (status === "tension") return "A tension";
  return "Explicitly unresolved";
}

function listedPaths(evidence: DiscoveryEvidence): string[] {
  return [
    ...Object.keys(evidence.clientSaid),
    ...Object.keys(evidence.clientSelected),
    ...Object.keys(evidence.clientRejected),
    ...evidence.clientMarkedUnknown,
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function BrandSignalBrief({ intelligence }: { intelligence: BrandIntelligence }) {
  const model = intelligence.model;
  return (
    <section className="handover-section">
      <h2>Brand signal</h2>
      <div className="handover-grid cols-3">
        <SignalColumn title="Semantic" signals={model.signals.filter((signal) => signal.group === "semantic" && signal.polarity === "positive")} />
        <SignalColumn title="Visual" signals={model.signals.filter((signal) => signal.group === "visual" && signal.polarity === "positive")} />
        <SignalColumn title="Verbal" signals={model.signals.filter((signal) => signal.group === "verbal" && signal.polarity === "positive")} />
      </div>
      <h3>Hard avoids</h3>
      {model.hardAvoids.length === 0 ? <p className="profile-summary">No explicit rejection was strong enough to lock out.</p> : (
        <ul className="avoid-list">
          {model.hardAvoids.map((item) => (
            <li key={`${item.source}-${item.label}`}><span>{item.label}</span>{item.summary}</li>
          ))}
        </ul>
      )}
      <h3>Tensions</h3>
      {model.tensions.length === 0 ? <p className="profile-summary">No axis was supported on both sides.</p> : (
        <ul className="open-list">{model.tensions.map((tension) => <li key={`${tension.left}-${tension.right}`}>{tension.statement}</li>)}</ul>
      )}
      <h3>Uncertainty</h3>
      {model.uncertainty.length === 0 ? <p className="profile-summary">Nothing major was left unresolved by the signal model.</p> : (
        <ul className="open-list">{model.uncertainty.map((line) => <li key={line}>{line}</li>)}</ul>
      )}
    </section>
  );
}

function SignalColumn({ title, signals }: { title: string; signals: BrandIntelligence["model"]["signals"] }) {
  return (
    <div>
      <h3>{title}</h3>
      {signals.length === 0 ? <p className="profile-summary">Quiet.</p> : (
        <ul className="signal-pills">
          {signals.slice(0, 5).map((signal) => (
            <li key={signal.dimension}><span>{signal.dimension}</span><small>{strengthLabel(signal.strength)}</small></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TerritoryBrief({
  intelligence,
  feedback,
}: {
  intelligence: BrandIntelligence;
  feedback: TerritoryFeedback;
}) {
  return (
    <section className="handover-section">
      <h2>Creative territories</h2>
      <div className="territory-list">
        {intelligence.territories.map((territory, index) => {
          const reaction = feedback.reactions.find((item) => item.territoryId === territory.id);
          return (
            <TerritoryCard key={territory.id} territory={territory} index={index}>
              <p className="territory-why">Why it fits: {territory.supportingEvidence.map((item) => item.summary).join(" · ") || "Exploratory — the evidence is still thin."}</p>
              <p>Client reaction: {reaction ? reactionLabel(reaction.response) : "No reaction yet."}{reaction?.note ? ` ${reaction.note}` : ""}</p>
              {territory.typeDirection.candidates.length > 0 ? (
                <ul className="type-why">
                  {territory.typeDirection.candidates.map((candidate) => (
                    <li key={candidate.id}><strong>{candidate.name}</strong> — {candidate.why[0]}</li>
                  ))}
                </ul>
              ) : null}
            </TerritoryCard>
          );
        })}
      </div>
    </section>
  );
}

function StartingPoint({ intelligence }: { intelligence: BrandIntelligence }) {
  const brief = intelligence.workingBrief;
  return (
    <section className="handover-section">
      <h2>Creative starting point</h2>
      <p className="profile-summary">{brief.headline}</p>
      <dl className="territory-meta">
        <div><dt>Feel</dt><dd>{brief.feel}</dd></div>
        <div><dt>Colour to explore</dt><dd>{brief.colour}</dd></div>
        <div><dt>Type to explore</dt><dd>{brief.type}</dd></div>
        <div><dt>Imagery to explore</dt><dd>{brief.imagery}</dd></div>
        <div><dt>Voice to explore</dt><dd>{brief.voice}</dd></div>
        <div><dt>Avoid</dt><dd>{brief.avoid}</dd></div>
        <div><dt>Still open</dt><dd>{brief.stillOpen}</dd></div>
      </dl>
      <h3>First conversation</h3>
      {intelligence.firstConversation.length === 0 ? (
        <p className="profile-summary">Nothing further stood out as the first thing to discuss.</p>
      ) : (
        <ol className="discuss-list">
          {intelligence.firstConversation.map((line) => <li key={line}><p>{line}</p></li>)}
        </ol>
      )}
    </section>
  );
}

function reactionLabel(response: string): string {
  if (response === "very_close") return "Very close.";
  if (response === "something_here") return "There's something here.";
  return "Not for us.";
}
