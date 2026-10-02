interface ImageryBoardProps {
  label: string;
  src: string;
  reaction: "love" | "interesting" | "not_me" | null;
  onReact: (reaction: "love" | "interesting" | "not_me") => void;
}

export function ImageryBoard({ label, src, reaction, onReact }: ImageryBoardProps) {
  return (
    <article className={`mood-card${reaction ? ` is-${reaction}` : ""}`}>
      <img className="mood-photo" src={src} alt="" />
      <div className="mood-reactions" role="group" aria-label={label}>
        <button type="button" aria-pressed={reaction === "love"} onClick={() => onReact("love")}>Love this</button>
        <button type="button" aria-pressed={reaction === "interesting"} onClick={() => onReact("interesting")}>Interesting</button>
        <button type="button" aria-pressed={reaction === "not_me"} onClick={() => onReact("not_me")}>Not me</button>
      </div>
    </article>
  );
}
