import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { TypeSpecimen } from "../components/TypeSpecimen";
import { LIMITS } from "../domain/options";
import { TYPE_DIRECTIONS } from "../domain/typography";
import type { TypographyDirectionId } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function TypeScreen() {
  const { session, togglePreferredType, toggleAvoidedType } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("type");
  const name = textValue(session.business.name).trim() || "Your name";
  const type = session.typographyPreferences;

  return (
    <DiscoveryLayout
      section="type"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "type", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`type-${step}`}>
        {step === 0 ? (
          <TypeStep
            title="How should your name feel?"
            supporting="We're not choosing a font. We're looking at the character you're drawn toward. Up to two."
            name={name}
            missingName={!textValue(session.business.name).trim()}
            selected={type.preferredDirectionIds}
            blocked={type.avoidedDirectionIds}
            atMax={type.preferredDirectionIds.length >= LIMITS.typePreferred}
            limitNote="Two is plenty. Let one go if this feels closer."
            onToggle={togglePreferredType}
          />
        ) : (
          <TypeStep
            title="Which feels least like you?"
            supporting="One is enough. If it's already a direction you were drawn to, we'll leave it there."
            name={name}
            missingName={false}
            selected={type.avoidedDirectionIds}
            blocked={type.preferredDirectionIds}
            atMax={false}
            onToggle={toggleAvoidedType}
          />
        )}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function TypeStep({
  title,
  supporting,
  name,
  missingName,
  selected,
  blocked,
  atMax,
  limitNote,
  onToggle,
}: {
  title: string;
  supporting: string;
  name: string;
  missingName: boolean;
  selected: TypographyDirectionId[];
  blocked: TypographyDirectionId[];
  atMax: boolean;
  limitNote?: string;
  onToggle: (id: TypographyDirectionId) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  return (
    <QuestionScreen kicker="Type" title={title} supporting={supporting}>
      {missingName ? (
        <p className="meta">The name field is still open, so this says “Your name” for now.</p>
      ) : null}
      <div className="type-grid">
        {TYPE_DIRECTIONS.map((direction) => {
          const pressed = selected.includes(direction.id);
          const isBlocked = blocked.includes(direction.id);
          return (
            <TypeSpecimen
              key={direction.id}
              direction={direction}
              name={name}
              pressed={pressed}
              blocked={isBlocked}
              dimmed={atMax && !pressed}
              onClick={() => {
                if (isBlocked) {
                  setNote("That's already on the other side. Go back if you want to move it.");
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
        {note ?? ""}
      </p>
    </QuestionScreen>
  );
}
