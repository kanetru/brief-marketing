import { EvidenceNote } from "./EvidenceNote";
import { TerritoryStage } from "./TerritoryStage";
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
        <h1>Client creative picture</h1>
        <p className="profile-summary">
          Two directions to explore, with the client's reaction and the evidence underneath. Not a finished identity.
        </p>
      </header>

      <TerritoryBrief intelligence={intelligence} feedback={feedback} />
      <StartingPoint intelligence={intelligence} />
      <BeforeAfter intelligence={intelligence} feedback={feedback} />
      <BrandSignalBrief intelligence={intelligence} />

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
          const spec = intelligence.visualSpecs.find((item) => item.territoryId === territory.id) ?? intelligence.visualSpecs[index];
          const reaction = feedback.reactions.find((item) => item.territoryId === territory.id);
          return (
            <article key={territory.id} className="handover-territory">
              {spec ? (
                <div className="handover-stage">
                  <TerritoryStage spec={spec} index={index} label={territory.name} mode="handover" />
                </div>
              ) : null}
              <p>Client response: {reaction ? reactionLabel(reaction.response) : "No reaction yet."}{reaction?.note ? ` — ${reaction.note}` : ""}</p>
              <p className="territory-why">{territory.rationale}</p>
              <details className="why-block">
                <summary>Why it was generated</summary>
                {territory.supportingEvidence.length === 0 ? (
                  <p className="profile-summary">Exploratory. The evidence is still thin.</p>
                ) : (
                  <ul>
                    {territory.supportingEvidence.map((item) => (
                      <li key={`${item.source}-${item.summary}`}>{item.summary}</li>
                    ))}
                  </ul>
                )}
              </details>
              <h3>Image direction</h3>
              <p>{territory.imageryDirection.summary}</p>
              <ul className="working-list">
                {territory.imageryDirection.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <h3>Graphic language</h3>
              <ul className="working-list">
                {territory.stylingNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <h3>Voice</h3>
              <p>{territory.voiceDirection.characteristics.join(" · ")}</p>
              <p className="territory-phrase">{territory.examplePhrases[0]}</p>
              <p className="stage-example">Example line</p>
              <h3>Avoid</h3>
              <ul className="working-list">
                {(territory.imageryDirection.avoid.length > 0 ? territory.imageryDirection.avoid : territory.hardAvoidsRespected).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StartingPoint({ intelligence }: { intelligence: BrandIntelligence }) {
  const point = intelligence.startingPoint;
  return (
    <section className="handover-section">
      <h2>Creative starting point</h2>
      <p className="profile-summary">{point.headline}</p>
      <div className="working-point">
        <Point title="Feel" body={point.feel.join(" · ")} />
        <Point title="Type to explore" body={point.typeToExplore.join(" · ")} why={point.why.type} whyLabel="Why this type?" />
        <Point title="Colour to explore" body={point.colourToExplore.map((colour) => `${colour.name} (${colour.hex})`).join(" · ")} why={point.why.colour} whyLabel="Why this colour?" />
        <Point title="Image direction" body={point.imageDirection.join(" · ")} why={point.why.imagery} whyLabel="Why this imagery?" />
        <Point title="Graphic language" body={point.graphicLanguage.join(" · ")} why={point.why.graphic} whyLabel="Why this graphic language?" />
        <Point title="Voice" body={point.voice.join(" · ")} why={point.why.voice} whyLabel="Why this voice?" />
        {point.examplePhrase ? <p className="territory-phrase">Example: {point.examplePhrase}</p> : null}
        <Point title="Avoid" body={point.avoid.join(" · ")} />
        <Point title="Still open" body={point.stillOpen.join(" ")} />
      </div>
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

function Point({ title, body, why, whyLabel }: { title: string; body: string; why?: string[]; whyLabel?: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{body || "Still open."}</p>
      {why && why.length > 0 ? (
        <details className="why-block">
          <summary>{whyLabel ?? "Why?"}</summary>
          <ul>
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function BeforeAfter({ intelligence, feedback }: { intelligence: BrandIntelligence; feedback: TerritoryFeedback }) {
  if (feedback.reactions.length === 0 && !feedback.preference) return null;
  const before = intelligence.draftModel.signals.filter((signal) => signal.polarity === "positive").slice(0, 6);
  const after = intelligence.model.signals.filter((signal) => signal.polarity === "positive").slice(0, 6);
  return (
    <section className="handover-section">
      <h2>Before and after the reaction</h2>
      <p className="profile-summary">The pre-reaction model is kept. The reaction refines the starting point and does not erase what came before.</p>
      <div className="shift-grid">
        <div>
          <h3>Before</h3>
          <p>{intelligence.draftTerritories.map((territory) => territory.name).join(" · ")}</p>
          <ul className="working-list">
            {before.map((signal) => (
              <li key={signal.dimension}>{signal.dimension} · {strengthLabel(signal.strength)}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>After</h3>
          <p>{intelligence.territories.map((territory) => territory.name).join(" · ")}</p>
          <ul className="working-list">
            {after.map((signal) => (
              <li key={signal.dimension}>{signal.dimension} · {strengthLabel(signal.strength)}</li>
            ))}
          </ul>
        </div>
      </div>
      <p>Preference: {preferenceLabel(feedback.preference, intelligence)}</p>
    </section>
  );
}

function preferenceLabel(preference: string | null, intelligence: BrandIntelligence): string {
  if (!preference) return "Not chosen.";
  if (preference === "mix") return "A mix of both.";
  if (preference === "neither") return "Neither.";
  if (preference === "guidance") return "They want guidance.";
  return intelligence.territories.find((territory) => territory.id === preference)?.name ?? preference;
}

function reactionLabel(response: string): string {
  if (response === "very_close") return "Very close.";
  if (response === "something_here") return "There's something here.";
  return "Not really us.";
}
