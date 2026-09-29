import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { SpectrumAnswer } from "../types/discovery";

interface SpectrumControlProps {
  leftLabel: string;
  rightLabel: string;
  answer: SpectrumAnswer;
  onSelect: (value: number) => void;
  onNeutral: () => void;
}

function valueFromPointer(track: HTMLDivElement, clientX: number): number {
  const rect = track.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const ratio = (clientX - rect.left) / rect.width;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

export function SpectrumControl({ leftLabel, rightLabel, answer, onSelect, onNeutral }: SpectrumControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const selected = answer.state === "selected" ? answer.value : null;
  const neutral = answer.state === "neutral";
  const name = `${leftLabel} to ${rightLabel}`;

  function commitFromPointer(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    onSelect(valueFromPointer(track, clientX));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(100, (selected ?? 45) + 5);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(0, (selected ?? 55) - 5);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else return;
    event.preventDefault();
    onSelect(next);
  }

  const valueText =
    answer.state === "selected"
      ? `${answer.value} towards ${answer.value < 50 ? leftLabel : answer.value > 50 ? rightLabel : "the middle"}`
      : answer.state === "neutral"
        ? "Neither really matters"
        : "Not set";

  return (
    <div className={neutral ? "spectrum is-neutral" : "spectrum"}>
      <div className="spectrum-ends" aria-hidden="true">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div
        ref={trackRef}
        className="spectrum-track"
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={selected ?? undefined}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          commitFromPointer(event.clientX);
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          commitFromPointer(event.clientX);
        }}
      >
        <span className="spectrum-line" />
        {selected !== null ? (
          <span className="spectrum-thumb" style={{ left: `${selected}%` }} />
        ) : null}
      </div>
      <p className="spectrum-hint">
        {answer.state === "unanswered" ? "Set a point, or leave this open." : valueText}
      </p>
      <div className="quiet-row">
        <button
          type="button"
          className={neutral ? "quiet is-pressed" : "quiet"}
          aria-pressed={neutral}
          onClick={onNeutral}
        >
          Neither really matters
        </button>
      </div>
    </div>
  );
}
