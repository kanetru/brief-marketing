import type { DiscoveryStatus } from "../../types/project";

/** Manager-facing status. Internal enum names stay out of the UI. */
export function onboardingStatusLabel(status: DiscoveryStatus): string {
  switch (status) {
    case "draft":
      return "Ready to send";
    case "invited":
      return "Sent";
    case "opened":
    case "in_progress":
      return "In progress";
    case "submitted":
    case "follow_up_complete":
      return "Submitted";
    case "follow_up_requested":
      return "Follow-up requested";
    case "closed":
      return "Closed";
  }
}

/** A card or overview should offer a loud onboarding action. */
export function onboardingIncomplete(status: DiscoveryStatus): boolean {
  return status === "draft"
    || status === "invited"
    || status === "opened"
    || status === "in_progress"
    || status === "follow_up_requested";
}

/** Where a newly created client should point the manager. */
export function sendOnboardingHeading(created: boolean): string {
  return created ? "Your client onboarding is ready." : "Client onboarding";
}

/** Manager preview. Stays on a studio path so it is not the client's live link. */
export function previewPath(projectId: string): string {
  return `/studio/${projectId}/preview`;
}

/**
 * Preview can render the client screens without writing the project.
 * Every function on the project API becomes a no-op; data fields pass through.
 */
export function muteProjectWrites<T extends object>(api: T): T {
  return new Proxy(api, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return () => undefined;
    },
  });
}
