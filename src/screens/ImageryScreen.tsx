import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { ImageryBoard } from "../components/ImageryBoard";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { IMAGERY_DIRECTIONS, closerStillsFor, type ImageryDirectionDefinition } from "../domain/imagery";
import type { ImageryDirectionId } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

type Reaction = "love" | "interesting" | "not_me";

export function ImageryScreen() {
  const { session, setImageryReaction, setCloserStill } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("imagery");
  const imagery = session.imageryPreferences;
  const closer = closerStillsFor(imagery.preferredDirectionIds, imagery.interestIds);

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
          <MoodStep
            title="Which of these worlds feels like you?"
            supporting="Look at the photograph. Love it, find it interesting, or set it aside. You can choose several."
            stills={IMAGERY_DIRECTIONS}
            reactionFor={(id) => worldReaction(imagery.preferredDirectionIds, imagery.interestIds, imagery.avoidedDirectionIds, id)}
            onReact={(id, reaction) => setImageryReaction(id as ImageryDirectionId, reaction)}
          />
        ) : (
          <MoodStep
            title="Closer to that?"
            supporting="A narrower set, from the worlds you kept. Still a feeling, not a shot list."
            stills={closer}
            reactionFor={(id) => worldReaction(imagery.closerStillIds, imagery.closerInterestIds, imagery.closerRejectedIds, id)}
            onReact={(id, reaction) => setCloserStill(id, reaction)}
          />
        )}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function worldReaction(loved: readonly string[], interesting: readonly string[], rejected: readonly string[], id: string): Reaction | null {
  if (loved.includes(id)) return "love";
  if (interesting.includes(id)) return "interesting";
  if (rejected.includes(id)) return "not_me";
  return null;
}

function MoodStep({
  title,
  supporting,
  stills,
  reactionFor,
  onReact,
}: {
  title: string;
  supporting: string;
  stills: readonly ImageryDirectionDefinition[];
  reactionFor: (id: string) => Reaction | null;
  onReact: (id: string, reaction: Reaction) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <QuestionScreen kicker="Imagery" title={title} supporting={supporting}>
      <div className="mood-grid">
        {stills.map((still) => (
          <ImageryBoard
            key={still.id}
            label={still.label}
            src={still.src}
            reaction={reactionFor(still.id)}
            onReact={(reaction) => {
              const blocked = reaction === "love" && reactionFor(still.id) !== "love" && stills.filter((item) => reactionFor(item.id) === "love").length >= 4;
              if (blocked) {
                setNote("Four loves is enough. Let one go if this feels closer.");
                return;
              }
              setNote(null);
              onReact(still.id, reaction);
            }}
          />
        ))}
      </div>
      <p className="gentle" role="status">{note ?? ""}</p>
    </QuestionScreen>
  );
}
