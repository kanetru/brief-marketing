import { previewExperience } from "../domain/agency/experience";
import { contrastRatio, openingLogo, themeVars } from "../domain/agency/theme";
import type { WorkspaceBrand } from "../types/agency";

export function ExperiencePreview({
  brand,
  frame,
  view,
}: {
  brand: WorkspaceBrand;
  frame: "desktop" | "mobile";
  view: "opening" | "completion";
}) {
  const experience = previewExperience(brand);
  const surface = contrastRatio("#1C1A17", brand.theme.colourBackground) >= 4.5 ? "light" : "dark";
  const logo = openingLogo(brand.theme, surface) || brand.theme.mark;
  return (
    <aside
      className={`agency-preview is-${frame}`}
      style={themeVars(brand.theme)}
      data-screen={frame === "desktop" ? "agency-preview-desktop" : "agency-preview-mobile"}
      data-preview={view}
      data-button={brand.theme.buttonStyle || "solid"}
    >
      {view === "opening" ? (
        <>
          {logo ? <img src={logo} alt="" className="agency-preview-logo" /> : null}
          <p className="studio-kicker">{experience.openingEyebrow}</p>
          <p className="agency-preview-name">{experience.openingHeading}</p>
          <p>{experience.openingSupport}</p>
          {experience.expectationEnabled ? (
            <p data-preview-expectation="true"><strong>{experience.expectationHeading}</strong> {experience.expectationBody}</p>
          ) : null}
          {experience.introEnabled && experience.introMessage ? (
            <p data-screen="manager-intro">{experience.managerName ? `${experience.managerName}. ` : ""}{experience.introMessage}</p>
          ) : null}
          <p className={`preview-button is-${brand.theme.buttonStyle || "solid"}`}>{experience.openingButton}</p>
        </>
      ) : (
        <>
          <p className="agency-preview-name">{experience.completionHeading}</p>
          <p>{experience.completionBody}</p>
          {experience.completionNext ? <p>{experience.completionNext}</p> : null}
          {experience.signature ? <p>{experience.signature}</p> : null}
        </>
      )}
      <p className="powered-by">Powered by Brief by Lover Lover</p>
    </aside>
  );
}
