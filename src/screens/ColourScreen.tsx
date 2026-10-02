import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChoiceCard } from "../components/ChoiceCard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { PaletteCard } from "../components/PaletteCard";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { COLOUR_NUANCE, COLOUR_PALETTES, closerBoardsFor, normaliseHex, paletteById, type PaletteDefinition } from "../domain/palettes";
import { useSectionPath } from "../state/routeBase";
import { LIMITS } from "../domain/options";
import type { ColourRelationship } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

const RELATIONSHIPS: ReadonlyArray<{ id: ColourRelationship; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "sort_of", label: "Sort of" },
  { id: "no", label: "No" },
];

export function ColourScreen() {
  const navigate = useNavigate();
  const { session, activate, togglePreferredPalette, toggleCloserBoard, toggleColourNuance, toggleAvoidedPalette, setColourRelationship, addExistingColour, removeExistingColour } =
    useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("colour");
  const sectionPath = useSectionPath();
  const colour = session.colourPreferences;
  const relationship = colour.existingColourRelationship.state === "selected" ? colour.existingColourRelationship.value : null;
  const closer = closerBoardsFor(colour.preferredPaletteIds);

  function forward() {
    if (step === 4 && relationship === "no") {
      activate("type");
      navigate(sectionPath("type"));
      return;
    }
    goForward();
  }

  return (
    <DiscoveryLayout
      section="colour"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={forward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "colour", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`colour-${step}`}>
        {step === 0 ? (
          <PaletteStep
            title="Where does your eye go?"
            prompt="Choose the colour worlds you're naturally drawn toward."
            supporting="These aren't recommendations — we're looking for patterns. Up to three."
            palettes={COLOUR_PALETTES}
            selected={colour.preferredPaletteIds}
            blocked={colour.avoidedPaletteIds}
            atMax={colour.preferredPaletteIds.length >= LIMITS.palettes}
            limitNote="Three is enough. Let one go if this world matters more."
            onToggle={togglePreferredPalette}
          />
        ) : null}
        {step === 1 ? (
          <PaletteStep
            title="Somewhere around here?"
            prompt="A closer look inside what you already chose."
            supporting="Still not a brand palette. Pick the distinctions that feel nearer."
            palettes={closer}
            selected={colour.closerBoardIds}
            blocked={[]}
            atMax={colour.closerBoardIds.length >= 4}
            limitNote="Four is enough of a closer look."
            onToggle={toggleCloserBoard}
          />
        ) : null}
        {step === 2 ? (
          <QuestionScreen kicker="Colour" title="How should it feel?" supporting="Choose as many as are true. This is taste, not a finished palette.">
            <div className="nuance-grid">
              {COLOUR_NUANCE.map(([id, label]) => (
                <button key={id} type="button" className="nuance-card" aria-pressed={colour.nuanceIds.includes(id)} onClick={() => toggleColourNuance(id)}>
                  {label}
                </button>
              ))}
            </div>
          </QuestionScreen>
        ) : null}
        {step === 3 ? (
          <PaletteStep
            title="Anything you'd rather avoid?"
            supporting="The first worlds again. A pull and a refusal stay separate."
            palettes={COLOUR_PALETTES}
            selected={colour.avoidedPaletteIds}
            blocked={colour.preferredPaletteIds}
            atMax={false}
            onToggle={toggleAvoidedPalette}
          />
        ) : null}
        {step === 4 ? (
          <QuestionScreen kicker="Colour" title="Do you already use particular colours?">
            <ChoiceGrid columns={2} labelledBy="question-title">
              {RELATIONSHIPS.map((item) => (
                <ChoiceCard
                  key={item.id}
                  label={item.label}
                  pressed={relationship === item.id}
                  onClick={() => setColourRelationship(item.id)}
                />
              ))}
            </ChoiceGrid>
          </QuestionScreen>
        ) : null}
        {step === 5 ? (
          <ExistingColourStep
            colours={colour.existingBrandColours.map((item) => item.hex)}
            onAdd={addExistingColour}
            onRemove={removeExistingColour}
          />
        ) : null}
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function PaletteStep({
  title,
  prompt,
  supporting,
  palettes,
  selected,
  blocked,
  atMax,
  limitNote,
  onToggle,
}: {
  title: string;
  prompt?: string;
  supporting: string;
  palettes: readonly PaletteDefinition[];
  selected: string[];
  blocked: string[];
  atMax: boolean;
  limitNote?: string;
  onToggle: (id: string) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const lead = paletteById(selected[0] ?? "");

  return (
    <QuestionScreen kicker="Colour" title={title} prompt={prompt} supporting={supporting}>
      {lead ? <div className="palette-bleed" aria-hidden="true" style={{ background: `linear-gradient(120deg, ${lead.swatches.join(",")})` }} /> : null}
      <div className="palette-grid">
        {palettes.map((palette) => {
          const pressed = selected.includes(palette.id);
          const isBlocked = blocked.includes(palette.id);
          return (
            <PaletteCard
              key={palette.id}
              palette={palette}
              pressed={pressed}
              blocked={isBlocked}
              dimmed={atMax && !pressed}
              onClick={() => {
                if (isBlocked) {
                  setNote("That's already on the other side. Go back if you want to move it.");
                  return;
                }
                if (atMax && !pressed) {
                  setNote(limitNote ?? "That's as many as we need.");
                  return;
                }
                setNote(null);
                onToggle(palette.id);
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

function ExistingColourStep({
  colours,
  onAdd,
  onRemove,
}: {
  colours: string[];
  onAdd: (hex: string) => void;
  onRemove: (hex: string) => void;
}) {
  const [draft, setDraft] = useState("#1A1614");
  const [note, setNote] = useState<string | null>(null);

  function add(value: string) {
    const hex = normaliseHex(value);
    if (!hex) {
      setNote("Use a hex colour, like #1A1614.");
      return;
    }
    if (colours.includes(hex)) {
      setNote("That one's already on the list.");
      return;
    }
    setNote(null);
    onAdd(hex);
    setDraft(hex);
  }

  return (
    <QuestionScreen
      kicker="Colour"
      title="Add the colours you already use."
      supporting="This is a record of what exists. It isn't a direction, and it isn't a palette we're choosing for you."
    >
      <div className="colour-entry">
        <label className="colour-picker">
          <span className="visually-hidden">Pick a colour</span>
          <input
            type="color"
            value={normaliseHex(draft) ?? "#1A1614"}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <input
          className="hex-input"
          aria-label="Hex colour"
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="button" className="text-button" onClick={() => add(draft)}>
          Add
        </button>
      </div>
      <ul className="colour-list">
        {colours.map((hex) => (
          <li key={hex}>
            <span className="colour-swatch" style={{ background: hex }} aria-hidden="true" />
            <span>{hex}</span>
            <button type="button" className="quiet" onClick={() => onRemove(hex)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="gentle" role="status">
        {note ?? ""}
      </p>
    </QuestionScreen>
  );
}
