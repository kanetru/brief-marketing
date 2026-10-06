import { Link } from "react-router-dom";
import { ActionGroup } from "../../components/ActionGroup";
import { sharePath } from "../../domain/project/access";
import { onboardingIncomplete, onboardingStatusLabel, previewPath } from "../../domain/workspace/onboardingAccess";
import type { BriefProject } from "../../types/project";

export function ClientOnboardingSection({
  project,
  heading = "Client onboarding",
  onCopy,
  onSend,
  onViewResponses,
}: {
  project: BriefProject;
  heading?: string;
  onCopy: () => void;
  onSend: () => void;
  onViewResponses: () => void;
}) {
  return (
    <section className="studio-panel look-section onboarding-panel" data-screen="client-onboarding">
      <h2>{project.businessName || heading}</h2>
      <p>{heading}</p>
      <p className="studio-meta" data-screen="onboarding-status">{onboardingStatusLabel(project.discoveryStatus)}</p>
      <OnboardingActions project={project} onCopy={onCopy} onSend={onSend} />
      <button type="button" className="studio-text-button" onClick={onViewResponses}>View responses</button>
    </section>
  );
}

export function OnboardingStatusLine({
  project,
  onViewResponses,
}: {
  project: BriefProject;
  onViewResponses: () => void;
}) {
  if (onboardingIncomplete(project.discoveryStatus)) return null;
  return (
    <p className="studio-meta" data-screen="onboarding-complete">
      {onboardingStatusLabel(project.discoveryStatus)}
      {" · "}
      <button type="button" className="studio-text-button" onClick={onViewResponses}>View responses</button>
    </p>
  );
}

export function OnboardingActions({
  project,
  onCopy,
  onSend,
}: {
  project: BriefProject;
  onCopy: () => void;
  onSend: () => void;
}) {
  const live = sharePath(project.shareToken);
  return (
    <ActionGroup>
      <button type="button" className="studio-button" data-client-link={live} onClick={onCopy}>Copy link</button>
      <Link className="studio-button" to={previewPath(project.id)}>Preview</Link>
      <a className="studio-button" href={live} target="_blank" rel="noopener noreferrer">Open as client</a>
      {project.discoveryStatus === "draft" ? (
        <button type="button" className="studio-text-button" onClick={onSend}>Mark as sent</button>
      ) : null}
    </ActionGroup>
  );
}
