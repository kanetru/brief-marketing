import { previewExperience } from "../domain/agency/experience";
import { contrastRatio, openingLogo, themeVars } from "../domain/agency/theme";
import type { WorkspaceBrand } from "../types/agency";

export type PreviewStage = "opening" | "question" | "entries" | "choices" | "colour" | "type" | "final" | "completion";

export function ExperiencePreview({
  brand,
  frame,
  view,
}: {
  brand: WorkspaceBrand;
  frame: "desktop" | "mobile";
  view: PreviewStage;
}) {
  const experience = previewExperience(brand);
  const surface = contrastRatio("#1C1A17", brand.theme.colourBackground) >= 4.5 ? "light" : "dark";
  const logo = openingLogo(brand.theme, surface) || brand.theme.mark;
  return (
    <aside
      className={`agency-preview agency-frame shell is-${frame}`}
      style={themeVars(brand.theme)}
      data-agency={brand.workspaceId || "preview"}
      data-button={brand.theme.buttonStyle || "solid"}
      data-screen={frame === "desktop" ? "agency-preview-desktop" : "agency-preview-mobile"}
      data-preview={view}
    >
      {logo ? <img src={logo} alt="" className="agency-preview-logo" /> : null}
      {view === "opening" ? <Opening experience={experience} button={brand.theme.buttonStyle || "solid"} /> : null}
      {view === "question" ? <Question prompt="What does the business do?" field="A short description" /> : null}
      {view === "entries" ? (
        <div data-preview-entries="true">
          <p className="agency-preview-name">What do you sell?</p>
          <p className="preview-field">Dinnerware</p>
          <p className="preview-field">Workshops</p>
          <p className={`preview-button is-${brand.theme.buttonStyle || "solid"}`}>Continue</p>
        </div>
      ) : null}
      {view === "choices" ? <Choices /> : null}
      {view === "colour" ? <ColourStage /> : null}
      {view === "type" ? <TypeStage font={brand.theme.headingFont} /> : null}
      {view === "final" ? <Question prompt="Anything else we should know?" field="Optional" /> : null}
      {view === "completion" ? (
        <>
          <p className="agency-preview-name">{experience.completionHeading}</p>
          <p>{experience.completionBody}</p>
          {experience.completionNext ? <p>{experience.completionNext}</p> : null}
          {experience.signature ? <p>{experience.signature}</p> : null}
        </>
      ) : null}
      <p className="powered-by">Powered by Brief by Lover Lover</p>
    </aside>
  );
}

function Opening({
  experience,
  button,
}: {
  experience: ReturnType<typeof previewExperience>;
  button: string;
}) {
  return (
    <>
      <p className="studio-kicker">{experience.openingEyebrow}</p>
      <p className="agency-preview-name">{experience.openingHeading}</p>
      <p>{experience.openingSupport}</p>
      {experience.expectationEnabled ? (
        <p data-preview-expectation="true"><strong>{experience.expectationHeading}</strong> {experience.expectationBody}</p>
      ) : null}
      {experience.introEnabled && experience.introMessage ? (
        <p data-screen="manager-intro">{experience.managerName ? `${experience.managerName}. ` : ""}{experience.introMessage}</p>
      ) : null}
      <p className={`preview-button is-${button}`}>{experience.openingButton}</p>
    </>
  );
}

function Question({ prompt, field }: { prompt: string; field: string }) {
  return (
    <div data-preview-question="true">
      <div className="progress" aria-hidden="true"><span className="track"><span className="fill" style={{ width: "28%" }} /></span></div>
      <p className="agency-preview-name">{prompt}</p>
      <p className="preview-field">{field}</p>
      <p className="preview-button is-solid">Continue</p>
    </div>
  );
}

function Choices() {
  return (
    <div data-preview-choices="true">
      <p className="agency-preview-name">Which feels closest?</p>
      <div className="choice-grid">
        <p className="choice-card" aria-pressed="true">Handmade<small>Selected</small></p>
        <p className="choice-card">Seasonal</p>
      </div>
    </div>
  );
}

function ColourStage() {
  return (
    <div data-preview-colour="true">
      <p className="agency-preview-name">Colour</p>
      <div className="preview-swatches" aria-hidden="true">
        <span style={{ background: "#F4C7A1" }} />
        <span style={{ background: "#1F3A5F" }} />
        <span style={{ background: "#E7E1D5" }} />
      </div>
    </div>
  );
}

function TypeStage({ font }: { font: string }) {
  return (
    <div data-preview-type="true">
      <p className="agency-preview-name">Type</p>
      <p className="type-world-name" style={{ fontFamily: font }}>{font.split(",")[0]}</p>
    </div>
  );
}
