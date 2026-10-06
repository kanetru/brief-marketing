import { useLayoutEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { previewPath } from "../../domain/workspace/onboardingAccess";
import { ClientProjectScope, MutedProjectScope, useProjects } from "../../state/ProjectContext";
import { RoutePrefix } from "../../state/routeBase";
import { useSession } from "../../state/SessionContext";
import { loadSession, saveSession } from "../../state/storage";

/**
 * Manager preview of the client onboarding.
 * It hydrates a copy of the discovery and refuses project writes, so Finish and learning beats cannot submit or mark the link opened.
 */
export function OnboardingPreview() {
  const { projectId = "" } = useParams();
  const { projects } = useProjects();
  const { hydrate, setPersister } = useSession();
  const project = projects.find((item) => item.id === projectId) ?? null;

  useLayoutEffect(() => {
    if (!project) return;
    const snapshot = structuredClone(loadSession());
    setPersister(() => undefined);
    hydrate(structuredClone(project.discovery));
    return () => {
      setPersister(saveSession);
      hydrate(snapshot);
    };
    // Hydrate once per project. Preview edits stay in memory until the manager leaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  if (!project) {
    return (
      <main className="studio-denied">
        <h1>That project isn't on this machine.</h1>
        <Link to="/studio">All clients</Link>
      </main>
    );
  }

  return (
    <MutedProjectScope>
      <ClientProjectScope project={project}>
        <RoutePrefix prefix={previewPath(project.id)}>
          <div className="onboarding-preview" data-screen="onboarding-preview">
            <p className="preview-banner" role="status">
              Preview. Nothing here is saved.
            </p>
            <p className="studio-links">
              <Link to={`/studio/${project.id}`}>Back to client</Link>
            </p>
            <Outlet />
          </div>
        </RoutePrefix>
      </ClientProjectScope>
    </MutedProjectScope>
  );
}
