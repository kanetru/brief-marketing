import { textValue } from "../../state/textEvidence";
import type { DiscoverySession } from "../../types/discovery";

export interface LearningPrompt {
  id: string;
  kicker: string;
  statement: string;
  choices: Array<{ id: string; label: string }>;
}

/** A reflection of what the client has already said. Not a strategy conclusion. */
export function learningPrompts(session: DiscoverySession): LearningPrompt[] {
  const prompts: LearningPrompt[] = [];
  const made = `${textValue(session.business.description)} ${textValue(session.business.peopleComeFor)}`.toLowerCase();
  const making = (made.match(/made|making|workshop|process|built|build|joint/g) ?? []).length;
  const finished = (made.match(/finish|finished|look|style|interior|beautiful/g) ?? []).length;
  if (making >= 2 && making > finished) {
    prompts.push({
      id: "learn-making",
      kicker: "Something is emerging",
      statement: "You've talked much more about how the work is made than what it looks like finished. That may matter.",
      choices: [
        { id: "right", label: "That's right" },
        { id: "not", label: "Not quite" },
      ],
    });
  }
  const avoid = new Set(session.personality.avoid.selected);
  const attract = new Set(session.personality.attract.selected);
  if (avoid.has("premium") && (attract.has("calm") || attract.has("human") || attract.has("natural"))) {
    prompts.push({
      id: "learn-tension",
      kicker: "There's a tension here",
      statement: "You've kept premium off the table, and you've also reached for something calmer and more human. If those pull apart, which would you regret losing?",
      choices: [
        { id: "human", label: "The human character" },
        { id: "established", label: "A more established feel" },
      ],
    });
  }
  return prompts.slice(0, 2);
}
