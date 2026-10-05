import { describe, expect, it } from "vitest";
import { actFor } from "./acts";
import { experienceMood } from "./mood";
import { motion, prefersReducedMotion } from "./motion";
import { completionMessage, clientCanSeeIntelligence } from "../domain/project/clientAccess";

describe("lover lover experience", () => {
  it("keeps act changes short and finite", () => {
    expect(actFor("welcome")).toBeNull();
    expect(actFor("audience")?.title).toMatch(/what you do/i);
    expect(actFor("colour")?.kicker).toBe("The world");
    expect(actFor("complete")).toBeNull();
  });

  it("shifts the room only when a leaning is clear", () => {
    expect(experienceMood(["calm", "natural"])).toBe("quiet");
    expect(experienceMood(["bold", "playful"])).toBe("expressive");
    expect(experienceMood([])).toBe("steady");
  });

  it("centralises motion timing and does not require animation to exist", () => {
    expect(motion.duration).toBeGreaterThan(motion.durationFast);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("still ends discovery without handing the client the intelligence", () => {
    const message = completionMessage("Jane Smith");
    expect(message.title).toMatch(/you're done/i);
    expect(message.body).toContain("Jane Smith");
    expect(`${message.title} ${message.body} ${message.next}`).not.toMatch(/opportunit|competitor|agent pack|territor/i);
    expect(clientCanSeeIntelligence("strategy")).toBe(false);
  });
});
