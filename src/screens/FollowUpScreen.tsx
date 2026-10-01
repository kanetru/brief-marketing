import { useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TextResponse } from "../components/TextResponse";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { useClientProject, useProjects } from "../state/ProjectContext";
import { useSectionPath } from "../state/routeBase";

export function FollowUpScreen() {
  const project = useClientProject();
  const { completeFollowUp } = useProjects();
  const navigate = useNavigate();
  const sectionPath = useSectionPath();
  const prompts = project?.followUpRequest?.prompts ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>(project?.followUpRequest?.answers ?? {});
  function send() {
    if (!project) return;
    flushSync(() => completeFollowUp(project.id, answers));
    navigate(sectionPath("complete"));
  }

  return (
    <DiscoveryLayout
      section="complete"
      step={0}
      width="hero"
      footer={<NavigationControls showBack={false} showForward={prompts.length > 0} onBack={() => undefined} onForward={send} forwardLabel="Send this" />}
    >
      <QuestionScreen
        size="hero"
        kicker="A little more"
        title="A few things only you can clear up."
        supporting={`${DEMO_ACCOUNT.name} asked for a little more. This page is only these questions.`}
      >
        {prompts.map((prompt) => (
          <label key={prompt.id} className="follow-up">
            <span id={`follow-${prompt.id}`}>{prompt.prompt}</span>
            <TextResponse
              labelledBy={`follow-${prompt.id}`}
              length="long"
              value={answers[prompt.id] ?? ""}
              placeholder="Say it however you'd say it"
              onChange={(value) => setAnswers((current) => ({ ...current, [prompt.id]: value }))}
            />
          </label>
        ))}
      </QuestionScreen>
    </DiscoveryLayout>
  );
}
