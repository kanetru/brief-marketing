import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChoiceCard } from "../components/ChoiceCard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { ProfileReveal } from "../components/ProfileReveal";
import { QuestionScreen } from "../components/QuestionScreen";
import { TextResponse } from "../components/TextResponse";
import { TransitionWrapper } from "../components/TransitionWrapper";
import { activeProfileVersion, hashEvidence, profileRequestFromSession } from "../domain/profileRequest";
import { pathFor } from "../domain/sections";
import { requestProfile } from "../services/ai/profileClient";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";
import type { ProfileFeedbackResponse } from "../types/discovery";

const inFlight = new Set<string>();

export function ProfileScreen() {
  const navigate = useNavigate();
  const { session, beginProfile, recordProfile, setProfileFeedback, beginRefinement, recordRefinement } = useSession();
  const { step, goBack, showBack } = useConversation("profile");
  const profile = session.discoveryProfile;
  const version = activeProfileVersion(profile.versions, profile.activeVersion);
  const [choice, setChoice] = useState<ProfileFeedbackResponse | null>(profile.clientFeedback?.response ?? null);
  const [note, setNote] = useState(profile.clientFeedback?.note ?? "");

  useEffect(() => {
    const request = profileRequestFromSession(session);
    const hash = hashEvidence(request.evidence);
    const stale = version != null && version.evidenceHash !== hash && profile.clientFeedback == null;
    const shouldGenerate = profile.status === "not_compiled" || (profile.status === "ready" && stale);
    if (!shouldGenerate || inFlight.has(session.id)) return;
    inFlight.add(session.id);
    beginProfile();
    void requestProfile(request).then((result) => {
      inFlight.delete(session.id);
      recordProfile(result.version, result.failureCode);
    });
  }, [beginProfile, profile.clientFeedback, profile.status, recordProfile, session, version]);

  function finish(response: ProfileFeedbackResponse, written: string | null) {
    setProfileFeedback({ response, note: written, capturedAt: new Date().toISOString() });
    navigate(pathFor("complete"));
  }

  function revise() {
    const written = note.trim();
    if (!written || !version || profile.versions.length !== 1 || inFlight.has(session.id)) return;
    const feedback = {
      response: choice === "not_really" ? "not_really" : "mostly",
      note: written,
      capturedAt: new Date().toISOString(),
    } as const;
    setProfileFeedback(feedback);
    beginRefinement();
    inFlight.add(session.id);
    const request = profileRequestFromSession(session);
    void requestProfile(request, version.content, written).then((result) => {
      inFlight.delete(session.id);
      recordRefinement(result.version, result.failureCode);
    });
  }

  const revised = profile.versions.length > 1;
  const waiting = profile.status === "running" || profile.status === "refining" || profile.status === "not_compiled";

  return (
    <DiscoveryLayout
      section="profile"
      step={step}
      width="stage"
      footer={
        <NavigationControls
          showBack={showBack}
          showForward={false}
          onBack={goBack}
          onForward={() => undefined}
          forwardLabel="Continue"
        />
      }
    >
      <TransitionWrapper transitionKey={`profile-${profile.status}-${version?.version ?? 0}`}>
        <QuestionScreen
          size="hero"
          kicker="Discovery"
          title="Here's what we're hearing."
          supporting="This is an interpretation of what you've told us — not a finished brand identity or creative strategy."
        >
          <p className="closing-copy">It gives your media manager a stronger starting point for working with you.</p>
          {waiting || !version ? (
            <p className="profile-note">{profile.status === "refining" ? "Revising this from what you said." : "Reading what you've told us."}</p>
          ) : (
            <>
              <ProfileReveal content={version.content} assembled={version.usedFallback} />
              {revised ? (
                <div className="profile-feedback">
                  <p className="profile-summary">
                    {version.usedFallback
                      ? "Your correction is saved with the handover. The earlier reading is still the one shown here."
                      : "Updated from what you said."}
                  </p>
                  <button type="button" className="text-button profile-continue" onClick={() => finish(choice === "not_really" ? "not_really" : "mostly", note.trim())}>
                    This is a good place to stop
                  </button>
                </div>
              ) : (
                <Feedback
                  choice={choice}
                  note={note}
                  onChoice={setChoice}
                  onNote={setNote}
                  onYes={() => finish("yes", null)}
                  onRevise={revise}
                />
              )}
            </>
          )}
        </QuestionScreen>
      </TransitionWrapper>
    </DiscoveryLayout>
  );
}

function Feedback({
  choice,
  note,
  onChoice,
  onNote,
  onYes,
  onRevise,
}: {
  choice: ProfileFeedbackResponse | null;
  note: string;
  onChoice: (value: ProfileFeedbackResponse) => void;
  onNote: (value: string) => void;
  onYes: () => void;
  onRevise: () => void;
}) {
  return (
    <div className="profile-feedback">
      <h2>Did we understand you?</h2>
      <ChoiceGrid columns={1} labelledBy="question-title">
        <ChoiceCard label="Yes" hint="This feels like a good starting point." pressed={choice === "yes"} onClick={() => onChoice("yes")} />
        <ChoiceCard label="Mostly" hint="There's something I'd change." pressed={choice === "mostly"} onClick={() => onChoice("mostly")} />
        <ChoiceCard label="Not really" hint="We've misunderstood something." pressed={choice === "not_really"} onClick={() => onChoice("not_really")} />
      </ChoiceGrid>
      {choice === "yes" ? (
        <button type="button" className="text-button profile-continue" onClick={onYes}>
          Continue
        </button>
      ) : null}
      {choice === "mostly" || choice === "not_really" ? (
        <div className="revision">
          <p className="profile-summary">Tell us what doesn't feel right.</p>
          <TextResponse labelledBy="question-title" length="long" value={note} placeholder="What should we correct?" onChange={onNote} />
          <button type="button" className="text-button profile-continue" disabled={!note.trim()} onClick={onRevise}>
            Revise this
          </button>
        </div>
      ) : null}
    </div>
  );
}
