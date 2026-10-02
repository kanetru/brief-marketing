import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { LearningBeat } from "../components/LearningBeat";
import { NavigationControls } from "../components/NavigationControls";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";
import { ActiveStep, CapabilityStep, JourneyStep, NeighbourStep, ProofStep, WorkingStep } from "./strategySteps";

export function RealityScreen() {
  const { session } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("reality");
  return (
    <DiscoveryLayout
      section="reality"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "reality", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`reality-${step}`}>
        {step === 0 ? <ActiveStep /> : null}
        {step === 1 ? <WorkingStep /> : null}
        {step === 2 ? <CapabilityStep /> : null}
        {step === 3 ? (
          <>
            <JourneyStep />
            <LearningBeat />
          </>
        ) : null}
        {step === 4 ? <ProofStep /> : null}
        {step === 5 ? <NeighbourStep /> : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}
