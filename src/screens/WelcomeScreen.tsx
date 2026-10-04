import { LoverLoverLogo } from "../components/LoverLoverLogo";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { useAgencyBrand } from "../components/useAgencyBrand";
import { DEMO_ACCOUNT } from "../domain/project/account";
import { canAdvance } from "../state/guards";
import { useClientProject } from "../state/ProjectContext";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";

export function WelcomeScreen() {
  const { session } = useSession();
  const project = useClientProject();
  const brand = useAgencyBrand();
  const { step, goBack, goForward, showBack, showForward } = useConversation("welcome");
  const resume = session.progress.furthest !== "welcome";
  const manager = brand?.contactName || (project ? DEMO_ACCOUNT.name : null);

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
          forwardLabel={resume ? "Keep going" : "Begin"}
          forwardDisabled={!canAdvance(session, "welcome", step)}
        />
      }
    >
      <article className="opening" data-screen="discovery-open">
        {brand ? (
          <>
            {brand.theme.logo ? <img src={brand.theme.logo} alt="" className="opening-mark" /> : null}
            <h1 className="display opening-title">{brand.name}</h1>
            <p className="opening-support">{brand.theme.welcomeLine || "We're going to learn how your business thinks, sounds and looks."}</p>
          </>
        ) : (
          <>
            <h1 className="display opening-title">Brief</h1>
            <p className="opening-by">by</p>
            <LoverLoverLogo kind="secondary" color="pearl" className="opening-mark" alt="Lover Lover" />
            <p className="opening-support">Know the brand. Watch the market. See what's next.</p>
          </>
        )}
        <p className="opening-note">
          {manager
            ? `${manager} asked for this. Your answers go to ${brand?.name || manager}. You won't need an account, and you won't be handed a strategy.`
            : "Brand intelligence for marketing people. This conversation is how a manager learns the business."}
        </p>
      </article>
    </DiscoveryLayout>
  );
}
