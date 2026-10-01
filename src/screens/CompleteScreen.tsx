import { Link } from "react-router-dom";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function CompleteScreen() {
  const { activate } = useSession();
  const project = useClientProject();
  const { step, goBack, showBack } = useConversation("complete");

  return (
    <DiscoveryLayout
      section="complete"
      step={step}
      width="hero"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={false}
          onBack={goBack}
          onForward={() => activate("complete")}
          forwardLabel="Continue"
        />
      }
    >
      <QuestionScreen
        size="hero"
        kicker="Handover"
        title="You're done."
        supporting="Thanks — your responses are ready for your media manager. They'll use this alongside their own experience and conversations with you to shape the creative direction."
      >
        <aside className="statement">
          <p className="statement-lead">We haven't defined your brand here.</p>
          <p>We've given them a much better place to start.</p>
        </aside>
        {project ? (
          <p className="meta">You can close this. The same link brings you back.</p>
        ) : (
          <p className="handover-link">
            <Link to="/demo/handover">Open the media manager handover</Link>
          </p>
        )}
      </QuestionScreen>
    </DiscoveryLayout>
  );
}
