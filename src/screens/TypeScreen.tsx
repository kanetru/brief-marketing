import { useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { TypeSpecimen } from "../components/TypeSpecimen";
import { TYPE_DIRECTIONS } from "../domain/typography";
import { TYPE_WORLDS, worldsForDirections } from "../domain/typeWorlds";
import type { TypographyDirectionId } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";
import { useConversation } from "../state/useConversation";

export function TypeScreen() {
  const { session, toggleTypeWorld, toggleTypeRefinement, toggleAvoidedType } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("type");
  const name = textValue(session.business.name).trim() || "Your name";
  const type = session.typographyPreferences;
  const refinements = worldsForDirections(type.preferredDirectionIds);

  return (
    <DiscoveryLayout
      section="type"
      step={step}
      width="stage"
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
          <QuestionScreen kicker="Type" title="How should your name feel?" supporting="Ten different worlds. Pick up to two. We're not choosing a final font.">
            {!textValue(session.business.name).trim() ? <p className="meta">The name field is still open, so this says “Your name” for now.</p> : null}
            <div className="type-worlds">
              {TYPE_WORLDS.map((world) => {
                const pressed = type.worldIds.includes(world.id);
                return (
                  <button
                    key={world.id}
                    type="button"
                    className="type-world"
                    aria-pressed={pressed}
                    onClick={() => toggleTypeWorld(world.id, world.directionId)}
                  >
                    <span
                      className="type-world-name"
                      style={{
                        fontFamily: world.fontFamily,
                        fontWeight: world.fontWeight,
                        fontStyle: world.fontStyle,
                        letterSpacing: world.letterSpacing,
                        textTransform: world.textTransform,
                      }}
                    >
                      {name}
                    </span>
                    <span className="type-world-note">
                      {world.label}
                      <small>{world.note}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </QuestionScreen>
        ) : null}
        {step === 1 ? (
          <QuestionScreen kicker="Type" title="Closer to which of these?" supporting="Same broad character. A finer difference. Two is enough, and skipping is fine.">
            <div className="type-worlds">
              {refinements.map((face) => {
                const pressed = type.refinementIds.includes(face.id);
                return (
                  <button key={face.id} type="button" className="type-world" aria-pressed={pressed} onClick={() => toggleTypeRefinement(face.id)}>
                    <span className="type-world-name" style={{ fontFamily: face.fontFamily }}>
                      {name}
                    </span>
                    <span className="type-world-note">
                      {face.label}
                      <small>{face.note}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </QuestionScreen>
        ) : null}
        {step === 2 ? (
          <AvoidStep name={name} selected={type.avoidedDirectionIds} blocked={type.preferredDirectionIds} onToggle={toggleAvoidedType} />
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function AvoidStep({
  name,
  selected,
  blocked,
  onToggle,
}: {
  name: string;
  selected: TypographyDirectionId[];
  blocked: TypographyDirectionId[];
  onToggle: (id: TypographyDirectionId) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <QuestionScreen kicker="Type" title="Which feels least like you?" supporting="One is enough.">
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
              onClick={() => {
                if (isBlocked) {
                  setNote("That's already a direction you were drawn to. We'll leave it there.");
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
