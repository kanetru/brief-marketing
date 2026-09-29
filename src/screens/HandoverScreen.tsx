import { Link } from "react-router-dom";
import { AgencyMark } from "../components/AgencyMark";
import { HandoverDocument } from "../components/HandoverDocument";
import { compileProfile } from "../domain/compileProfile";
import { activeProfileVersion, profileRequestFromSession } from "../domain/profileRequest";
import { useSession } from "../state/SessionContext";

export function HandoverScreen() {
  const { session } = useSession();
  const request = profileRequestFromSession(session);
  const saved = activeProfileVersion(session.discoveryProfile.versions, session.discoveryProfile.activeVersion);
  const content =
    saved?.content ??
    compileProfile({
      evidence: request.evidence,
      observations: request.observations,
      clarifications: request.clarifications,
      model: null,
      meta: {
        generatedAt: session.updatedAt,
        version: 0,
        source: "fallback",
        promptVersion: null,
        provider: null,
        modelName: null,
        feedback: null,
        failureCode: null,
      },
    }).content;
  const name = request.evidence.clientSaid["business.name"] ?? "Discovery";

  return (
    <div className="handover-page">
      <header className="handover-bar no-print">
        <AgencyMark />
        <div className="handover-actions">
          <Link to="/demo/profile">Back to the client review</Link>
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </header>
      <p className="handover-client">{name}</p>
      {!saved ? <p className="profile-note no-print">This copy was assembled from the answers. The reviewed profile has not been saved yet.</p> : null}
      <HandoverDocument content={content} evidence={request.evidence} clarifications={request.clarifications} />
    </div>
  );
}
