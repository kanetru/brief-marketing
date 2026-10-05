import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChoiceCard } from "../components/ChoiceCard";
import { LearningBeat } from "../components/LearningBeat";
import { VisualBoard } from "../components/VisualBoard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { QuietChoice } from "../components/QuietChoice";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { buildDiscoveryEvidence } from "../domain/evidence";
import { adaptiveFollowUps } from "../domain/project/adaptiveQuestions";
import { MANAGER_HELP_ID, MANAGER_HELP_LABEL } from "../domain/questionSelection";
import { useClientProject, useProjects } from "../state/ProjectContext";
import { useSectionPath } from "../state/routeBase";
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
  const sectionPath = useSectionPath();
  const project = useClientProject();
  const { submitDiscovery } = useProjects();
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
    if (project) {
      flushSync(() => submitDiscovery(project.id));
      navigate(sectionPath("complete"));
      return;
    }
    activate("profile");
    navigate(sectionPath("profile"));
  }

  const finishStep = (status === "ready" ? questions.length : 0) + 1;
  const showingFinish = (status === "ready" || status === "failed") && step >= finishStep;

  function forward() {
    if (status === "running" || status === "not_generated") return;
    if (showingFinish) {
      finish();
      return;
    }
    goForward();
  }

  const question = step > 0 && step <= questions.length ? questions[step - 1] : undefined;
  const totalSteps = status === "ready" || status === "failed" ? finishStep + 1 : 1;

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
          forwardLabel={showingFinish ? "Finish" : "Continue"}
          forwardDisabled={!showingFinish && !canAdvance(session, "clarify", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`clarify-${step}-${status}`}>
        {step === 0 ? <Intro status={status} questionCount={questions.length} onRetry={retry} /> : null}
        {step === 0 ? <AdaptiveFollowUps /> : null}
        {step === 0 ? <LearningBeat /> : null}
        {showingFinish ? (
          <QuestionScreen
            kicker="Finish"
            size="hero"
            title="That's everything."
            supporting="Brief has what it needs for now."
          />
        ) : null}
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

function AdaptiveFollowUps() {
  const project = useClientProject();
  const { session } = useSession();
  const { setFollowUp } = useProjects();
  if (!project) return null;
  const prompts = adaptiveFollowUps(session, project.followUps);
  if (prompts.length === 0) return null;
  return (
    <div className="follow-ups">
      <p className="meta">A few things only this business raised.</p>
      {prompts.map((follow) => (
        <label key={follow.id} className="follow-up">
          <span id={`follow-${follow.id}`}>{follow.prompt}</span>
          <TextResponse
            labelledBy={`follow-${follow.id}`}
            length="long"
            value={follow.answer}
            placeholder="Optional"
            onChange={(value) => setFollowUp(project.id, { ...follow, answer: value })}
          />
        </label>
      ))}
    </div>
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
