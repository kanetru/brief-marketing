import type { ImageAssetRole, ImageTreatment } from "../types/brandIntelligence";

/** Controlled stand-in imagery. Original marks, using the territory palette. Never a fake brand board. */
export function FallbackImagery({
  treatment,
  role,
  label,
}: {
  treatment: ImageTreatment;
  role: ImageAssetRole;
  label: string;
}) {
  return (
    <div className={`fallback-image is-${treatment} is-${role}`} role="img" aria-label={label}>
      <svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {treatment === "raw" ? <RawMark role={role} /> : null}
        {treatment === "precise" ? <PreciseMark role={role} /> : null}
        {treatment === "graphic" ? <GraphicMark role={role} /> : null}
        {treatment === "formal" ? <FormalMark /> : null}
        {treatment === "clear" ? <ClearMark /> : null}
        {treatment === "documentary" ? <DocumentaryMark role={role} /> : null}
      </svg>
    </div>
  );
}

function DocumentaryMark({ role }: { role: ImageAssetRole }) {
  if (role === "detail") {
    return (
      <>
        <rect width="160" height="200" fill="var(--stage-support)" />
        <path d="M18 150c28-40 48-18 70-52 14 22 28 18 54-8v110H18z" fill="var(--stage-accent)" opacity="0.85" />
        <circle cx="112" cy="58" r="18" fill="var(--stage-bg)" />
      </>
    );
  }
  if (role === "texture") {
    return (
      <>
        <rect width="160" height="200" fill="var(--stage-bg)" />
        <path d="M0 40h160M0 78h160M0 120h160M0 162h160" stroke="var(--stage-ink)" strokeOpacity="0.18" />
        <rect x="24" y="56" width="90" height="70" fill="var(--stage-accent)" opacity="0.55" />
      </>
    );
  }
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-support)" />
      <rect x="18" y="28" width="108" height="132" fill="var(--stage-bg)" />
      <rect x="36" y="96" width="46" height="78" fill="var(--stage-ink)" opacity="0.78" />
      <circle cx="58" cy="78" r="14" fill="var(--stage-accent)" />
      <path d="M0 168h160" stroke="var(--stage-ink)" strokeOpacity="0.35" />
    </>
  );
}

function RawMark({ role }: { role: ImageAssetRole }) {
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-bg)" />
      <g transform={role === "detail" ? "translate(8 6) rotate(-2)" : "rotate(-1.4 80 100)"}>
        <rect x="8" y="16" width="132" height="168" fill="var(--stage-support)" />
        <path d="M20 150c18-46 30-10 52-38 16 20 22 8 48-16v62H20z" fill="var(--stage-accent)" />
        <path d="M28 40c16 8 18-6 34 2" stroke="var(--stage-ink)" strokeWidth="2" fill="none" />
        <circle cx="48" cy="78" r="9" fill="var(--stage-ink)" opacity="0.75" />
      </g>
    </>
  );
}

function PreciseMark({ role }: { role: ImageAssetRole }) {
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-bg)" />
      <rect x="16" y="16" width="128" height="168" fill="none" stroke="var(--stage-ink)" strokeWidth="1" />
      <rect x="32" y="32" width="60" height="72" fill="var(--stage-support)" />
      <rect x="92" y="32" width="36" height="36" fill="var(--stage-accent)" />
      {role === "hero" ? <rect x="32" y="116" width="96" height="48" fill="var(--stage-ink)" opacity="0.9" /> : null}
      {role === "detail" ? <rect x="48" y="108" width="64" height="48" fill="none" stroke="var(--stage-ink)" /> : null}
    </>
  );
}

function GraphicMark({ role }: { role: ImageAssetRole }) {
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-ink)" />
      <circle cx={role === "detail" ? 70 : 118} cy="78" r="54" fill="var(--stage-accent)" />
      <rect x="0" y="128" width="160" height="72" fill="var(--stage-bg)" />
    </>
  );
}

function FormalMark() {
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-bg)" />
      <rect x="28" y="24" width="104" height="140" fill="none" stroke="var(--stage-ink)" />
      <rect x="44" y="48" width="72" height="88" fill="var(--stage-support)" />
      <path d="M28 176h104" stroke="var(--stage-ink)" />
    </>
  );
}

function ClearMark() {
  return (
    <>
      <rect width="160" height="200" fill="var(--stage-support)" />
      <rect x="22" y="30" width="116" height="86" fill="var(--stage-bg)" />
      <rect x="22" y="128" width="52" height="44" fill="var(--stage-accent)" />
      <rect x="82" y="128" width="56" height="44" fill="var(--stage-ink)" opacity="0.8" />
    </>
  );
}
