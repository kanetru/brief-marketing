import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChoiceCard } from "../components/ChoiceCard";
import { VisualBoard } from "../components/VisualBoard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { buildDiscoveryEvidence } from "../domain/evidence";
import { MANAGER_HELP_ID, MANAGER_HELP_LABEL } from "../domain/questionSelection";
import { pathFor } from "../domain/sections";
import { requestAnalysis } from "../services/ai/client";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

const inFlight = new Set<string>();

export function ClarifyScreen() {
  const navigate = useNavigate();
  const {
    session,
    activate,
    beginAnalysis,
    recordAnalysis,
    failAnalysis,
    answerClarification,
    clarifyUncertain,
  } = useSession();
  const { step, goBack, goForward, showBack } = useConversation("clarify");
  const questions = session.agentQuestions.selected;
  const status = session.agentObservations.status;

  useEffect(() => {
    if (status !== "not_generated" || inFlight.has(session.id)) return;
    inFlight.add(session.id);
    const evidence = buildDiscoveryEvidence(session);
    beginAnalysis();
    void requestAnalysis(evidence).then((result) => {
      inFlight.delete(session.id);
      if (result.ok) recordAnalysis(result, evidence);
      else failAnalysis(result.error);
    });
  }, [beginAnalysis, failAnalysis, recordAnalysis, session, status]);

  function retry() {
    if (status === "running" || inFlight.has(session.id)) return;
    inFlight.add(session.id);
    const evidence = buildDiscoveryEvidence(session);
    beginAnalysis();
    void requestAnalysis(evidence).then((result) => {
      inFlight.delete(session.id);
      if (result.ok) recordAnalysis(result, evidence);
      else failAnalysis(result.error);
    });
  }

  function finish() {
    activate("profile");
    navigate(pathFor("profile"));
  }

  function forward() {
    if (status === "running" || status === "not_generated") return;
    if (status === "failed" || questions.length === 0 || step >= questions.length) {
      finish();
      return;
    }
    goForward();
  }

  const question = step > 0 ? questions[step - 1] : undefined;
  const totalSteps = status === "ready" ? Math.max(1, 1 + questions.length) : 1;

  return (
    <DiscoveryLayout
      section="clarify"
      step={step}
      totalSteps={totalSteps}
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={status === "ready" || status === "failed"}
          onBack={goBack}
          onForward={forward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "clarify", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`clarify-${step}-${status}`}>
        {step === 0 ? <Intro status={status} questionCount={questions.length} onRetry={retry} /> : null}
        {question ? (
          <QuestionScreen kicker="Clarify" size="conversation" title={question.question}>
            {question.answerMode === "single_choice" ? (
              <ChoiceGrid columns={1} labelledBy="question-title">
                {question.options.map((option) => (
                  <ChoiceCard
                    key={option.id}
                    label={option.label}
                    board={option.visualDirectionId ? <VisualBoard id={option.visualDirectionId} /> : undefined}
                    pressed={
                      option.id === MANAGER_HELP_ID
                        ? question.response.state === "uncertain"
                        : question.response.state === "selected" && question.response.optionId === option.id
                    }
                    onClick={() => answerClarification(question.id, { optionId: option.id })}
                  />
                ))}
              </ChoiceGrid>
            ) : (
              <>
                <TextResponse
                  labelledBy="question-title"
                  length="long"
                  value={question.response.state === "evidence" ? question.response.text : ""}
                  placeholder="Say it however you'd say it"
                  onChange={(value) => answerClarification(question.id, { text: value })}
                />
                <div className="quiet-row">
                  <QuietChoice
                    label={MANAGER_HELP_LABEL}
                    pressed={question.response.state === "uncertain"}
                    onClick={() => clarifyUncertain(question.id)}
                  />
                </div>
              </>
            )}
          </QuestionScreen>
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function Intro({
  status,
  questionCount,
  onRetry,
}: {
  status: string;
  questionCount: number;
  onRetry: () => void;
}) {
  if (status === "failed") {
    return (
      <QuestionScreen kicker="Clarify" title="We've got enough to work with." supporting="Let's keep moving.">
        <div className="quiet-row">
          <QuietChoice label="Try once more" pressed={false} onClick={onRetry} />
        </div>
      </QuestionScreen>
    );
  }
  if (status === "running" || status === "not_generated") {
    return (
      <QuestionScreen
        kicker="Clarify"
        title="Just a couple more things."
        supporting="Reading what you've already told us."
      />
    );
  }
  if (questionCount === 0) {
    return (
      <QuestionScreen
        kicker="Clarify"
        title="We've got enough to work with."
        supporting="Nothing else here would change the handover. Let's keep moving."
      />
    );
  }
  return (
    <QuestionScreen
      kicker="Clarify"
      title="Just a couple more things."
      supporting="We've got a pretty good picture. There are a few things worth clearing up before we hand this over."
    />
  );
}
