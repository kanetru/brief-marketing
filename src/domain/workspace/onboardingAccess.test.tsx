import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { matchPath, MemoryRouter } from "react-router-dom";
import { AgencySetup } from "../../screens/studio/AgencySetup";
import { ClientCard } from "../../screens/studio/ProjectList";
import { ClientOnboardingSection } from "../../screens/studio/OnboardingAccess";
import { AgencyProvider } from "../../state/AgencyContext";
import { createProject, projectByToken } from "../../state/projectStore";
import { sharePath } from "../project/access";
import { withoutProject } from "../project/removeClient";
import { muteProjectWrites, onboardingIncomplete, onboardingStatusLabel, previewPath, sendOnboardingHeading } from "./onboardingAccess";

const AT = "2026-10-06T12:00:00.000Z";
const css = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("../../screens/studio/OnboardingPreview.tsx", import.meta.url), "utf8");
const listSource = readFileSync(new URL("../../screens/studio/ProjectList.tsx", import.meta.url), "utf8");
const gateSource = readFileSync(new URL("../../screens/studio/gates.tsx", import.meta.url), "utf8");

function project(status: "draft" | "submitted" | "follow_up_requested" | "closed" = "draft") {
  return createProject({
    clientName: "Ada",
    businessName: "DIRT",
    category: "Land Intelligence",
    discoveryStatus: status,
    now: AT,
  });
}

describe("client onboarding access", () => {
  it("labels the lifecycle without internal enum names", () => {
    expect(onboardingStatusLabel("draft")).toBe("Ready to send");
    expect(onboardingStatusLabel("invited")).toBe("Sent");
    expect(onboardingStatusLabel("opened")).toBe("In progress");
    expect(onboardingStatusLabel("in_progress")).toBe("In progress");
    expect(onboardingStatusLabel("submitted")).toBe("Submitted");
    expect(onboardingStatusLabel("follow_up_complete")).toBe("Submitted");
    expect(onboardingStatusLabel("follow_up_requested")).toBe("Follow-up requested");
    expect(onboardingStatusLabel("closed")).toBe("Closed");
    expect(Object.values({
      draft: onboardingStatusLabel("draft"),
      invited: onboardingStatusLabel("invited"),
      opened: onboardingStatusLabel("opened"),
      in_progress: onboardingStatusLabel("in_progress"),
      submitted: onboardingStatusLabel("submitted"),
      follow_up_requested: onboardingStatusLabel("follow_up_requested"),
      follow_up_complete: onboardingStatusLabel("follow_up_complete"),
      closed: onboardingStatusLabel("closed"),
    }).join(" ")).not.toMatch(/draft|invited|in_progress|follow_up/);
    expect(onboardingIncomplete("draft")).toBe(true);
    expect(onboardingIncomplete("follow_up_requested")).toBe(true);
    expect(onboardingIncomplete("submitted")).toBe(false);
    expect(onboardingIncomplete("closed")).toBe(false);
    expect(sendOnboardingHeading(true)).toBe("Client onboarding is ready.");
    expect(sendOnboardingHeading(false)).toBe("Client onboarding");
  });

  it("shows an onboarding action on an incomplete client card and keeps the logo inside the card link", () => {
    const item = project("draft");
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={item} />
      </MemoryRouter>,
    );
    const link = html.slice(html.indexOf("<a "), html.indexOf("</a>"));
    expect(link).toContain(`href="/studio/${item.id}"`);
    expect(link).toContain('data-logo="fallback"');
    expect(link).not.toContain("Open onboarding");
    expect(html).toContain("DIRT");
    expect(html).toContain("Land Intelligence");
    expect(html).not.toContain("Ready to send");
    expect(html).not.toContain("Open onboarding");
    expect(html).not.toContain("Copy link");
    expect(html).not.toContain("View responses");
  });

  it("keeps a completed card quiet and still able to open responses", () => {
    const item = project("submitted");
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientCard project={item} />
      </MemoryRouter>,
    );
    expect(html).not.toContain("Submitted");
    expect(html).not.toContain("View responses");
    expect(html).not.toContain("Open onboarding");
    expect(html).not.toContain("Copy link");
    expect(html).toContain('data-logo="fallback"');
  });

  it("puts client onboarding in settings with the live token and a separate preview", () => {
    const item = project("draft");
    const live = sharePath(item.shareToken);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ClientOnboardingSection
          project={item}
          heading="Client onboarding"
          onCopy={() => undefined}
          onSend={() => undefined}
          onViewResponses={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(html).toContain("DIRT");
    expect(html).toContain("Client onboarding");
    expect(html).toContain("Ready to send");
    expect(html).not.toContain(`https://brief.test${live}`);
    expect(html).not.toContain(`>${live}<`);
    expect(html).toContain(`data-client-link="${live}"`);
    expect(html).toContain("Copy link");
    expect(html).toContain(`href="${previewPath(item.id)}"`);
    expect(html).toContain("Preview");
    expect(html).toContain(`href="${live}"`);
    expect(html).toContain("Open as client");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Mark as sent");
    expect(html).toContain("View responses");
    expect(previewPath(item.id)).not.toBe(live);
  });

  it("keeps preview from writing the project and keeps the live route separate", () => {
    const item = project("draft");
    const calls: string[] = [];
    const api = {
      projects: [item],
      submitDiscovery: () => calls.push("submit"),
      markOpened: () => calls.push("open"),
      saveDiscovery: () => calls.push("save"),
    };
    const muted = muteProjectWrites(api);
    muted.submitDiscovery();
    muted.markOpened();
    muted.saveDiscovery();
    expect(calls).toEqual([]);
    expect(muted.projects).toEqual([item]);
    expect(previewSource).toContain("MutedProjectScope");
    expect(previewSource).toContain("setPersister");
    expect(previewSource).not.toMatch(/markOpened|saveDiscovery|submitDiscovery|writeRole\("client"\)/);
    expect(app).toContain('path="/studio/:projectId/preview"');
    expect(app).toContain('path="/c/:token"');
    expect(app).toContain('path="start"');
    const previewBlock = app.slice(app.indexOf('path="/studio/:projectId/preview"'), app.indexOf('path="/studio/:projectId"'));
    expect(previewBlock).toContain("OnboardingPreview");
    expect(previewBlock).not.toContain("ClientProjectGate");
    expect(matchPath({ path: "/c/:token/start", end: true }, sharePath(item.shareToken))?.params.token).toBe(item.shareToken);
    expect(matchPath({ path: "/studio/:projectId/preview", end: true }, previewPath(item.id))?.params.projectId).toBe(item.id);
    expect(matchPath({ path: "/studio/:projectId", end: true }, previewPath(item.id))).toBeNull();
    expect(listSource).toContain("created: true");
    expect(gateSource).toContain("projectByToken");
    expect(gateSource).toContain("This discovery link doesn");
  });

  it("drops the share token when the client is removed", () => {
    const item = project("submitted");
    const other = project("draft");
    const next = withoutProject([item, other], item.id);
    expect(projectByToken(next, item.shareToken)).toBeNull();
    expect(projectByToken(next, other.shareToken)?.id).toBe(other.id);
    expect(sharePath(item.shareToken)).toBe(`/c/${item.shareToken}/start`);
  });
});

describe("client experience layout", () => {
  it("groups look-page controls and separates each customisation section", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AgencyProvider>
          <AgencySetup />
        </AgencyProvider>
      </MemoryRouter>,
    );
    const logo = html.slice(html.indexOf('data-screen="logo-upload"'), html.indexOf('data-screen="colour-setup"'));
    expect(logo).toContain("action-group");
    expect(logo).toContain("Primary logo");
    expect(logo).toContain("Dark logo");
    expect(logo).toContain("Mark");
    expect(html).toContain("look-section");
    expect(html).toContain("look-colours");
    expect(html).toContain("Opening");
    expect(html).toContain("Completion");
    expect(html).toContain("action-footer");
    expect(html).toContain(">Save<");
    expect(css).toMatch(/\.look-editor \{[\s\S]*gap:\s*1\.35rem/);
    expect(css).toMatch(/\.look-section \{[\s\S]*gap:\s*0\.9rem/);
    expect(css).toMatch(/\.look-section \{[\s\S]*border:/);
    expect(css).toMatch(/\.action-group,\s*\n\.studio-row \{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.action-group,\s*\n\.studio-row \{[\s\S]*gap:\s*var\(--action-gap\)/);
    expect(css).toMatch(/\.look-section \.check-row \{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.look-section \.file-field \{[\s\S]*display:\s*inline-flex/);
    expect(css).toMatch(/\.look-section input\[type="color"\] \{[\s\S]*height:\s*44px/);
    expect(css).toMatch(/@media \(max-width: 800px\) \{[\s\S]*\.agency-layout/);
    expect(css).toMatch(/@media \(max-width: 520px\) \{[\s\S]*\.look-editor \.action-group[\s\S]*flex-direction:\s*column/);
    expect(css).toMatch(/@media \(max-width: 520px\) \{[\s\S]*\.onboarding-panel \.action-group[\s\S]*flex-direction:\s*column/);
    expect(css).toMatch(/@media \(max-width: 520px\) \{[\s\S]*\.client-tile \.action-group/);
    expect(css).toMatch(/@media \(max-width: 520px\) \{[\s\S]*\.look-colours \{[\s\S]*grid-template-columns:\s*1fr/);
  });
});
