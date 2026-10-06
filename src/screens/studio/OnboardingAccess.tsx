import { useState } from "react";
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
  const ready = heading.startsWith("Your client");
  return (
    <section className="studio-panel look-section onboarding-panel" data-screen="client-onboarding">
      <h2>{project.businessName || heading}</h2>
      <p>{heading}</p>
      {ready ? <p>Send this link to your client. Their answers will appear here when they finish.</p> : null}
      {ready ? null : <p className="studio-meta" data-screen="onboarding-status">{onboardingStatusLabel(project.discoveryStatus)}</p>}
      <OnboardingActions project={project} onCopy={onCopy} onSend={onSend} hideSend={ready} />
      {ready ? null : <button type="button" className="studio-text-button" onClick={onViewResponses}>View responses</button>}
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
  hideSend = false,
}: {
  project: BriefProject;
  onCopy: () => void;
  onSend: () => void;
  hideSend?: boolean;
}) {
  const live = sharePath(project.shareToken);
  const [copied, setCopied] = useState(false);
  return (
    <ActionGroup>
      <button type="button" className="studio-button" data-client-link={live} onClick={() => { onCopy(); setCopied(true); }}>{copied ? "Link copied" : "Copy link"}</button>
      <Link className="studio-text-button" to={previewPath(project.id)}>Preview</Link>
      <a className="studio-text-button" href={live} target="_blank" rel="noopener noreferrer">Open as client</a>
      {!hideSend && project.discoveryStatus === "draft" ? (
        <button type="button" className="studio-text-button" onClick={onSend}>Mark as sent</button>
      ) : null}
    </ActionGroup>
  );
}
