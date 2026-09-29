import { EvidenceNote } from "./EvidenceNote";
import type { DiscoveryEvidence } from "../domain/evidence";
import { describeEvidence } from "../domain/evidenceLabels";
import type { NarrativeSection, ProfileClarification, ProfileContent, ProfileStatement } from "../types/discovery";

export function HandoverDocument({
  content,
  evidence,
  clarifications,
}: {
  content: ProfileContent;
  evidence: DiscoveryEvidence;
  clarifications: ProfileClarification[];
}) {
  return (
    <article className="handover-doc">
      <header className="handover-mast">
        <p className="profile-kicker">Media manager handover</p>
        <h1>What we heard</h1>
        <p className="profile-summary">
          A reading of the client's evidence. It is not a brand strategy, and it does not decide the creative direction.
        </p>
      </header>

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
