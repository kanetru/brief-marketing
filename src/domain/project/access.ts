export type Surface = "manager" | "client" | "demo";

export const DEMO_MANAGER_ID = "demo-manager";

/**
 * Temporary stand-in for auth. A client surface cannot open the manager workspace.
 * A later account system can replace this decision without changing the routes' meaning.
 */
export function resolveSurface(pathname: string, role: "manager" | "client" | null): Surface {
  if (pathname.startsWith("/c/")) return "client";
  if (pathname.startsWith("/studio")) {
    if (role === "client") return "client";
    return "manager";
  }
  return "demo";
}

export function managerWorkspaceAllowed(surface: Surface): boolean {
  return surface === "manager";
}

export function sharePath(token: string): string {
  return `/c/${token}/start`;
}
