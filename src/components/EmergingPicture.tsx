import type { CSSProperties } from "react";
import { paletteById } from "../domain/palettes";
import { TYPE_WORLDS } from "../domain/typeWorlds";
import { useSession } from "../state/SessionContext";
import { textValue } from "../state/textEvidence";

/** A small abstract of the choices so far. It is not a territory. */
export function EmergingPicture() {
  const { session } = useSession();
  const section = session.progress.section;
  const shown = ["audience", "goals", "personality", "spectrum", "visual", "colour", "type", "imagery", "voice", "inspiration", "clarify", "profile"].includes(section);
  if (!shown) return null;
  const audience = textValue(session.audience.bestCustomers).trim();
  const palette = paletteById(session.colourPreferences.preferredPaletteIds[0] ?? "");
  const swatches = palette?.swatches ?? ["#F3EEE6", "#1A1614", "#8C4A32", "#C4B2A2"];
  const world = TYPE_WORLDS.find((item) => item.id === session.typographyPreferences.worldIds[0]);
  const words = session.personality.attract.selected.slice(0, 3);
  const name = textValue(session.business.name).trim();
  if (!name && !audience && words.length === 0 && !palette) return null;
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
      {audience ? <p className="emerging-words">{audience.length > 90 ? `${audience.slice(0, 90)}…` : audience}</p> : null}
      {words.length > 0 ? <p className="emerging-words">{words.join(" · ")}</p> : null}
    </aside>
  );
}
