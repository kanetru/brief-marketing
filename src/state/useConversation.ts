import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adjacentSection, stepCount } from "../domain/sections";
import type { SectionId } from "../types/discovery";
import { useSession } from "./SessionContext";
import { useSectionPath } from "./routeBase";

/**
 * Move inside a section by step. Crossing into another section keeps the
 * step that section already remembers, so Back doesn't drop answers or place.
 */
export function useConversation(section: SectionId) {
  const navigate = useNavigate();
  const { session, activate, enterAt } = useSession();
  const sectionPath = useSectionPath();
  const steps = stepCount(section);
  const step = Math.max(0, Math.min(session.progress.steps[section] ?? 0, steps - 1));

  const goForward = useCallback(() => {
    if (step < steps - 1) {
      enterAt(section, step + 1);
      return;
    }
    const next = adjacentSection(section, 1);
    if (!next) return;
    activate(next);
    navigate(sectionPath(next));
  }, [activate, enterAt, navigate, section, sectionPath, step, steps]);

  const goBack = useCallback(() => {
    if (step > 0) {
      enterAt(section, step - 1);
      return;
    }
    const previous = adjacentSection(section, -1);
    if (!previous) return;
    activate(previous);
    navigate(sectionPath(previous));
  }, [activate, enterAt, navigate, section, sectionPath, step]);

  const showBack = step > 0 || adjacentSection(section, -1) !== null;
  const showForward = step < steps - 1 || adjacentSection(section, 1) !== null;

  return { step, steps, goForward, goBack, showBack, showForward };
}
