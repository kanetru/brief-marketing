import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import type { TextEvidenceOrUncertain } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function BusinessScreen() {
  const { session, setBusinessText, setDifferentiationUncertain } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("business");
  const business = session.business;

  return (
    <DiscoveryLayout
      section="business"
      step={step}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "business", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`business-${step}`}>
        {step === 0 ? (
          <QuestionScreen kicker="Business" title="What's your business called?">
            <TextResponse
              labelledBy="question-title"
              length="short"
              placeholder="As your customers say it"
              value={textValue(business.name)}
              onChange={(value) => setBusinessText("name", value)}
            />
          </QuestionScreen>
        ) : null}
        {step === 1 ? (
          <QuestionScreen
            kicker="Business"
            title="What do you actually do?"
            supporting="Say it the way you would to someone across a table. Polish can wait."
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              placeholder="Start anywhere."
              value={textValue(business.description)}
              onChange={(value) => setBusinessText("description", value)}
            />
          </QuestionScreen>
        ) : null}
        {step === 2 ? (
          <QuestionScreen
            kicker="Business"
            title="What do people actually come to you for?"
            supporting="Not the full catalogue — the reason they choose you."
          >
            <TextResponse
              labelledBy="question-title"
              length="long"
              placeholder="The thing they actually show up for"
              value={textValue(business.peopleComeFor)}
              onChange={(value) => setBusinessText("peopleComeFor", value)}
            />
          </QuestionScreen>
        ) : null}
        {step === 3 ? (
          <DifferentiationStep
            answer={business.differentiation}
            onText={(value) => setBusinessText("differentiation", value)}
            onUncertain={setDifferentiationUncertain}
          />
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function DifferentiationStep({
  answer,
  onText,
  onUncertain,
}: {
  answer: TextEvidenceOrUncertain;
  onText: (value: string) => void;
  onUncertain: () => void;
}) {
  const [draft, setDraft] = useState(() => textValue(answer));
  const uncertain = answer.state === "uncertain";

  return (
    <QuestionScreen
      kicker="Business"
      title="What makes you different from the alternatives?"
      supporting="A hunch is enough. If you don't have one yet, say so."
    >
      {uncertain ? (
        <p className="acknowledgement">Noted. We're going to push you on that one.</p>
      ) : (
        <TextResponse
          labelledBy="question-title"
          length="long"
          placeholder="Even a rough hunch"
          value={textValue(answer)}
          onChange={(value) => {
            setDraft(value);
            onText(value);
          }}
        />
      )}
      <div className="quiet-row">
        <QuietChoice
          label="I'm not really sure"
          pressed={uncertain}
          onClick={() => {
            if (uncertain) {
              onText(draft);
              return;
            }
            if (answer.state === "evidence") setDraft(answer.evidence.raw);
            onUncertain();
          }}
        />
      </div>
    </QuestionScreen>
  );
}
