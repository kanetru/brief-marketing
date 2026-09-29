interface VisualBoardProps {
  id: string;
}

/**
 * Original CSS compositions. No third-party brand artwork.
 * The client sees a mini art-direction board. The system knows the dimension id.
 */
const BOARD_RECIPES: Record<string, { tone: string; word: string; detail: string }> = {
  "documentary-human": { tone: "tone-documentary", word: "field", detail: "35mm" },
  "art-directed": { tone: "tone-directed", word: "set", detail: "01" },
  "tactile-craft": { tone: "tone-tactile", word: "grain", detail: "hand" },
  "geometric-clean": { tone: "tone-geometric", word: "grid", detail: "A4" },
  "warm-editorial": { tone: "tone-warm-edit", word: "issue", detail: "No." },
  "cool-quiet": { tone: "tone-cool", word: "still", detail: "—" },
  "quiet-craft": { tone: "tone-quiet-craft", word: "slow", detail: "soft" },
  "lively-craft": { tone: "tone-lively", word: "make", detail: "!" },
  "quiet-grid": { tone: "tone-quiet-grid", word: "form", detail: "02" },
  "loud-grid": { tone: "tone-loud-grid", word: "BLOCK", detail: "//" },
};

/** Miniature art-direction boards. Decorative; the parent control names them. */
export function VisualBoard({ id }: VisualBoardProps) {
  const recipe = BOARD_RECIPES[id];
  if (recipe) {
    return (
      <div className={`artboard art-recipe ${recipe.tone}`} aria-hidden="true">
        <span className="art-swatch" />
        <span className="art-swatch alt" />
        <span className="art-word">{recipe.word}</span>
        <span className="art-detail">{recipe.detail}</span>
        <span className="art-rule" />
      </div>
    );
  }
  return (
    <div className={`artboard art-${id}`} aria-hidden="true">
      {id === "editorial-organic" ? (
        <>
          <span className="art-blob" />
          <span className="art-word">Ae</span>
          <span className="art-rule" />
        </>
      ) : null}
      {id === "strict-minimal" ? (
        <>
          <span className="art-grid" />
          <span className="art-index">01</span>
          <span className="art-square" />
        </>
      ) : null}
      {id === "technical-cool" ? (
        <>
          <span className="art-blueprint" />
          <span className="art-code">X / 04</span>
          <span className="art-ring" />
        </>
      ) : null}
      {id === "raw-expressive" ? (
        <>
          <span className="art-stamp">NO</span>
          <span className="art-seal" />
        </>
      ) : null}
      {id === "classic-polished" ? (
        <>
          <span className="art-frame" />
          <span className="art-monogram">MCM</span>
          <span className="art-est">Est.</span>
        </>
      ) : null}
      {id === "playful-warm" ? (
        <>
          <span className="art-dot a" />
          <span className="art-dot b" />
          <span className="art-dot c" />
          <span className="art-hey">hey</span>
        </>
      ) : null}
      {id === "contemporary-bold" ? (
        <>
          <span className="art-crop">OR</span>
          <span className="art-slash" />
        </>
      ) : null}
      {id === "restrained-warm" ? (
        <>
          <span className="art-quiet">quiet</span>
          <span className="art-hair" />
        </>
      ) : null}
      {id === "expressive-editorial" ? (
        <>
          <span className="art-bar" />
          <span className="art-look">look</span>
          <span className="art-book">book</span>
        </>
      ) : null}
      {id === "organic-raw" ? (
        <>
          <svg className="art-hand" viewBox="0 0 120 120">
            <ellipse cx="62" cy="58" rx="34" ry="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="art-handword">hand</span>
        </>
      ) : null}
    </div>
  );
}
