interface VisualBoardProps {
  id: string;
}

/** Miniature art-direction boards. Decorative; the parent control names them. */
export function VisualBoard({ id }: VisualBoardProps) {
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
