import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { canAdvance } from "../state/guards";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function WelcomeScreen() {
  const { session } = useSession();
  const project = useClientProject();
  const { step, goBack, goForward, showBack, showForward } = useConversation("welcome");
  const resume = session.progress.furthest !== "welcome";
  const business = project?.businessName.trim();

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
          forwardLabel={resume ? "Continue" : "Let's begin"}
          forwardDisabled={!canAdvance(session, "welcome", step)}
        />
      }
    >
      <QuestionScreen
        size="hero"
        title={
          business ? (
            <>
              Let's get a clear picture of <span className="title-break">{business}.</span>
            </>
          ) : (
            <>
              Help us understand <span className="title-break">your business.</span>
            </>
          )
        }
        supporting="A conversation, not a form. Your answers become a picture your manager can use in the work, and in the tools they already use."
      >
        <aside className="statement">
          <p className="statement-lead">This isn't here to define your brand for you.</p>
          <p>Think of it as the starting point for a better creative conversation.</p>
        </aside>
        <p className="meta">Around 15 minutes</p>
      </QuestionScreen>
    </DiscoveryLayout>
  );
}
