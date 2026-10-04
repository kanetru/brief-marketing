import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { DEMO_ACCOUNT } from "../../domain/project/account";
import { correctTheme, initialsMark, themeVars } from "../../domain/agency/theme";
import { useAgency } from "../../state/AgencyContext";
import type { WorkspaceBrand } from "../../types/agency";

const STEPS = ["name", "logo", "colour", "confirm"] as const;
type Step = (typeof STEPS)[number];

export function AgencySetup() {
  const agency = useAgency();
  const existing = agency.brandFor(DEMO_ACCOUNT.workspaceId);
  const [step, setStep] = useState<Step>("name");
  const [brand, setBrand] = useState<WorkspaceBrand>(() => existing ?? {
    workspaceId: DEMO_ACCOUNT.workspaceId,
    name: DEMO_ACCOUNT.workspaceName,
    website: "",
    contactName: DEMO_ACCOUNT.name,
    contactDetails: "",
    updatedAt: new Date().toISOString(),
    theme: {
      logo: "",
      mark: "",
      colourPrimary: "#1F3A34",
      colourAccent: "#A68456",
      colourBackground: "#F4F1EA",
      colourSurface: "#FBF9F4",
      colourText: "#1C1A17",
      colourMuted: "#5C564C",
      headingFont: "Fraunces",
      bodyFont: "Satoshi",
      radiusCharacter: "0px",
      welcomeLine: "A few questions, so the work starts from how you actually see the business.",
      optionalThemeMetadata: {},
    },
  });
  const preview = useMemo(() => correctTheme(brand.theme), [brand.theme]);

  function save(next: WorkspaceBrand) {
    const safe = correctTheme(next.theme);
    const stored: WorkspaceBrand = {
      ...next,
      updatedAt: new Date().toISOString(),
      theme: {
        ...next.theme,
        colourPrimary: safe.colourPrimary,
        colourAccent: safe.colourAccent,
        colourBackground: safe.colourBackground,
        colourSurface: safe.colourSurface,
        colourText: safe.colourText,
        colourMuted: safe.colourMuted,
      },
    };
    setBrand(stored);
    agency.saveBrand(stored);
  }

  function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url) return;
      agency.storeLogo(brand.workspaceId, url);
      save({ ...brand, theme: { ...brand.theme, logo: url } });
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const index = STEPS.indexOf(step);
    save(brand);
    const next = STEPS[index + 1];
    if (next) setStep(next);
  }

  const logo = brand.theme.logo || initialsMark(brand.name || "Studio", preview.colourPrimary);

  return (
    <div className="studio" data-screen="agency-setup" data-step={step}>
      <header className="studio-top">
        <div>
          <LoverLoverLogo kind="secondary" color="choc" className="studio-logo" alt="Lover Lover" />
          <p className="studio-kicker">Brief · {DEMO_ACCOUNT.workspaceName}</p>
          <h1>Make Brief look like you.</h1>
          <p className="studio-lead">Your clients should feel they are with you. Brief stays in the footer.</p>
        </div>
        <Link to="/studio">All clients</Link>
      </header>
      <nav className="studio-nav" aria-label="Setup">
        {STEPS.map((id) => (
          <button key={id} type="button" aria-current={step === id ? "page" : undefined} onClick={() => setStep(id)}>
            {id === "name" ? "Name" : id === "logo" ? "Logo" : id === "colour" ? "Colour" : "Does this look right?"}
          </button>
        ))}
      </nav>
      <form className="studio-split" onSubmit={onSubmit}>
        <div className="studio-create">
          {step === "name" ? (
            <>
              <label>Practice name<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label>
              <label>Website<input value={brand.website} onChange={(event) => setBrand({ ...brand, website: event.target.value })} placeholder="Optional" /></label>
              <label>A line your client will see<textarea rows={3} value={brand.theme.welcomeLine} onChange={(event) => setBrand({ ...brand, theme: { ...brand.theme, welcomeLine: event.target.value } })} /></label>
              <label>Your name<input value={brand.contactName} onChange={(event) => setBrand({ ...brand, contactName: event.target.value })} /></label>
            </>
          ) : null}
          {step === "logo" ? (
            <div data-screen="logo-upload">
              <p>Upload a logo. If you skip this, your name is set in type.</p>
              <label className="studio-button" style={{ width: "fit-content" }}>
                Choose a file
                <input type="file" accept="image/*" onChange={onLogo} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} />
              </label>
              <p className="studio-meta">Stored with this workspace. It is not built into the product.</p>
            </div>
          ) : null}
          {step === "colour" ? (
            <div data-screen="colour-setup">
              <p>Choose colours you already use. If a pair would be hard to read, Brief adjusts the type, not the page.</p>
              <ColourField label="Primary" value={brand.theme.colourPrimary} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourPrimary: value } })} />
              <ColourField label="Accent" value={brand.theme.colourAccent} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourAccent: value } })} />
              <ColourField label="Background" value={brand.theme.colourBackground} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourBackground: value } })} />
              <ColourField label="Text" value={brand.theme.colourText} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourText: value } })} />
              <label>
                Heading type
                <select value={brand.theme.headingFont} onChange={(event) => setBrand({ ...brand, theme: { ...brand.theme, headingFont: event.target.value } })}>
                  <option>Fraunces</option>
                  <option>Newsreader</option>
                  <option>Libre Baskerville</option>
                  <option>Satoshi</option>
                </select>
              </label>
            </div>
          ) : null}
          {step === "confirm" ? (
            <div data-screen="theme-confirm">
              <h2>Does this look right?</h2>
              <p>This is the surface your client will see. You can change it later.</p>
            </div>
          ) : null}
          <button type="submit" className="studio-button">{step === "confirm" ? "Save" : "Continue"}</button>
        </div>
        <aside className="agency-preview" style={themeVars(preview)} data-screen="agency-preview">
          {logo ? <img src={logo} alt="" className="agency-preview-logo" /> : <strong>{brand.name}</strong>}
          <p className="agency-preview-name">{brand.name || "Your practice"}</p>
          <p>{preview.welcomeLine}</p>
          <p className="powered-by">Powered by Brief by Lover Lover</p>
        </aside>
      </form>
    </div>
  );
}

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#1C1A17"} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
