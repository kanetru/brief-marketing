import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { SpectrumControl } from "../components/SpectrumControl";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function SpectrumScreen() {
  const { session, setSpectrum, neutralSpectrum } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("spectrum");
  const dimension = step > 0 ? session.personalitySpectrum.dimensions[step - 1] : undefined;

  return (
    <DiscoveryLayout
      section="spectrum"
      step={step}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "spectrum", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`spectrum-${step}`}>
        {step === 0 ? (
          <QuestionScreen
            kicker="Spectrum"
            title="Where do you actually sit?"
            supporting="Restrained or expressive. Practical or poetic. Polished or raw. Familiar or strange. The place you choose is evidence, not a personality type."
          />
        ) : null}
        {dimension ? (
          <QuestionScreen
            kicker="Spectrum"
            title={`${dimension.leftLabel} or ${dimension.rightLabel}?`}
            supporting="Set a point if one side pulls more. Or tell us neither really matters."
          >
            <SpectrumControl
              leftLabel={dimension.leftLabel}
              rightLabel={dimension.rightLabel}
              answer={dimension.answer}
              onSelect={(value) => setSpectrum(dimension.id, value)}
              onNeutral={() => neutralSpectrum(dimension.id)}
            />
          </QuestionScreen>
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}
