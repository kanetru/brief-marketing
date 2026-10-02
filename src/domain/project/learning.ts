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
  const want = new Set(session.strategyInputs.want);
  const tight = session.strategyInputs.capacity === "tight" || session.strategyInputs.capacity === "full";
  if ((want.has("higher_value") || want.has("better_fit")) && session.strategyInputs.offers.some((offer) => offer.role === "growth")) {
    const offer = session.strategyInputs.offers.find((item) => item.role === "growth");
    prompts.push({
      id: "learn-commercial",
      kicker: "A commercial priority is emerging",
      statement: `You do not need more work generally. You need more of ${offer?.name ?? "the higher-value work"}.`,
      choices: [
        { id: "right", label: "That's right" },
        { id: "not", label: "Not quite" },
      ],
    });
  }
  if (tight && (want.has("more_volume") || session.goals.outcomes.selected.includes("generate_enquiries"))) {
    prompts.push({
      id: "learn-capacity",
      kicker: "There's a capacity constraint",
      statement: "You want more leads, but the business cannot fulfil substantially more volume. We may need better-fit work rather than simply more enquiries.",
      choices: [
        { id: "fit", label: "Better-fit work" },
        { id: "volume", label: "We do need volume" },
      ],
    });
  }
  const before = textValue(session.strategyInputs.beforeContact).toLowerCase();
  if (/month|weeks|referral|before anyone calls|before they call/.test(before)) {
    prompts.push({
      id: "learn-journey",
      kicker: "The journey is longer than the feed",
      statement: "People hear about you well before they get in touch. Recognition and proof may matter more than constant promotion.",
      choices: [
        { id: "right", label: "That's right" },
        { id: "not", label: "Not quite" },
      ],
    });
  }
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
  return prompts.slice(0, 3);
}
