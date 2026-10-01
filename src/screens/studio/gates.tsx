import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { managerWorkspaceAllowed, resolveSurface, sharePath } from "../../domain/project/access";
import { projectByToken, readRole, writeRole } from "../../state/projectStore";
import { RoutePrefix } from "../../state/routeBase";
import { ClientProjectScope, useProjects } from "../../state/ProjectContext";
import { useSession } from "../../state/SessionContext";
import { loadSession, saveSession } from "../../state/storage";

export function ManagerGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [, redraw] = useState(0);
  const allowed = managerWorkspaceAllowed(resolveSurface(location.pathname, readRole()));

  useEffect(() => {
    if (managerWorkspaceAllowed(resolveSurface(location.pathname, readRole()))) {
      writeRole("manager");
    }
  }, [location.pathname]);

  if (!allowed) {
    return (
      <main className="studio-denied">
        <p className="studio-kicker">Brief</p>
        <h1>This view is for the manager.</h1>
        <p>The client link stays on discovery. The workspace is not part of that conversation.</p>
        <button
          type="button"
          className="studio-button"
          onClick={() => {
            writeRole("manager");
            redraw((value) => value + 1);
          }}
        >
          I'm the manager
        </button>
        <Link to="/demo/start">Back to discovery</Link>
      </main>
    );
  }

  return children;
}

export function ClientProjectGate() {
  const { token = "" } = useParams();
  const { projects, saveDiscovery } = useProjects();
  const { hydrate, setPersister } = useSession();
  const project = projectByToken(projects, token);

  useLayoutEffect(() => {
    if (!project) return;
    const projectId = project.id;
    const discoveryId = project.discovery.id;
    writeRole("client");
    setPersister((session) => {
      if (session.id !== discoveryId) return;
      saveDiscovery(projectId, session);
    });
    hydrate(project.discovery);
    return () => {
      setPersister(saveSession);
      hydrate(loadSession());
    };
    // Hydrate once per project. Later edits flow session → project, not the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  if (!project) {
    return (
      <main className="studio-denied">
        <p className="studio-kicker">Brief</p>
        <h1>This discovery link doesn't match a project.</h1>
        <p>Ask the person who sent it for a fresh link.</p>
      </main>
    );
  }

  return (
    <ClientProjectScope project={project}>
      <RoutePrefix prefix={sharePath(project.shareToken).replace(/\/start$/, "")}>
        <Outlet />
      </RoutePrefix>
    </ClientProjectScope>
  );
}

export function ClientIndex() {
  return <Navigate to="start" replace />;
}
