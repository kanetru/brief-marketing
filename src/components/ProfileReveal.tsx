import type { ReactNode } from "react";
import { TerritoryCard } from "./TerritoryCard";
import { strengthLabel } from "../domain/brandSignals";
import type { BrandSignal, CreativeTerritory } from "../types/brandIntelligence";
import type { NarrativeSection, ProfileContent } from "../types/discovery";

type NarrativeKey = {
  [Key in keyof ProfileContent]: ProfileContent[Key] extends NarrativeSection ? Key : never;
}[keyof ProfileContent];

const CLIENT_SECTIONS: Array<{ key: NarrativeKey; label: string }> = [
  { key: "businessSummary", label: "The business" },
  { key: "audienceSummary", label: "People" },
  { key: "marketingGoals", label: "What they're working toward" },
  { key: "personalitySummary", label: "How they want to be experienced" },
  { key: "visualPreferences", label: "Visual signals" },
  { key: "colourPreferences", label: "Colour" },
  { key: "typographyPreferences", label: "Typography" },
  { key: "imageryPreferences", label: "Imagery" },
  { key: "voicePreferences", label: "Voice" },
];

export function ProfileReveal({
  content,
  assembled,
  signals,
  territories = [],
  renderTerritory,
  includeTerritories = false,
}: {
  content: ProfileContent;
  assembled: boolean;
  signals: BrandSignal[];
  territories?: CreativeTerritory[];
  renderTerritory?: (territory: CreativeTerritory, index: number) => ReactNode;
  includeTerritories?: boolean;
}) {
  const pull = content.businessSummary.summary.split(/(?<=\.)\s/)[0] ?? "";

  return (
    <div className="profile-doc">
      {pull ? <p className="profile-pull">{pull}</p> : null}
      {assembled ? (
        <p className="profile-note">This reading was assembled directly from your answers.</p>
      ) : null}
      <section className="profile-block">
        <p className="profile-kicker">What feels consistent</p>
        {signals.length === 0 ? (
          <p className="profile-summary">Nothing has repeated enough to call consistent yet.</p>
        ) : (
          <ul className="signal-pills">
            {signals.slice(0, 6).map((signal) => (
              <li key={signal.dimension}>
                <span>{signal.dimension}</span>
                <small>{strengthLabel(signal.strength)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      {includeTerritories ? (
        <div className="territory-list">
          {territories.map((territory, index) => (
            <TerritoryCard key={territory.id} territory={territory} index={index}>
              {renderTerritory ? renderTerritory(territory, index) : null}
            </TerritoryCard>
          ))}
        </div>
      ) : null}
      {CLIENT_SECTIONS.map((section) => {
        const narrative = content[section.key];
        if (!narrative || typeof narrative !== "object" || !("summary" in narrative) || !narrative.summary) return null;
        return (
          <section key={section.key} className="profile-block">
            <p className="profile-kicker">{section.label}</p>
            <p className="profile-summary">{narrative.summary}</p>
          </section>
        );
      })}
      {content.hardAvoids.length > 0 ? (
        <section className="profile-block">
          <p className="profile-kicker">Things to avoid</p>
          <h2 className="profile-heading">Things they explicitly don't want</h2>
          <ul className="avoid-list">
            {content.hardAvoids.map((item) => (
              <li key={`${item.sourcePath}-${item.detail}`}>
                <span>{item.label}</span>
                {item.detail}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="profile-block">
        <p className="profile-kicker">Still open</p>
        {content.unresolvedQuestions.length === 0 ? (
          <p className="profile-summary">Nothing here was left explicitly unresolved.</p>
        ) : (
          <ul className="open-list">
            {content.unresolvedQuestions.map((item) => (
              <li key={item.id}>{item.statement}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
