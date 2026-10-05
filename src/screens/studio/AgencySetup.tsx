import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ExperiencePreview } from "../../components/ExperiencePreview";
import { LoverLoverLogo } from "../../components/LoverLoverLogo";
import { DEMO_ACCOUNT } from "../../domain/project/account";
import { CHAPTER_IDS, resolveExperience, type ChapterId } from "../../domain/agency/experience";
import { APPROVED_FONTS, correctTheme, initialsMark } from "../../domain/agency/theme";
import { useAgency } from "../../state/AgencyContext";
import type { ButtonTreatment, ClientExperience, WorkspaceBrand } from "../../types/agency";

const CHAPTER_LABEL: Record<ChapterId, string> = {
  business: "Business",
  audience: "Audience",
  goals: "Goals",
  reality: "Reality",
  personality: "Personality",
  colour: "Colour",
  clarify: "Clarify",
};

export function AgencySetup() {
  const agency = useAgency();
  const existing = agency.brandFor(DEMO_ACCOUNT.workspaceId);
  const [brand, setBrand] = useState<WorkspaceBrand>(() => existing ?? blankBrand());
  const [preview, setPreview] = useState<"opening" | "completion">("opening");
  const experience = brand.experience ?? {};
  const resolved = useMemo(() => resolveExperience(brand), [brand]);
  const safe = useMemo(() => correctTheme(brand.theme), [brand.theme]);
  const logo = brand.theme.logo || initialsMark(brand.name || "Studio", safe.colourPrimary);

  function save(next: WorkspaceBrand) {
    const colours = correctTheme(next.theme);
    const stored: WorkspaceBrand = {
      ...next,
      updatedAt: new Date().toISOString(),
      theme: {
        ...next.theme,
        colourPrimary: colours.colourPrimary,
        colourAccent: colours.colourAccent,
        colourBackground: colours.colourBackground,
        colourSurface: colours.colourSurface,
        colourText: colours.colourText,
        colourMuted: colours.colourMuted,
        welcomeLine: next.experience?.openingSupport?.trim() || next.theme.welcomeLine,
      },
    };
    setBrand(stored);
    agency.saveBrand(stored);
  }

  function patchExperience(patch: ClientExperience) {
    setBrand({ ...brand, experience: { ...experience, ...patch } });
  }

  function onFile(kind: "logo" | "logoDark" | "mark") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : "";
        if (!url) return;
        agency.storeLogo(brand.workspaceId, url, kind);
        save({ ...brand, theme: { ...brand.theme, [kind]: url } });
      };
      reader.readAsDataURL(file);
    };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save(brand);
  }

  return (
    <div className="studio" data-screen="agency-setup">
      <header className="studio-top">
        <div>
          <LoverLoverLogo kind="secondary" color="choc" className="studio-logo" alt="Lover Lover" />
          <p className="studio-kicker">{DEMO_ACCOUNT.workspaceName}</p>
          <h1>Client experience</h1>
        </div>
        <Link to="/studio">Clients</Link>
      </header>
      <form className="studio-split agency-layout" onSubmit={onSubmit}>
        <div className="studio-create">
          <h2>Practice</h2>
          <label>Name<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label>
          <label>Website<input value={brand.website} onChange={(event) => setBrand({ ...brand, website: event.target.value })} /></label>
          <label>Your name<input value={brand.contactName} onChange={(event) => setBrand({ ...brand, contactName: event.target.value })} /></label>

          <div data-screen="logo-upload">
            <h2>Logo</h2>
            <FileField label="Primary logo" onChange={onFile("logo")} />
            <FileField label="Dark logo" onChange={onFile("logoDark")} />
            <FileField label="Mark" onChange={onFile("mark")} />
          </div>

          <div data-screen="colour-setup">
            <h2>Colour and type</h2>
            <ColourField label="Primary" value={brand.theme.colourPrimary} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourPrimary: value } })} />
            <ColourField label="Accent" value={brand.theme.colourAccent} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourAccent: value } })} />
            <ColourField label="Extra accent" value={brand.theme.colourExtra || brand.theme.colourAccent} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourExtra: value } })} />
            <ColourField label="Background" value={brand.theme.colourBackground} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourBackground: value } })} />
            <ColourField label="Text" value={brand.theme.colourText} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, colourText: value } })} />
            <FontField label="Heading" value={brand.theme.headingFont} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, headingFont: value } })} />
            <FontField label="Body" value={brand.theme.bodyFont} onChange={(value) => setBrand({ ...brand, theme: { ...brand.theme, bodyFont: value } })} />
            <label>
              Buttons
              <select value={brand.theme.buttonStyle || "solid"} onChange={(event) => setBrand({ ...brand, theme: { ...brand.theme, buttonStyle: event.target.value as ButtonTreatment } })}>
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
              </select>
            </label>
          </div>

          <div data-screen="opening-copy">
            <h2>Opening</h2>
            <label>Eyebrow<input value={experience.openingEyebrow ?? resolved.openingEyebrow} onChange={(event) => patchExperience({ openingEyebrow: event.target.value })} /></label>
            <label>Heading<input value={experience.openingHeading ?? resolved.openingHeading} onChange={(event) => patchExperience({ openingHeading: event.target.value })} /></label>
            <label>Supporting text<textarea rows={3} value={experience.openingSupport ?? resolved.openingSupport} onChange={(event) => patchExperience({ openingSupport: event.target.value })} /></label>
            <label>Button<input value={experience.openingButton ?? resolved.openingButton} onChange={(event) => patchExperience({ openingButton: event.target.value })} /></label>
          </div>

          <fieldset>
            <legend>What happens next</legend>
            <label className="check-row">
              <input type="checkbox" checked={experience.expectationEnabled ?? false} onChange={(event) => patchExperience({ expectationEnabled: event.target.checked })} />
              Show
            </label>
            <label>Heading<input value={experience.expectationHeading ?? "What happens next"} onChange={(event) => patchExperience({ expectationHeading: event.target.value })} /></label>
            <label>Text<textarea rows={3} value={experience.expectationBody ?? resolved.expectationBody} onChange={(event) => patchExperience({ expectationBody: event.target.value })} /></label>
          </fieldset>

          <div>
            <h2>Chapters</h2>
            {CHAPTER_IDS.map((id) => {
              const fallback = resolved.chapters[id];
              const chapter = experience.chapters?.[id] ?? {};
              return (
                <details key={id}>
                  <summary>{CHAPTER_LABEL[id]}</summary>
                  <label>Heading<input value={chapter.heading ?? fallback.heading} onChange={(event) => patchExperience({ chapters: { ...experience.chapters, [id]: { ...chapter, heading: event.target.value } } })} /></label>
                  <label>Supporting<input value={chapter.supporting ?? fallback.supporting} onChange={(event) => patchExperience({ chapters: { ...experience.chapters, [id]: { ...chapter, supporting: event.target.value } } })} /></label>
                </details>
              );
            })}
          </div>

          <fieldset data-screen="manager-intro-editor">
            <legend>Your introduction</legend>
            <label className="check-row">
              <input type="checkbox" checked={experience.introEnabled ?? false} onChange={(event) => patchExperience({ introEnabled: event.target.checked })} />
              Show
            </label>
            <label>Name<input value={experience.managerName ?? brand.contactName} onChange={(event) => patchExperience({ managerName: event.target.value })} /></label>
            <FileField label="Photo" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const url = typeof reader.result === "string" ? reader.result : "";
                if (url) patchExperience({ managerPhoto: url });
              };
              reader.readAsDataURL(file);
            }} />
            <label>Message<textarea rows={4} value={experience.introMessage ?? ""} onChange={(event) => patchExperience({ introMessage: event.target.value })} /></label>
          </fieldset>

          <div>
            <h2>Completion</h2>
            <label>Heading<input value={experience.completionHeading ?? "That's it."} onChange={(event) => patchExperience({ completionHeading: event.target.value })} /></label>
            <label>Message<textarea rows={3} value={experience.completionBody ?? resolved.completionBody} onChange={(event) => patchExperience({ completionBody: event.target.value })} /></label>
            <label>Next step<textarea rows={2} value={experience.completionNext ?? ""} onChange={(event) => patchExperience({ completionNext: event.target.value })} /></label>
            <label>Signature<input value={experience.signature ?? ""} onChange={(event) => patchExperience({ signature: event.target.value })} /></label>
          </div>

          <fieldset>
            <legend>Questions?</legend>
            <label className="check-row">
              <input type="checkbox" checked={experience.helpEnabled ?? false} onChange={(event) => patchExperience({ helpEnabled: event.target.checked })} />
              Show
            </label>
            <label>Name<input value={experience.helpName ?? ""} onChange={(event) => patchExperience({ helpName: event.target.value })} /></label>
            <label>Email<input value={experience.helpEmail ?? ""} onChange={(event) => patchExperience({ helpEmail: event.target.value })} /></label>
            <label>Phone<input value={experience.helpPhone ?? ""} onChange={(event) => patchExperience({ helpPhone: event.target.value })} /></label>
            <label>Help text<textarea rows={2} value={experience.helpText ?? ""} onChange={(event) => patchExperience({ helpText: event.target.value })} /></label>
          </fieldset>

          <div>
            <h2>Words</h2>
            {(["client", "brand", "business", "project"] as const).map((term) => (
              <label key={term}>
                {term}
                <input value={experience.terms?.[term] ?? term} onChange={(event) => patchExperience({ terms: { ...experience.terms, [term]: event.target.value } })} />
              </label>
            ))}
          </div>

          <button type="submit" className="studio-button">Save</button>
        </div>
        <div className="preview-column" data-screen="agency-preview">
          <div className="intel-switch">
            <button type="button" aria-current={preview === "opening" ? "page" : undefined} onClick={() => setPreview("opening")}>Opening</button>
            <button type="button" aria-current={preview === "completion" ? "page" : undefined} onClick={() => setPreview("completion")}>Completion</button>
          </div>
          <div className="preview-row">
            <ExperiencePreview brand={{ ...brand, theme: { ...brand.theme, logo } }} frame="desktop" view={preview} />
            <ExperiencePreview brand={{ ...brand, theme: { ...brand.theme, logo } }} frame="mobile" view={preview} />
          </div>
        </div>
      </form>
    </div>
  );
}

function blankBrand(): WorkspaceBrand {
  return {
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
      welcomeLine: "",
      buttonStyle: "solid",
      optionalThemeMetadata: {},
    },
  };
}

function FileField({ label, onChange }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="studio-button file-field">
      {label}
      <input type="file" accept="image/*" onChange={onChange} />
    </label>
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

function FontField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const current = APPROVED_FONTS.find((font) => font.toLowerCase() === value.toLowerCase()) ?? "Satoshi";
  return (
    <label>
      {label}
      <select value={current} onChange={(event) => onChange(event.target.value)}>
        {APPROVED_FONTS.map((font) => <option key={font}>{font}</option>)}
      </select>
    </label>
  );
}
