import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { canAdvance } from "../state/guards";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function WelcomeScreen() {
  const { session } = useSession();
  const project = useClientProject();
  const { step, goBack, goForward, showBack, showForward } = useConversation("welcome");
  const resume = session.progress.furthest !== "welcome";
  const manager = project ? DEMO_ACCOUNT.name : null;

  return (
    <DiscoveryLayout
      section="welcome"
      step={step}
      width="hero"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel={resume ? "Keep going" : "Begin"}
          forwardDisabled={!canAdvance(session, "welcome", step)}
        />
      }
    >
      <article className="opening">
        <img className="opening-mark" src="/brand/lover-lover-wordmark.png" alt="Lover Lover" />
        <h1 className="display opening-title">Brief</h1>
        <p className="opening-line">by Lover Lover</p>
        <p className="opening-support">We're going to learn how your business thinks, sounds and looks.</p>
        <p className="opening-note">
          {manager
            ? `${manager} asked for this. Your answers go to ${manager}. You won't need an account, and you won't be handed a strategy.`
            : "A conversation with a point of view. Your answers become something a manager can actually use."}
        </p>
      </article>
    </DiscoveryLayout>
  );
}
