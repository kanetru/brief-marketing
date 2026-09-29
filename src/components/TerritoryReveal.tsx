import { useEffect, useState } from "react";
import type { CreativeTerritory, TerritoryVisualSpec } from "../types/brandIntelligence";
import type { TerritoryReactionResponse } from "../types/discovery";
import { visualForkIsClear } from "../domain/territoryVisual";
import { TerritoryStage } from "./TerritoryStage";

export type RevealBeat = { kind: "seeing" } | { kind: "fork" } | { kind: "territory"; index: number } | { kind: "compare" };

export function TerritoryReveal({
  territories,
  specs,
  reactions,
  preference,
  onReact,
  onPrefer,
  onBeat,
}: {
  territories: CreativeTerritory[];
  specs: TerritoryVisualSpec[];
  reactions: Array<{ territoryId: string; response: TerritoryReactionResponse; note: string }>;
  preference: string | null;
  onReact: (territoryId: string, response: TerritoryReactionResponse, note: string) => void;
  onPrefer: (preference: string) => void;
  onBeat?: (beat: RevealBeat) => void;
}) {
  const [beat, setBeat] = useState<RevealBeat>({ kind: "seeing" });
  const clear = visualForkIsClear(specs);

  useEffect(() => {
    onBeat?.(beat);
  }, [beat, onBeat]);

  useEffect(() => {
    if (beat.kind !== "seeing") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setBeat({ kind: "fork" }), 1400);
    return () => window.clearTimeout(timer);
  }, [beat.kind]);

  function nextFrom(index: number) {
    if (index + 1 < territories.length) setBeat({ kind: "territory", index: index + 1 });
    else setBeat({ kind: "compare" });
  }

  return (
    <div className="territory-reveal" data-fork={clear ? "clear" : "close"} data-beat={beat.kind}>
      {beat.kind === "seeing" ? (
        <div className="reveal-beat">
          <button type="button" className="text-button reveal-next" onClick={() => setBeat({ kind: "fork" })}>
            Continue
          </button>
        </div>
      ) : null}

      {beat.kind === "fork" ? (
        <div className="reveal-beat">
          <p className="reveal-count">{territories.length === 1 ? "One territory" : `${territories.length} territories`}</p>
          <button type="button" className="text-button reveal-next" onClick={() => setBeat({ kind: "territory", index: 0 })}>
            Show the first territory
          </button>
        </div>
      ) : null}

      {beat.kind === "territory" ? (
        <TerritoryBeat
          territory={territories[beat.index]}
          spec={specs[beat.index]}
          index={beat.index}
          reaction={reactions.find((item) => item.territoryId === territories[beat.index]?.id)}
          onReact={onReact}
          onPrevious={() => setBeat(beat.index === 0 ? { kind: "fork" } : { kind: "territory", index: beat.index - 1 })}
          onNext={() => nextFrom(beat.index)}
          nextLabel={beat.index + 1 < territories.length ? "Next territory" : "Compare them"}
        />
      ) : null}

      {beat.kind === "compare" ? (
        <div className="reveal-beat">
          <div className="territory-compare">
            {territories.map((territory, index) => {
              const spec = specs[index];
              if (!spec) return null;
              return <TerritoryStage key={territory.id} spec={spec} index={index} label={territory.name} mode="compare" />;
            })}
          </div>
          <DirectionPick territories={territories} preference={preference} onPick={onPrefer} />
          <button type="button" className="text-button reveal-previous" onClick={() => setBeat({ kind: "territory", index: Math.max(0, territories.length - 1) })}>
            Back to the last territory
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TerritoryBeat({
  territory,
  spec,
  index,
  reaction,
  onReact,
  onPrevious,
  onNext,
  nextLabel,
}: {
  territory: CreativeTerritory | undefined;
  spec: TerritoryVisualSpec | undefined;
  index: number;
  reaction: { response: TerritoryReactionResponse; note: string } | undefined;
  onReact: (territoryId: string, response: TerritoryReactionResponse, note: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  if (!territory || !spec) return null;
  return (
    <div className="reveal-beat">
      <TerritoryStage spec={spec} index={index} label={territory.name} mode="immersive" />
      <Reaction
        territoryId={territory.id}
        response={reaction?.response ?? null}
        note={reaction?.note ?? ""}
        onRespond={(response, note) => onReact(territory.id, response, note)}
      />
      <div className="reveal-actions">
        <button type="button" className="text-button reveal-previous" onClick={onPrevious}>
          Previous
        </button>
        <button type="button" className="text-button reveal-next" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function Reaction({
  territoryId,
  response,
  note,
  onRespond,
}: {
  territoryId: string;
  response: TerritoryReactionResponse | null;
  note: string;
  onRespond: (response: TerritoryReactionResponse, note: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  useEffect(() => {
    setDraft(note);
  }, [note, territoryId]);
  const options: Array<{ id: TerritoryReactionResponse; label: string }> = [
    { id: "very_close", label: "Very close" },
    { id: "something_here", label: "There's something here" },
    { id: "not_for_us", label: "Not really us" },
  ];
  return (
    <div className="territory-reaction">
      <p>How does this feel?</p>
      <div className="reaction-row">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="reaction-button"
            aria-pressed={response === option.id}
            onClick={() => onRespond(option.id, draft)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="reaction-note">
        <span>What feels right or wrong?</span>
        <input
          value={draft}
          aria-label={`Note on ${territoryId}`}
          placeholder="Only if you want to"
          onChange={(event) => {
            setDraft(event.target.value);
            if (response) onRespond(response, event.target.value);
          }}
        />
      </label>
    </div>
  );
}

export function DirectionPick({
  territories,
  preference,
  onPick,
}: {
  territories: Array<{ id: string; name: string }>;
  preference: string | null;
  onPick: (preference: string) => void;
}) {
  const options = [
    ...territories.map((territory, index) => ({ id: territory.id, label: `Territory ${String(index + 1).padStart(2, "0")} · ${territory.name}` })),
    { id: "mix", label: "A mix of both" },
    { id: "neither", label: "Neither" },
    { id: "guidance", label: "I'm not sure — I'd like their guidance" },
  ];
  return (
    <div className="direction-pick">
      <div className="reaction-row">
        {options.map((option) => (
          <button key={option.id} type="button" className="reaction-button" aria-pressed={preference === option.id} onClick={() => onPick(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
