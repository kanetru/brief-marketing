import { Link } from "react-router-dom";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { clientContribution, completionMessage } from "../domain/project/clientAccess";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function CompleteScreen() {
  const { activate, session } = useSession();
  const project = useClientProject();
  const { step, goBack, showBack } = useConversation("complete");
  const message = completionMessage(DEMO_ACCOUNT.name);
  const given = clientContribution(session);

  if (project) {
    return (
      <DiscoveryLayout section="complete" step={step} width="hero" footer={<NavigationControls showBack={false} showForward={false} onBack={goBack} onForward={() => activate("complete")} forwardLabel="Continue" />}>
        <QuestionScreen size="hero" kicker="Handoff" title={message.title} supporting={message.body}>
          <img className="opening-mark" src="/brand/lover-lover-wordmark.png" alt="" />
          <aside className="statement">
            <p className="statement-lead">{message.next}</p>
          </aside>
          <p className="meta">
            {given.answered} questions answered · {given.visuals} visual directions explored · {given.references} references supplied
          </p>
        </QuestionScreen>
      </DiscoveryLayout>
    );
  }

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
        kicker="Handoff"
        title="That's it."
        supporting="Your answers are with your manager. You can leave this here."
      >
        <img className="opening-mark" src="/brand/lover-lover-wordmark.png" alt="" />
        <aside className="statement">
          <p className="statement-lead">Brief has what it needs.</p>
          <p>Nothing here is a strategy. That stays with the person doing the work.</p>
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
