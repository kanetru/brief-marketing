import type { ImageryDirectionId } from "../types/discovery";
import { imageryLabel } from "../domain/imagery";

interface ImageryBoardProps {
  id: ImageryDirectionId;
  pressed: boolean;
  blocked?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}

export function ImageryBoard({ id, pressed, blocked = false, dimmed = false, onClick }: ImageryBoardProps) {
  const label = imageryLabel(id);
  const classes = ["imagery-card", pressed ? "is-pressed" : "", blocked ? "is-blocked" : "", dimmed && !pressed ? "is-dimmed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={pressed}
      aria-disabled={blocked || undefined}
      aria-label={label}
      onClick={onClick}
    >
      <span className={`image-board image-${id}`} aria-hidden="true">
        {id === "documentary" ? (
          <>
            <span className="image-frame" />
            <span className="image-grain" />
            <span className="image-caption">field / 12</span>
          </>
        ) : null}
        {id === "polished" ? (
          <>
            <span className="image-plate" />
            <span className="image-shine" />
          </>
        ) : null}
        {id === "editorial" ? (
          <>
            <span className="image-mast">Ae</span>
            <span className="image-column" />
          </>
        ) : null}
        {id === "people_first" ? (
          <>
            <span className="image-person a" />
            <span className="image-person b" />
            <span className="image-person c" />
          </>
        ) : null}
        {id === "detail_craft" ? (
          <>
            <span className="image-weave" />
            <span className="image-thread" />
          </>
        ) : null}
        {id === "atmospheric" ? (
          <>
            <span className="image-haze a" />
            <span className="image-haze b" />
            <span className="image-horizon" />
          </>
        ) : null}
      </span>
      <span className="visually-hidden">{label}</span>
      {blocked ? <small>Already among the closest</small> : null}
    </button>
  );
}