import { useEffect, useState, type CSSProperties } from "react";
import type { TerritoryImageAsset, TerritoryVisualSpec } from "../types/brandIntelligence";
import { readImageryCache, writeImageryCache } from "../services/territoryImageCache";
import { requestTerritoryImages } from "../services/territoryImages";
import { FallbackImagery } from "./FallbackImagery";

export function TerritoryStage({
  spec,
  index,
  label,
  mode = "immersive",
}: {
  spec: TerritoryVisualSpec;
  index: number;
  label?: string;
  mode?: "immersive" | "handover" | "compare";
}) {
  const [assets, setAssets] = useState<TerritoryImageAsset[]>(spec.imageAssets);

  useEffect(() => {
    const cached = readImageryCache(spec.versionKey);
    if (cached) {
      setAssets(cached);
      return;
    }
    let cancel = false;
    void requestTerritoryImages(spec).then((next) => {
      if (cancel) return;
      writeImageryCache(spec.versionKey, next);
      setAssets(next);
    });
    return () => {
      cancel = true;
    };
  }, [spec]);

  const background = roleHex(spec, "Background") ?? "#F3EEE6";
  const ink = roleHex(spec, "Primary type") ?? "#1A1614";
  const accent = roleHex(spec, "Accent") ?? ink;
  const support = roleHex(spec, "Supporting") ?? accent;
  const [expanded, setExpanded] = useState(false);
  const hero = assets.find((asset) => asset.role === "hero") ?? assets[0];
  const detail = assets.find((asset) => asset.role === "detail");
  const context = assets.find((asset) => asset.role === "context");
  const texture = assets.find((asset) => asset.role === "texture");
  const style = {
    "--stage-bg": background,
    "--stage-ink": ink,
    "--stage-accent": accent,
    "--stage-support": support,
  } as CSSProperties;

  return (
    <article
      className={`territory-stage is-${mode}${expanded ? " is-expanded" : ""}`}
      data-testid={`territory-stage-${spec.territoryId}`}
      data-composition={spec.compositionStyle}
      data-treatment={spec.imageTreatment}
      data-temperature={spec.temperature}
      data-texture={spec.texture}
      data-spacing={spec.spacingCharacter}
      data-border={spec.borderStyle}
      data-heading={spec.headingTypeface.name}
      data-body={spec.bodyTypeface.name}
      style={style}
    >
      <div className="stage-hero">
        <div className="stage-figures">
          {hero ? <Frame asset={hero} business={spec.businessName} large /> : null}
          <div className="stage-secondary">
            {detail ? <Frame asset={detail} business={spec.businessName} /> : null}
            {context ? <Frame asset={context} business={spec.businessName} /> : null}
            {texture ? <Frame asset={texture} business={spec.businessName} /> : null}
          </div>
        </div>
        <div className="stage-type">
          <p className="stage-kicker">
            Territory {String(index + 1).padStart(2, "0")}
            {label ? ` · ${label}` : ""}
          </p>
          <p className="stage-business" style={{ fontFamily: spec.headingTypeface.fontFamily }}>
            {spec.businessName}
          </p>
          <h2 className="stage-headline" style={{ fontFamily: spec.headingTypeface.fontFamily }}>
            {spec.examplePhrase}
          </h2>
          <div className="stage-rule" aria-hidden="true" />
          <p className="stage-support" style={{ fontFamily: spec.bodyTypeface.fontFamily }}>
            {spec.supportingLine}
          </p>
          <p className="stage-example">Example line</p>
          <button type="button" className="text-button stage-expand" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Close" : "Expand"}
          </button>
        </div>
      </div>
      <footer className="stage-foot">
        <ul className="palette-strip">
          {spec.palette.map((role) => (
            <li key={`${role.hex}-${role.possibleRole}-${role.name}`}>
              <span className="palette-chip" style={{ background: role.hex }} />
              <span className="palette-name">{role.name}</span>
              <span className="palette-hex">{role.hex}</span>
              <span className="palette-role">Possible role · {role.possibleRole}</span>
            </li>
          ))}
        </ul>
        <div className="stage-meta">
          <p className="stage-faces">
            Potential type direction
            <strong>
              {spec.headingTypeface.name} / {spec.bodyTypeface.name}
            </strong>
            <span>
              {spec.headingTypeface.license} · {spec.headingTypeface.source}
            </span>
          </p>
          <ul className="stage-motifs">
            {spec.graphicMotifs.map((motif) => (
              <li key={motif}>{motif}</li>
            ))}
          </ul>
        </div>
      </footer>
    </article>
  );
}

function Frame({ asset, business, large = false }: { asset: TerritoryImageAsset; business: string; large?: boolean }) {
  const label = `${asset.treatment} ${asset.role} image for ${business}`;
  return (
    <figure className={large ? "stage-figure is-hero" : "stage-figure"}>
      {asset.url ? (
        <img src={asset.url} alt={label} />
      ) : (
        <FallbackImagery treatment={asset.treatment} role={asset.role} label={label} />
      )}
    </figure>
  );
}

function roleHex(spec: TerritoryVisualSpec, role: TerritoryVisualSpec["palette"][number]["possibleRole"]): string | undefined {
  return spec.palette.find((item) => item.possibleRole === role)?.hex;
}
