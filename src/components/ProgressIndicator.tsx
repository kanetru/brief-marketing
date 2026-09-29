import { SECTIONS, sectionIndex, sectionReached, stepCount } from "../domain/sections";
import type { SectionId } from "../types/discovery";

interface ProgressIndicatorProps {
  current: SectionId;
  furthest: SectionId;
  step: number;
  onSelect: (section: SectionId) => void;
}

function fillFor(index: number, currentIndex: number, step: number, steps: number): number {
  if (index < currentIndex) return 1;
  if (index > currentIndex) return 0;
  if (steps <= 0) return 0;
  return (step + 1) / steps;
}

export function ProgressIndicator({ current, furthest, step, onSelect }: ProgressIndicatorProps) {
  const currentIndex = sectionIndex(current);
  const currentLabel = SECTIONS[currentIndex]?.label ?? "";

  return (
    <nav className="progress" aria-label="Session progress">
      <p className="progress-current">{currentLabel}</p>
      <ol>
        {SECTIONS.map((section, index) => {
          const reached = sectionReached(furthest, section.id);
          const isCurrent = section.id === current;
          const fill = fillFor(index, currentIndex, step, stepCount(section.id));
          return (
            <li key={section.id}>
              <button
                type="button"
                disabled={!reached}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => {
                  if (reached && !isCurrent) onSelect(section.id);
                }}
              >
                <span className="track" aria-hidden="true">
                  <span className="fill" style={{ transform: `scaleX(${fill})` }} />
                </span>
                <span className="label">{section.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
