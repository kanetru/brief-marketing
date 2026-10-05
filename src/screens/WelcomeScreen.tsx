import { LoverLoverLogo } from "../components/LoverLoverLogo";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { useAgencyBrand } from "../components/useAgencyBrand";
import { helpVisible, resolveExperience } from "../domain/agency/experience";
import { openingLogo } from "../domain/agency/theme";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { canAdvance } from "../state/guards";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";
import type { ResolvedExperience } from "../domain/agency/experience";

export function WelcomeScreen() {
  const { session } = useSession();
  const project = useClientProject();
  const brand = useAgencyBrand();
  const { step, goBack, goForward, showBack, showForward } = useConversation("welcome");
  const resume = session.progress.furthest !== "welcome";
  const experience = brand ? resolveExperience(brand) : null;
  const manager = brand?.contactName || (project ? DEMO_ACCOUNT.name : null);
  const logo = brand ? openingLogo(brand.theme, "dark") : "";

  return (
    <DiscoveryLayout
      section="welcome"
      step={step}
      width="hero"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={showForward}
          onBack={goBack}
          onForward={goForward}
          forwardLabel={resume ? "Keep going" : experience?.openingButton || "Begin"}
          forwardDisabled={!canAdvance(session, "welcome", step)}
        />
      }
    >
      <article className="opening" data-screen="discovery-open">
        {experience ? (
          <>
            {logo ? <img src={logo} alt="" className="opening-mark" /> : null}
            {experience.openingEyebrow ? <p className="kicker">{experience.openingEyebrow}</p> : null}
            <h1 className="display opening-title">{experience.openingHeading}</h1>
            <p className="opening-support">{experience.openingSupport}</p>
            {experience.expectationEnabled ? (
              <aside className="statement" data-screen="expectation">
                <p className="kicker">{experience.expectationHeading}</p>
                <p>{experience.expectationBody}</p>
              </aside>
            ) : null}
            {experience.introEnabled && experience.introMessage ? (
              <aside className="statement" data-screen="manager-intro">
                {experience.managerPhoto ? <img src={experience.managerPhoto} alt="" className="manager-photo" /> : null}
                {experience.managerName ? <p className="kicker">{experience.managerName}</p> : null}
                <p>{experience.introMessage}</p>
              </aside>
            ) : null}
            {helpVisible(experience) ? <HelpBlock experience={experience} /> : null}
          </>
        ) : (
          <>
            <h1 className="display opening-title">Brief</h1>
            <p className="opening-by">by</p>
            <LoverLoverLogo kind="secondary" color="pearl" className="opening-mark" alt="Lover Lover" />
            <p className="opening-support">Know the brand. Watch the market. See what's next.</p>
          </>
        )}
        {experience ? null : (
          <p className="opening-note">
            {manager
              ? `${manager} asked for this. Your answers go to ${brand?.name || manager}. You won't need an account, and you won't be handed a strategy.`
              : "Brand intelligence for marketing people. This conversation is how a manager learns the business."}
          </p>
        )}
      </article>
    </DiscoveryLayout>
  );
}

function HelpBlock({ experience }: { experience: ResolvedExperience }) {
  return (
    <aside className="statement" data-screen="client-help">
      <p className="kicker">{experience.helpHeading}</p>
      {experience.helpName ? <p>{experience.helpName}</p> : null}
      {experience.helpText ? <p>{experience.helpText}</p> : null}
      {experience.helpEmail ? <p>{experience.helpEmail}</p> : null}
      {experience.helpPhone ? <p>{experience.helpPhone}</p> : null}
    </aside>
  );
}
