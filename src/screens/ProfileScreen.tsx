import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChoiceCard } from "../components/ChoiceCard";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { DiscoveryLayout } from "../components/DiscoveryLayout";
import { NavigationControls } from "../components/NavigationControls";
import { ProfileReveal } from "../components/ProfileReveal";
import { QuestionScreen } from "../components/QuestionScreen";
import { TerritoryReveal, type RevealBeat } from "../components/TerritoryReveal";
import { TextResponse } from "../components/TextResponse";
import { buildBrandIntelligence } from "../domain/brandIntelligence";
import { strategistEvidenceHash } from "../domain/creativeReading";
import { activeProfileVersion, hashEvidence, profileRequestFromSession } from "../domain/profileRequest";
import { pathFor } from "../domain/sections";
import { requestProfile } from "../services/ai/profileClient";
import { requestStrategist } from "../services/ai/strategistClient";
import { useSession } from "../state/SessionContext";
import { useConversation } from "../state/useConversation";
import type { CreativeTerritory } from "../types/brandIntelligence";
import type { ProfileFeedbackResponse } from "../types/discovery";

const inFlight = new Set<string>();
const COUNT_WORDS = ["one", "two", "three", "four"];

export function ProfileScreen() {
  const navigate = useNavigate();
  const { session, beginProfile, recordProfile, setProfileFeedback, beginRefinement, recordRefinement, setTerritoryReaction, setTerritoryPreference, beginStrategist, recordStrategist, failStrategist } = useSession();
  const { step, goBack, showBack } = useConversation("profile");
  const profile = session.discoveryProfile;
  const intelligence = useMemo(() => buildBrandIntelligence(session), [session]);
  const consistent = intelligence.draftModel.signals.filter(
    (signal) => signal.polarity === "positive" && signal.strength !== "exploratory",
  );
  const version = activeProfileVersion(profile.versions, profile.activeVersion);
  const [choice, setChoice] = useState<ProfileFeedbackResponse | null>(profile.clientFeedback?.response ?? null);
  const [note, setNote] = useState(profile.clientFeedback?.note ?? "");
  const [beat, setBeat] = useState<RevealBeat>({ kind: "seeing" });
  const copy = beatCopy(beat, intelligence.draftTerritories);

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

  useEffect(() => {
    const hash = strategistEvidenceHash(session);
    const strategist = session.strategist;
    if (strategist.status === "running") return;
    if (strategist.evidenceHash === hash && (strategist.status === "ready" || strategist.status === "failed")) return;
    const flight = `strategist:${session.id}:${hash}`;
    if (inFlight.has(flight)) return;
    inFlight.add(flight);
    beginStrategist();
    void requestStrategist(session, intelligence).then((result) => {
      inFlight.delete(flight);
      if (result.reading) recordStrategist(hash, result.reading);
      else failStrategist(hash, result.failureCode ?? "unavailable");
    });
  }, [beginStrategist, failStrategist, intelligence, recordStrategist, session]);

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
  const readyToLeave = beat.kind === "compare" && session.territoryFeedback.preference != null;

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
      <QuestionScreen size="hero" kicker="Discovery" title={copy.title} supporting={copy.supporting}>
          <TerritoryReveal
            territories={intelligence.draftTerritories}
            specs={intelligence.draftVisualSpecs}
            reactions={session.territoryFeedback.reactions}
            preference={session.territoryFeedback.preference}
            onReact={setTerritoryReaction}
            onPrefer={setTerritoryPreference}
            onBeat={setBeat}
            reading={intelligence.reading}
          />
          {readyToLeave ? (
            <button
              type="button"
              className="text-button profile-continue"
              data-testid="continue"
              onClick={() => finish(choice === "not_really" ? "not_really" : choice === "mostly" ? "mostly" : "yes", note.trim() || null)}
            >
              Continue
            </button>
          ) : null}
          <details className="written-reading">
            <summary>{version ? "A written reading, if you want one" : "A written reading is still forming."}</summary>
            {version ? (
              <>
                <ProfileReveal content={version.content} assembled={version.usedFallback} signals={consistent} />
                {revised ? (
                  <button type="button" className="text-button profile-continue" onClick={() => finish(choice === "not_really" ? "not_really" : "mostly", note.trim() || null)}>
                    This is a good place to stop
                  </button>
                ) : (
                  <Feedback choice={choice} note={note} onChoice={setChoice} onNote={setNote} onYes={() => finish("yes", null)} onRevise={revise} />
                )}
              </>
            ) : (
              <p className="profile-note">{profile.status === "refining" ? "Revising this from what you said." : "Reading what you've told us."}</p>
            )}
          </details>
      </QuestionScreen>
    </DiscoveryLayout>
  );
}

function beatCopy(beat: RevealBeat, territories: CreativeTerritory[]): { title: string; supporting?: string } {
  if (beat.kind === "seeing") {
    return {
      title: "We think we're seeing something.",
      supporting: "Your answers and the things you chose are starting to point somewhere.",
    };
  }
  if (beat.kind === "fork") {
    const count = COUNT_WORDS[territories.length - 1] ?? String(territories.length);
    const noun = territories.length === 1 ? "creative territory" : "creative territories";
    return { title: `Your choices point toward ${count} possible ${noun}.` };
  }
  if (beat.kind === "territory") {
    const territory = territories[beat.index];
    return {
      title: `Territory ${String(beat.index + 1).padStart(2, "0")}`,
      supporting: territory ? `${territory.name}. ${territory.oneLineIdea}` : undefined,
    };
  }
  return { title: "Which would you most like to explore with your media manager?" };
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
