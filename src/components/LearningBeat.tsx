import { learningPrompts } from "../domain/project/learning";
import { QuietChoice } from "./QuietChoice";
import { useClientProject, useProjects } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";

/** A reflection of what the client already said. It never opens the manager workspace. */
export function LearningBeat() {
  const project = useClientProject();
  const { session } = useSession();
  const { setLearning } = useProjects();
  if (!project) return null;
  const prompt = learningPrompts(session).find((item) => !project.learning.some((answer) => answer.id === item.id));
  if (!prompt) return null;
  return (
    <aside className="learning-beat" data-kind={prompt.id}>
      <p className="kicker">{prompt.kicker}</p>
      <h2>{prompt.statement}</h2>
      <div className="quiet-row">
        {prompt.choices.map((choice) => (
          <QuietChoice
            key={choice.id}
            label={choice.label}
            pressed={false}
            onClick={() => setLearning(project.id, { id: prompt.id, prompt: prompt.statement, choice: choice.label })}
          />
        ))}
      </div>
    </aside>
  );
}
