import { useState } from "react";
import { LIMITS, PERSONALITY_TRAITS, matchTrait, traitLabel } from "../domain/options";
import { poleCount, wordOnPole } from "../domain/personality";
import type { PersonalityPole, PersonalityTrait } from "../types/discovery";
import { ChoiceCard } from "./ChoiceCard";
import { ChoiceGrid } from "./ChoiceGrid";

interface PersonalityPickerProps {
  pole: PersonalityPole;
  other: PersonalityPole;
  note: string | null;
  labelledBy: string;
  onToggle: (trait: PersonalityTrait) => void;
  onAdd: (value: string) => boolean;
  onRemove: (value: string) => void;
  onLimit: () => void;
}

export function PersonalityPicker({
  pole,
  other,
  note,
  labelledBy,
  onToggle,
  onAdd,
  onRemove,
  onLimit,
}: PersonalityPickerProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const atMax = poleCount(pole) >= LIMITS.traits;

  function submitCustom() {
    const accepted = onAdd(draft);
    if (accepted) {
      setDraft("");
      setAdding(false);
    }
  }

  return (
    <>
      <ChoiceGrid columns={3} labelledBy={labelledBy}>
        {PERSONALITY_TRAITS.map((trait) => {
          const pressed = pole.selected.includes(trait.id);
          const blocked = !pressed && wordOnPole(other, traitLabel(trait.id));
          return (
            <ChoiceCard
              key={trait.id}
              variant="word"
              label={trait.label}
              pressed={pressed}
              blocked={blocked}
              dimmed={atMax && !pressed}
              hint={blocked ? "On the other list" : undefined}
              onClick={() => onToggle(trait.id)}
            />
          );
        })}
        {other.custom
          .filter((value) => !matchTrait(value))
          .map((value) => (
            <ChoiceCard
              key={`other-${value}`}
              variant="word"
              label={value}
              blocked
              hint="On the other list"
              onClick={() => {
                onAdd(value);
              }}
            />
          ))}
        {pole.custom.map((value) => (
          <ChoiceCard
            key={value}
            variant="word"
            label={value}
            pressed
            onClick={() => onRemove(value)}
          />
        ))}
        {adding ? (
          <form
            className="add-own"
            onSubmit={(event) => {
              event.preventDefault();
              submitCustom();
            }}
          >
            <input
              value={draft}
              maxLength={40}
              placeholder="Your word"
              aria-label="Add your own"
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="text-button">
              Add
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className={atMax ? "choice-card is-word is-add is-dimmed" : "choice-card is-word is-add"}
            onClick={() => {
              if (atMax) {
                onLimit();
                return;
              }
              setAdding(true);
            }}
          >
            + Add your own
          </button>
        )}
      </ChoiceGrid>
      <p className="gentle" role="status" aria-live="polite">
        {note ?? ""}
      </p>
    </>
  );
}
