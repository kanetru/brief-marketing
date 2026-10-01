import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import type { DesiredAudienceAnswer } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { desiredText, textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function AudienceScreen() {
  const { session, setBestCustomers, setDesiredText, setDesiredSame, setDesiredUncertain } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("audience");

  return (
    <DiscoveryLayout
      section="audience"
      step={step}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "audience", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`audience-${step}`}>
        {step === 0 ? (
          <QuestionScreen
            kicker="Audience"
            title="Who do you most want to matter to?"
            supporting="Not everyone who could buy from you. Who would you be disappointed not to reach?"
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              placeholder="Write it the way you'd say it"
              value={textValue(session.audience.bestCustomers)}
              onChange={setBestCustomers}
            />
          </QuestionScreen>
        ) : (
          <DesiredStep
            answer={session.audience.desiredCustomers}
            onText={setDesiredText}
            onSame={setDesiredSame}
            onUncertain={setDesiredUncertain}
          />
        )}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function DesiredStep({
  answer,
  onText,
  onSame,
  onUncertain,
}: {
  answer: DesiredAudienceAnswer;
  onText: (value: string) => void;
  onSame: () => void;
  onUncertain: () => void;
}) {
  const [draft, setDraft] = useState(() => desiredText(answer));
  const writing = answer.state === "unanswered" || answer.state === "evidence";

  return (
    <QuestionScreen
      kicker="Audience"
      title="What are they already buying, following, reading or trusting?"
      supporting="If it's the same people you just described, say so. If you're not sure, that's useful too."
    >
      {writing ? (
        <TextResponse
          labelledBy="question-title"
          length="long"
          placeholder="A person, a situation, a kind of work"
          value={desiredText(answer)}
          onChange={(value) => {
            setDraft(value);
            onText(value);
          }}
        />
      ) : (
        <p className="acknowledgement">
          {answer.state === "same_as_current"
            ? "Same people, then. We've kept it as its own answer."
            : "That's fine. Not knowing is still a signal."}
        </p>
      )}
      <div className="quiet-row">
        <QuietChoice
          label="Same as above"
          pressed={answer.state === "same_as_current"}
          onClick={() => {
            if (answer.state === "same_as_current") onText(draft);
            else onSame();
          }}
        />
        <QuietChoice
          label="I'm not sure"
          pressed={answer.state === "uncertain"}
          onClick={() => {
            if (answer.state === "uncertain") onText(draft);
            else onUncertain();
          }}
        />
      </div>
    </QuestionScreen>
  );
}
