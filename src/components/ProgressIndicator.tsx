import { SECTIONS, sectionIndex, sectionReached, stepCount } from "../domain/sections";
import type { SectionId } from "../types/discovery";

interface ProgressIndicatorProps {
  current: SectionId;
  furthest: SectionId;
  step: number;
  totalSteps?: number;
  /** Client discovery does not include the manager profile. */
  hideSections?: SectionId[];
  onSelect: (section: SectionId) => void;
}

function fillFor(index: number, currentIndex: number, step: number, steps: number): number {
  if (index < currentIndex) return 1;
  if (index > currentIndex) return 0;
  if (steps <= 0) return 0;
  return (step + 1) / steps;
}

export function ProgressIndicator({ current, furthest, step, totalSteps, hideSections = [], onSelect }: ProgressIndicatorProps) {
  const currentIndex = sectionIndex(current);
  const currentLabel = SECTIONS[currentIndex]?.label ?? "";
  const visible = SECTIONS.filter((section) => !hideSections.includes(section.id));

  return (
    <nav className="progress" aria-label="Session progress">
      <p className="progress-current">{currentLabel}</p>
      <ol>
        {visible.map((section) => {
          const index = sectionIndex(section.id);
          const reached = sectionReached(furthest, section.id);
          const isCurrent = section.id === current;
          const steps = isCurrent && totalSteps ? totalSteps : stepCount(section.id);
          const fill = fillFor(index, currentIndex, step, steps);
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
