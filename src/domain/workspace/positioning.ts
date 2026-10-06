import { textValue } from "../../state/textEvidence";
import type { BriefProject } from "../../types/project";
import { clientRecord } from "./clientRecord";
import { marketFacts } from "./plainAnalytics";

export interface PositioningCard {
  title: string;
  body: string;
}

/** Where the client sits, using only what Brief has actually collected. */
export function positioningRead(project: BriefProject): PositioningCard[] {
  const record = clientRecord(project);
  const facts = marketFacts(project);
  const difference = textValue(project.discovery?.business?.differentiation).trim();
  const cards: PositioningCard[] = [];
  const owns = difference || record.description;
  if (owns) cards.push({ title: "What this client appears to own", body: owns });
  if (facts.topics.length > 0) {
    cards.push({ title: "What competitors are saying", body: facts.topics.join(" · ") });
  }
  if (owns && facts.topics.length > 0) {
    const crowded = facts.topics.filter((topic) => owns.toLowerCase().includes(topic.toLowerCase()));
    if (crowded.length > 0) {
      cards.push({ title: "Where everyone is saying the same thing", body: crowded.join(" · ") });
    }
    cards.push({
      title: "Where this client is different",
      body: difference
        ? `${record.name} describes the difference as: ${difference}`
        : `${record.name} describes the business as: ${record.description}`,
    });
  }
  if (record.offers.length > 0 && facts.posts > 0) {
    cards.push({
      title: "What they can credibly talk about",
      body: record.offers.map((offer) => offer.name).join(" · "),
    });
  }
  return cards;
}
