import { Link } from "react-router-dom";
import { LoverLoverLogo } from "../components/LoverLoverLogo";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { QuestionScreen } from "../components/QuestionScreen";
import { useAgencyBrand } from "../components/useAgencyBrand";
import { helpVisible, resolveExperience } from "../domain/agency/experience";
import { POWERED_BY } from "../domain/agency/theme";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { clientContribution, completionMessage } from "../domain/project/clientAccess";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function CompleteScreen() {
  const { activate, session } = useSession();
  const project = useClientProject();
  const brand = useAgencyBrand();
  const { step, goBack, showBack } = useConversation("complete");
  const experience = brand ? resolveExperience(brand) : null;
  const message = experience
    ? { title: experience.completionHeading, body: experience.completionBody, next: experience.completionNext }
    : completionMessage(brand?.name || DEMO_ACCOUNT.name);
  const given = clientContribution(session);

  if (project) {
    return (
      <DiscoveryLayout section="complete" step={step} width="hero" footer={<NavigationControls showBack={false} showForward={false} onBack={goBack} onForward={() => activate("complete")} forwardLabel="Continue" />}>
        <QuestionScreen size="hero" kicker={brand?.name || "Handoff"} title={message.title} supporting={message.body}>
          {brand?.theme.logo ? <img src={brand.theme.logo} alt="" className="opening-mark" /> : <LoverLoverLogo kind="icon" color="orange" className="brand-star" alt="" />}
          {message.next ? (
            <aside className="statement">
              <p className="statement-lead">{message.next}</p>
            </aside>
          ) : null}
          {experience?.signature ? <p>{experience.signature}</p> : null}
          {experience && helpVisible(experience) ? (
            <aside data-screen="client-help">
              <p className="kicker">{experience.helpHeading}</p>
              {experience.helpEmail ? <p>{experience.helpEmail}</p> : null}
              {experience.helpPhone ? <p>{experience.helpPhone}</p> : null}
            </aside>
          ) : null}
          <p className="powered-by">{POWERED_BY}</p>
          <p className="meta">
            {given.answered} questions answered · {given.visuals} visual directions explored · {given.references} references supplied
          </p>
        </QuestionScreen>
      </DiscoveryLayout>
    );
  }

  return (
    <DiscoveryLayout
      section="complete"
      step={step}
      width="hero"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={false}
          onBack={goBack}
          onForward={() => activate("complete")}
          forwardLabel="Continue"
        />
      }
    >
      <QuestionScreen
        size="hero"
        kicker="Handoff"
        title="That's it."
        supporting="Your answers are with your manager. You can leave this here."
      >
        <LoverLoverLogo kind="icon" color="orange" className="brand-star" alt="" />
        <LoverLoverLogo kind="secondary" color="pearl" className="opening-mark" alt="Lover Lover" />
        <aside className="statement">
          <p className="statement-lead">Brief has what it needs.</p>
          <p>Nothing here is a strategy. That stays with the person doing the work.</p>
        </aside>
        {project ? (
          <p className="meta">You can close this. The same link brings you back.</p>
        ) : (
          <p className="handover-link">
            <Link to="/demo/handover">Open the media manager handover</Link>
          </p>
        )}
      </QuestionScreen>
    </DiscoveryLayout>
  );
}
