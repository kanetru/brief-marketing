import { useEffect, useState } from "react";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { LearningBeat } from "../components/LearningBeat";
import { NavigationControls } from "../components/NavigationControls";
import { PersonalityPicker } from "../components/PersonalityPicker";
import { QuestionScreen } from "../components/QuestionScreen";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { matchTrait, traitLabel } from "../domain/options";
import { customTraitBlock, presetBlock } from "../domain/personality";
import type { PersonalityPoleId, PersonalityTrait } from "../types/discovery";
import { canAdvance } from "../state/guards";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function PersonalityScreen() {
  const { session, toggleTrait, addCustomTrait, removeCustomTrait } = useSession();
  const { step, goBack, goForward, showBack, showForward } = useConversation("personality");
  const [note, setNote] = useState<string | null>(null);
  const poleId: PersonalityPoleId = step === 1 ? "avoid" : "attract";
  const pole = session.personality[poleId];
  const other = session.personality[poleId === "attract" ? "avoid" : "attract"];

  useEffect(() => {
    setNote(null);
  }, [step]);

  function explain(block: "duplicate" | "contradiction" | "limit" | "empty", label?: string): string | null {
    if (block === "contradiction") {
      return label
        ? `${label} is already on the other side. Go back if you want to move it.`
        : "That's already on the other side. Go back if you want to move it.";
    }
    if (block === "limit") return "Five is enough. Deselect one if you'd rather use this.";
    if (block === "duplicate") return "That's already on this list.";
    return null;
  }

  function onToggle(trait: PersonalityTrait) {
    if (pole.selected.includes(trait)) {
      setNote(null);
      toggleTrait(poleId, trait);
      return;
    }
    const block = presetBlock(pole, other, trait);
    if (block) {
      setNote(explain(block, traitLabel(trait)));
      return;
    }
    setNote(null);
    toggleTrait(poleId, trait);
  }

  function onAdd(value: string): boolean {
    const known = matchTrait(value);
    if (known) {
      if (pole.selected.includes(known)) {
        setNote("That's already on this list.");
        return false;
      }
      const block = presetBlock(pole, other, known);
      if (block) {
        setNote(explain(block, traitLabel(known)));
        return false;
      }
      setNote(null);
      toggleTrait(poleId, known);
      return true;
    }
    const block = customTraitBlock(pole, other, value);
    if (block === "empty" || !value.trim()) return false;
    if (block) {
      setNote(explain(block));
      return false;
    }
    setNote(null);
    addCustomTrait(poleId, value);
    return true;
  }

  function onLimit() {
    setNote("Five is enough. Deselect one if you'd rather use this.");
  }

  return (
    <DiscoveryLayout
      section="personality"
      step={step}
      width="wide"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel="Continue"
          forwardDisabled={!canAdvance(session, "personality", step)}
        />
      }
    >
      <TransitionWrapper transitionKey={`personality-${step}`}>
        {step === 0 ? (
          <QuestionScreen
            kicker="Personality"
            title="How should it feel to encounter you?"
            supporting="Pick up to five. These are clues, not the brand. A strategist is allowed to disagree."
          >
            <PersonalityPicker
              pole={pole}
              other={other}
              note={note}
              labelledBy="question-title"
              onToggle={onToggle}
              onAdd={onAdd}
              onRemove={(value) => {
                setNote(null);
                removeCustomTrait(poleId, value);
              }}
              onLimit={onLimit}
            />
          </QuestionScreen>
        ) : null}
        {step === 1 ? (
          <QuestionScreen
            kicker="Personality"
            title="And what should you absolutely NOT feel like?"
            supporting="Same list. If a word is already doing a job on the other side, we'll leave it there."
          >
            <PersonalityPicker
              pole={pole}
              other={other}
              note={note}
              labelledBy="question-title"
              onToggle={onToggle}
              onAdd={onAdd}
              onRemove={(value) => {
                setNote(null);
                removeCustomTrait(poleId, value);
              }}
              onLimit={onLimit}
            />
          </QuestionScreen>
        ) : null}
        <LearningBeat />
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}
