import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function CompleteScreen() {
  const { activate } = useSession();
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
        title="That's plenty to work with."
        supporting="Your responses are ready for your media manager. They'll use what you've shared here alongside their own experience and conversations with you to shape the next step."
      >
        <aside className="statement">
          <p className="statement-lead">We haven't defined your brand here.</p>
          <p>And that's the point.</p>
        </aside>
      </QuestionScreen>
    </DiscoveryLayout>
  );
}
