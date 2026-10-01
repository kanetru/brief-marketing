import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { managerWorkspaceAllowed, resolveSurface, sharePath } from "../../domain/project/access";
import { clientDestination } from "../../domain/project/clientAccess";
import { projectByToken, readRole, writeRole } from "../../state/projectStore";
import { RoutePrefix } from "../../state/routeBase";
import { ClientProjectScope, useClientProject, useProjects } from "../../state/ProjectContext";
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
  const { projects, saveDiscovery, markOpened } = useProjects();
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
    if (project.discoveryStatus === "draft" || project.discoveryStatus === "invited") {
      markOpened(project.id);
    }
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
        <ClientSurface />
      </RoutePrefix>
    </ClientProjectScope>
  );
}

function ClientSurface() {
  const project = useClientProject();
  const location = useLocation();

  if (!project) return <Outlet />;
  const section = location.pathname.split("/").filter(Boolean).pop() ?? "";
  const destination = clientDestination(project.discoveryStatus);
  if (section === "profile" || section === "handover" || section === "territories") {
    return <Navigate to={destination === "follow_up" ? "follow-up" : destination === "complete" ? "complete" : "start"} replace />;
  }
  if (destination === "complete" && section !== "complete") return <Navigate to="complete" replace />;
  if (destination === "follow_up" && section !== "follow-up") return <Navigate to="follow-up" replace />;
  if (destination === "discovery" && (section === "complete" || section === "follow-up" || section === "profile")) {
    return <Navigate to="start" replace />;
  }
  return <Outlet />;
}

export function ClientIndex() {
  const project = useClientProject();
  const destination = project ? clientDestination(project.discoveryStatus) : "discovery";
  if (destination === "complete") return <Navigate to="complete" replace />;
  if (destination === "follow_up") return <Navigate to="follow-up" replace />;
  return <Navigate to="start" replace />;
}
