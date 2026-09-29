import type { ReactNode } from "react";
import { VisualBoard } from "./VisualBoard";
import type { CreativeTerritory } from "../types/brandIntelligence";

export function TerritoryCard({
  territory,
  index,
  children,
}: {
  territory: CreativeTerritory;
  index: number;
  children?: ReactNode;
}) {
  const face = territory.typeDirection.candidates[0];
  const support = territory.typeDirection.candidates[1];
  return (
    <article className="territory-card" data-testid={`territory-${territory.id}`}>
      <div className="territory-board">
        <VisualBoard id={territory.previewDirectionId} />
        <div className="territory-swatches" aria-hidden="true">
          {territory.colourDirection.swatches.slice(0, 5).map((swatch) => (
            <span key={swatch} style={{ background: swatch }} />
          ))}
        </div>
      </div>
      <div className="territory-copy">
        <p className="profile-kicker">Territory {String(index + 1).padStart(2, "0")}</p>
        <h2 className="territory-name" style={{ fontFamily: face?.fontFamily }}>{territory.name}</h2>
        <p className="territory-idea">{territory.oneLineIdea}</p>
        <p className="territory-phrase" style={{ fontFamily: support?.fontFamily ?? face?.fontFamily }}>
          {territory.examplePhrases[0]}
        </p>
        <dl className="territory-meta">
          <div>
            <dt>Look</dt>
            <dd>{territory.colourDirection.name}. {territory.visualCharacter.join(", ")}</dd>
          </div>
          <div>
            <dt>Type to explore</dt>
            <dd>{territory.typeDirection.candidates.map((candidate) => candidate.name).join(", ") || territory.typeDirection.summary}</dd>
          </div>
          <div>
            <dt>Image</dt>
            <dd>{territory.imageryDirection.notes.slice(0, 3).join(" · ")}</dd>
          </div>
          <div>
            <dt>Voice</dt>
            <dd>{territory.voiceDirection.characteristics.join(" · ")}</dd>
          </div>
        </dl>
        <p className="territory-why">{territory.rationale}</p>
        {children}
      </div>
    </article>
  );
}
