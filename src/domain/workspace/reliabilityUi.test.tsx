import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CompetitorBoard } from "../../screens/studio/ManagerBoards";
import { MoreNav } from "../../screens/studio/MoreNav";
import { menuKeyAction, menuLeft } from "./menuPlacement";

const view = {
  id: "a",
  name: "Harbour",
  badge: "DIRECT" as const,
  platforms: "Instagram",
  owns: "Aprons",
  themes: "",
  change: "",
  metrics: [],
  summary: "",
  why: "",
  positioning: "",
  posts: [],
  language: "",
  social: "",
  evidence: "",
};

describe("More menu alignment", () => {
  it("stays on the left edge unless that would leave the viewport", () => {
    expect(menuLeft(40, 200, 1200)).toBe(0);
    expect(menuLeft(1100, 200, 1200, 12)).toBeLessThan(0);
    const flipped = menuLeft(1100, 200, 1200, 12);
    expect(1100 + flipped).toBeGreaterThanOrEqual(12);
    expect(1100 + flipped + 200).toBeLessThanOrEqual(1200 - 12);
    expect(menuLeft(4, 400, 320, 12)).toBeGreaterThanOrEqual(12 - 4);
  });

  it("moves focus with the arrows and closes on Escape", () => {
    expect(menuKeyAction("ArrowDown", -1, 4)).toEqual({ type: "move", index: 0 });
    expect(menuKeyAction("ArrowDown", 3, 4)).toEqual({ type: "move", index: 0 });
    expect(menuKeyAction("ArrowUp", 0, 4)).toEqual({ type: "move", index: 3 });
    expect(menuKeyAction("Home", 2, 4)).toEqual({ type: "move", index: 0 });
    expect(menuKeyAction("End", 0, 4)).toEqual({ type: "move", index: 3 });
    expect(menuKeyAction("Escape", 1, 4)).toEqual({ type: "close" });
    expect(menuKeyAction("Tab", 1, 4)).toEqual({ type: "none" });
  });

  it("renders the menu from the More trigger", () => {
    const html = renderToStaticMarkup(<MoreNav panel="overview" open onToggle={() => undefined} onChoose={() => undefined} />);
    expect(html).toContain('role="menu"');
    expect(html).toContain("Client settings");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="true"');
    const css = readFileSync(new URL("../../styles/studio.css", import.meta.url), "utf8");
    expect(css).toContain(".more-anchor");
    expect(css).toMatch(/\.more-menu\s*\{[^}]*left:\s*0/s);
    expect(css).not.toContain("margin: -0.7rem 0 1.2rem auto");
    expect(css).toContain("overflow: visible");
    expect(css).toContain("focus-visible");
  });
});

describe("market research failure UI", () => {
  it("stays plain in production and expands technical details only for development", () => {
    const plain = renderToStaticMarkup(
      <CompetitorBoard views={[]} busy={false} failed onFind={() => undefined} onAdd={() => undefined} technical={[{ stage: "Instagram search", httpStatus: 401, message: "Authentication failed" }]} />,
    );
    expect(plain).toContain("Market research couldn&#x27;t finish.");
    expect(plain).toContain("Try again");
    expect(plain).not.toContain("Technical details");
    expect(plain).not.toContain("Authentication failed");
    const dev = renderToStaticMarkup(
      <CompetitorBoard
        views={[]}
        busy={false}
        failed
        devDetails
        technical={[{ stage: "Instagram search", httpStatus: 401, message: "Authentication failed" }]}
        onFind={() => undefined}
        onAdd={() => undefined}
      />,
    );
    expect(dev).toContain("Technical details");
    expect(dev).toContain("Instagram search");
    expect(dev).toContain("401");
    expect(dev).toContain("Authentication failed");
    expect(dev).not.toContain("sk-");
    expect(dev).not.toContain("token=");
    const partial = renderToStaticMarkup(
      <CompetitorBoard
        views={[view]}
        busy={false}
        failed={false}
        partial={{ discovered: 4, instagramFailed: false, tiktokFailed: true, classificationFailed: false }}
        onFind={() => undefined}
        onRetryTikTok={() => undefined}
        onAdd={() => undefined}
      />,
    );
    expect(partial).toContain("4 accounts found.");
    expect(partial).toContain("TikTok research couldn&#x27;t finish.");
    expect(partial).toContain("Retry TikTok");
    expect(partial).not.toContain("Market research couldn&#x27;t finish.");
    const analysis = renderToStaticMarkup(
      <CompetitorBoard
        views={[view]}
        busy={false}
        failed={false}
        partial={{ discovered: 2, instagramFailed: false, tiktokFailed: false, classificationFailed: true }}
        onFind={() => undefined}
        onRetryAnalysis={() => undefined}
        onAdd={() => undefined}
      />,
    );
    expect(analysis).toContain("Accounts found.");
    expect(analysis).toContain("Brief couldn&#x27;t analyse them yet.");
    expect(analysis).toContain("Retry analysis");
  });
});
