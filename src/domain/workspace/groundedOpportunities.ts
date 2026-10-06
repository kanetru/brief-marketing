import { textValue } from "../../state/textEvidence";
import type { BriefProject } from "../../types/project";
import { clientRecord } from "./clientRecord";
import type { OpportunityView } from "./managerView";
import { marketFacts } from "./plainAnalytics";

/**
 * Opportunities written from the client record and collected competitor posts.
 * Generic strategy cards stay available when this has nothing to stand on.
 */
export function groundedOpportunityViews(project: BriefProject): OpportunityView[] {
  const record = clientRecord(project);
  const facts = marketFacts(project);
  const difference = textValue(project.discovery?.business?.differentiation).trim();
  const owns = difference || record.description.trim();
  if (facts.posts === 0 || !owns) return [];

  const topic = facts.topics.slice(0, 3).join(", ");
  const count = Math.max(facts.competitors, 1);
  const people = `${count} ${count === 1 ? "competitor" : "competitors"}`;
  const phrase = shortOwn(difference);
  const evidence = [
    owns,
    topic ? `Competitor posts mention ${topic}.` : "",
    ...facts.interpretation.slice(0, 2),
  ].filter(Boolean);

  const items: OpportunityView[] = [{
    id: "ground-own",
    index: "01",
    title: phrase ? `Own ${phrase}` : `Own what ${record.name} already does`,
    why: topic
      ? `Brief is tracking ${people}. Their posts mention ${topic}. ${record.name} describes the difference as: ${owns}`
      : `Brief is tracking ${people}, from ${facts.posts} recent posts. ${record.name} describes the difference as: ${owns}`,
    move: "Make that difference the position, rather than another product feature.",
    could: "Campaign · Case-study series · Sales message · Reel series · Landing-page section",
    saved: false,
    basis: evidence,
  }];

  const offer = record.offers.find((item) => item.name.trim());
  if (offer) {
    const price = offer.priceLabel.trim();
    items.push({
      id: "ground-offer",
      index: "02",
      title: `Use ${offer.name} as the proof`,
      why: `${record.name} already sells ${offer.name}${offer.description.trim() ? `: ${offer.description.trim()}` : ""}.${price ? ` Price on record: ${price}.` : ""} That is something the collected posts do not have to invent.`,
      move: "Show the offer as evidence of the position.",
      could: "Landing-page section · Case study · Reel",
      saved: false,
      basis: [offer.description, price].map((line) => line.trim()).filter(Boolean),
    });
  }

  return items;
}

function shortOwn(difference: string): string {
  const cut = difference.split(/[,.—–]/)[0]?.trim() ?? "";
  if (cut.length < 8 || cut.length > 48) return "";
  if (/^(we|they|it|our|the)\b/i.test(cut)) return "";
  return cut.charAt(0).toLowerCase() + cut.slice(1);
}
