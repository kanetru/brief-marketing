import { useState } from "react";
import { ChoiceCard } from "../components/ChoiceCard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { LIMITS, MARKETING_OUTCOMES } from "../domain/options";
import type { MarketingOutcome } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function GoalsScreen() {
  const { session, setTwelveMonth } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("goals");

  return (
    <DiscoveryLayout
      section="goals"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "goals", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`goals-${step}`}>
        {step === 0 ? <OutcomesStep /> : null}
        {step === 1 ? (
          <QuestionScreen
            kicker="Goals"
            title="If we were having this conversation 12 months from now, what would make you think your marketing had worked?"
            supporting="A result, a feeling, a change in the work — whatever would actually convince you."
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              placeholder="What would actually convince you"
              value={textValue(session.goals.twelveMonthSuccess)}
              onChange={setTwelveMonth}
            />
          </QuestionScreen>
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function OutcomesStep() {
  const { session, toggleOutcome, setSomethingElse } = useSession();
  const selected = session.goals.outcomes.selected;
  const atMax = selected.length >= LIMITS.goals;
  const [note, setNote] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => textValue(session.goals.somethingElse));
  const somethingElse = selected.includes("something_else");

  function onSelect(outcome: MarketingOutcome) {
    const already = selected.includes(outcome);
    if (!already && atMax) {
      setNote("Three is the brief. Deselect one if this matters more.");
      return;
    }
    setNote(null);
    toggleOutcome(outcome);
    if (outcome === "something_else" && !already && draft.trim()) {
      setSomethingElse(draft);
    }
  }

  return (
    <QuestionScreen
      kicker="Goals"
      title="What are we actually trying to do?"
      prompt="What would you most like your marketing to achieve?"
      supporting="Up to three."
    >
      <ChoiceGrid columns={2} labelledBy="question-prompt">
        {MARKETING_OUTCOMES.map((outcome) => {
          const pressed = selected.includes(outcome.id);
          return (
            <ChoiceCard
              key={outcome.id}
              label={outcome.label}
              pressed={pressed}
              dimmed={atMax && !pressed}
              onClick={() => onSelect(outcome.id)}
            />
          );
        })}
      </ChoiceGrid>
      <p className="gentle" role="status" aria-live="polite">
        {note ?? ""}
      </p>
      {somethingElse ? (
        <div className="reveal">
          <p id="something-else-label" className="field-label">
            Say a little more, if you want.
          </p>
          <TextResponse
            labelledBy="something-else-label"
            length="short"
            placeholder="In a few words"
            value={textValue(session.goals.somethingElse)}
            onChange={(value) => {
              setDraft(value);
              setSomethingElse(value);
            }}
          />
        </div>
      ) : null}
    </QuestionScreen>
  );
}
