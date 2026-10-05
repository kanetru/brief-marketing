import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { VisualBoard } from "../components/VisualBoard";
import { directionById } from "../domain/visualDirections";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function VisualScreen() {
  const { session, chooseVisual } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("visual");
  const comparisons = session.visualPreferences.comparisons;
  const comparison = step > 0 ? comparisons[step - 1] : undefined;
  const choice = comparison?.choice.state === "selected" ? comparison.choice.value : null;
  const late = step > Math.ceil(comparisons.length / 2);
  const compareTitle = step >= comparisons.length ? "This, or this?" : late ? "Let's push it." : "Which way do you lean?";

  return (
    <DiscoveryLayout
      section="visual"
      step={step}
      width={step === 0 ? "hero" : "stage"}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel={step === 0 ? "Show me" : "Continue"}
          forwardDisabled={!canAdvance(session, "visual", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`visual-${step}`}>
        {step === 0 ? (
          <QuestionScreen
            size="hero"
            kicker="Visual"
            title="Enough words. Let's look at things."
            supporting="We'll show you pairs of creative directions. Pick the one you're naturally more drawn to."
          >
            <aside className="statement">
              <p className="statement-lead">You're not choosing your brand here.</p>
              <p>We're simply learning what catches your eye.</p>
            </aside>
            <div className="look-mark" aria-hidden="true">
              <span />
              <span />
            </div>
          </QuestionScreen>
        ) : null}
        {comparison ? (
          <div className="compare">
            <p className="kicker">Visual</p>
            <h1 id="question-title" className="display compare-title">
              {compareTitle}
            </h1>
            <div className="compare-pair">
              <ComparePanel
                directionId={comparison.a.id}
                pressed={choice === "a" || choice === "both"}
                onChoose={() => chooseVisual(comparison.comparisonId, "a")}
              />
              <ComparePanel
                directionId={comparison.b.id}
                pressed={choice === "b" || choice === "both"}
                onChoose={() => chooseVisual(comparison.comparisonId, "b")}
              />
            </div>
            <div className="quiet-row">
              <QuietChoice
                label="Both"
                pressed={choice === "both"}
                onClick={() => chooseVisual(comparison.comparisonId, "both")}
              />
              <QuietChoice
                label="Neither"
                pressed={choice === "neither"}
                onClick={() => chooseVisual(comparison.comparisonId, "neither")}
              />
            </div>
          </div>
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function ComparePanel({
  directionId,
  pressed,
  onChoose,
}: {
  directionId: string;
  pressed: boolean;
  onChoose: () => void;
}) {
  const direction = directionById(directionId);
  return (
    <button
      type="button"
      className={pressed ? "compare-panel is-chosen" : "compare-panel"}
      aria-pressed={pressed}
      aria-label={`${direction.accessibleName}. This one.`}
      onClick={onChoose}
    >
      <VisualBoard id={directionId} />
      <span className="compare-caption">This one</span>
    </button>
  );
}
