import type { CSSProperties } from "react";
import { paletteById } from "../domain/palettes";
import { TYPE_WORLDS } from "../domain/typeWorlds";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";

/** A small abstract of the choices so far. It is not a territory. */
export function EmergingPicture() {
  const { session } = useSession();
  const section = session.progress.section;
  if (section !== "colour" && section !== "type" && section !== "imagery" && section !== "voice") return null;
  const palette = paletteById(session.colourPreferences.preferredPaletteIds[0] ?? "");
  const swatches = palette?.swatches ?? ["#F3EEE6", "#1A1614", "#8C4A32", "#C4B2A2"];
  const world = TYPE_WORLDS.find((item) => item.id === session.typographyPreferences.worldIds[0]);
  const words = session.personality.attract.selected.slice(0, 3);
  const name = textValue(session.business.name).trim();
  const style = {
    "--emerge-a": swatches[0],
    "--emerge-b": swatches[1],
    "--emerge-c": swatches[2],
    fontFamily: world?.fontFamily,
  } as CSSProperties;

  return (
    <aside className="emerging" style={style}>
      <p className="emerging-kicker">Something's starting to emerge.</p>
      <div className="emerging-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {name ? <p className="emerging-name">{name}</p> : null}
      {words.length > 0 ? <p className="emerging-words">{words.join(" · ")}</p> : null}
    </aside>
  );
}
