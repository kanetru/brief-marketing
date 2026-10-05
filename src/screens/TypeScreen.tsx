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
          <QuestionScreen kicker="Type" title="Which typographic world?" supporting="The words stay the same. You're reacting to type: heading, text, space, and weight. Not a final font. Pick up to two.">
            <div className="type-worlds">
              {TYPE_WORLDS.map((world) => (
                <TypeSystem
                  key={world.id}
                  pressed={type.worldIds.includes(world.id)}
                  label={world.label}
                  note={world.note}
                  headingFamily={world.fontFamily}
                  headingWeight={world.fontWeight}
                  headingStyle={world.fontStyle}
                  headingSpacing={world.letterSpacing}
                  headingCase={world.textTransform}
                  onClick={() => toggleTypeWorld(world.id, world.directionId)}
                />
              ))}
            </div>
          </QuestionScreen>
        ) : null}
        {step === 1 ? (
          <QuestionScreen kicker="Type" title="You seem to be leaning this way." supporting="Same words again. A finer difference around what you kept. Skipping is fine.">
            <div className="type-worlds">
              {refinements.map((face) => (
                <TypeSystem
                  key={face.id}
                  pressed={type.refinementIds.includes(face.id)}
                  label={face.label}
                  note={face.note}
                  headingFamily={face.fontFamily}
                  headingWeight={500}
                  headingStyle="normal"
                  headingSpacing="-0.03em"
                  headingCase="none"
                  onClick={() => toggleTypeRefinement(face.id)}
                />
              ))}
            </div>
          </QuestionScreen>
        ) : null}
        {step === 2 ? (
          <FineStep
            name={name}
            family={refinements[0]?.fontFamily || '"Fraunces Variable", Georgia, serif'}
            cutsSelected={type.refinementIds}
            onCut={toggleTypeRefinement}
            selected={type.avoidedDirectionIds}
            blocked={type.preferredDirectionIds}
            onToggle={toggleAvoidedType}
          />
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

const SPECIMEN = {
  heading: "The work, as it is",
  deck: "A short line about who it is for.",
  body: "The useful version is specific. It names the thing, the person, and what changes. It does not borrow a category costume.",
};

function bodyFamily(headingFamily: string): string {
  return /serif|Fraunces|Baskerville|Lora|Newsreader/i.test(headingFamily) ? '"IBM Plex Sans", sans-serif' : '"Source Serif 4", Georgia, serif';
}

function TypeSystem({
  pressed,
  label,
  note,
  headingFamily,
  headingWeight,
  headingStyle,
  headingSpacing,
  headingCase,
  onClick,
}: {
  pressed: boolean;
  label: string;
  note: string;
  headingFamily: string;
  headingWeight: number;
  headingStyle: "normal" | "italic";
  headingSpacing: string;
  headingCase: "none" | "uppercase";
  onClick: () => void;
}) {
  const body = bodyFamily(headingFamily);
  return (
    <button type="button" className="type-world type-system" aria-pressed={pressed} onClick={onClick}>
      <span className="type-kicker" style={{ fontFamily: body }}>Same words</span>
      <span className="type-heading" style={{ fontFamily: headingFamily, fontWeight: headingWeight, fontStyle: headingStyle, letterSpacing: headingSpacing, textTransform: headingCase }}>{SPECIMEN.heading}</span>
      <span className="type-deck" style={{ fontFamily: body }}>{SPECIMEN.deck}</span>
      <span className="type-body" style={{ fontFamily: body }}>{SPECIMEN.body}</span>
      <span className="type-world-note">{label}<small>{note}</small></span>
    </button>
  );
}

function FineStep({
  name,
  family,
  cutsSelected,
  onCut,
  selected,
  blocked,
  onToggle,
}: {
  name: string;
  family: string;
  cutsSelected: string[];
  onCut: (id: string) => void;
  selected: TypographyDirectionId[];
  blocked: TypographyDirectionId[];
  onToggle: (id: TypographyDirectionId) => void;
}) {
  const cuts = [
    { id: "fine-quieter", label: "Quieter", weight: 420, spacing: "0.01em" },
    { id: "fine-as-it-was", label: "As it was", weight: 520, spacing: "-0.03em" },
    { id: "fine-more-character", label: "More character", weight: 640, spacing: "-0.045em" },
  ];
  return (
    <QuestionScreen kicker="Type" title="This, or this?" supporting="Still the same words. A last cut of weight and space. Then, if something feels unlike you, set it aside. Neither is required.">
      <div className="type-worlds">
        {cuts.map((cut) => (
          <button key={cut.id} type="button" className="type-world type-system" data-cut={cut.label} aria-pressed={cutsSelected.includes(cut.id)} onClick={() => onCut(cut.id)}>
            <span className="type-kicker" style={{ fontFamily: bodyFamily(family) }}>{cut.label}</span>
            <span className="type-heading" style={{ fontFamily: family, fontWeight: cut.weight, letterSpacing: cut.spacing }}>{SPECIMEN.heading}</span>
            <span className="type-body" style={{ fontFamily: bodyFamily(family) }}>{SPECIMEN.body}</span>
          </button>
        ))}
      </div>
      <p className="field-label">Anything here feel unlike you?</p>
      <AvoidGrid name={name} selected={selected} blocked={blocked} onToggle={onToggle} />
    </QuestionScreen>
  );
}

function AvoidGrid({
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
    <>
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
    </>
  );
}
