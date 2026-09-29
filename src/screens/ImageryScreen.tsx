import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { ImageryBoard } from "../components/ImageryBoard";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { IMAGERY_DIRECTIONS } from "../domain/imagery";
import { LIMITS } from "../domain/options";
import type { ImageryDirectionId } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function ImageryScreen() {
  const { session, togglePreferredImagery, toggleAvoidedImagery } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("imagery");
  const imagery = session.imageryPreferences;

  return (
    <DiscoveryLayout
      section="imagery"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "imagery", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`imagery-${step}`}>
        {step === 0 ? (
          <ImageryStep
            title="What kind of imagery feels right?"
            prompt="Which two feel closest?"
            supporting="Think about the feeling, not the exact subject matter. Up to two."
            selected={imagery.preferredDirectionIds}
            blocked={imagery.avoidedDirectionIds}
            atMax={imagery.preferredDirectionIds.length >= LIMITS.imageryPreferred}
            limitNote="Two is the brief. Let one go if this feels closer."
            onToggle={togglePreferredImagery}
          />
        ) : (
          <ImageryStep
            title="Anything you'd rather avoid?"
            supporting="Leave it open if nothing here bothers you. This still isn't a recommendation."
            selected={imagery.avoidedDirectionIds}
            blocked={imagery.preferredDirectionIds}
            atMax={false}
            closing
            onToggle={toggleAvoidedImagery}
          />
        )}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function ImageryStep({
  title,
  prompt,
  supporting,
  selected,
  blocked,
  atMax,
  limitNote,
  closing = false,
  onToggle,
}: {
  title: string;
  prompt?: string;
  supporting: string;
  selected: ImageryDirectionId[];
  blocked: ImageryDirectionId[];
  atMax: boolean;
  limitNote?: string;
  closing?: boolean;
  onToggle: (id: ImageryDirectionId) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  return (
    <QuestionScreen kicker="Imagery" title={title} prompt={prompt} supporting={supporting}>
      <div className="imagery-grid">
        {IMAGERY_DIRECTIONS.map((direction) => {
          const pressed = selected.includes(direction.id);
          const isBlocked = blocked.includes(direction.id);
          return (
            <ImageryBoard
              key={direction.id}
              id={direction.id}
              pressed={pressed}
              blocked={isBlocked}
              dimmed={atMax && !pressed}
              onClick={() => {
                if (isBlocked) {
                  setNote("That's already on the side that feels closest. Go back if you want to move it.");
                  return;
                }
                if (atMax && !pressed) {
                  setNote(limitNote ?? "That's enough.");
                  return;
                }
                setNote(null);
                onToggle(direction.id);
              }}
            />
          );
        })}
      </div>
      <p className="gentle" role="status">
        {note ?? (closing ? "This is as far as the session goes. Nothing here decides the brand." : "")}
      </p>
    </QuestionScreen>
  );
}
