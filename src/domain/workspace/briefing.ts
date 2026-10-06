import type { BriefProject } from "../../types/project";
import { clientRecord } from "./clientRecord";
import { marketFacts, trackingNote } from "./plainAnalytics";
import { positioningRead } from "./positioning";

export interface BriefIdea {
  title: string;
  body: string;
}

export interface BriefTurn {
  role: "manager" | "brief";
  text: string;
}

export interface BriefReply {
  text: string;
  basis: string;
  ideas: BriefIdea[];
}

/**
 * A grounded reply from the client record, competitor posts, and positioning.
 * File names can be mentioned. Their contents are not read here.
 */
export function briefReply(project: BriefProject, history: readonly BriefTurn[], question: string): BriefReply {
  const asked = question.trim();
  const lower = asked.toLowerCase();
  const record = clientRecord(project);
  const facts = marketFacts(project);
  const position = positioningRead(project);
  const basis = facts.posts > 0
    ? `Based on ${countLabel(facts.competitors, "competitor", "competitors")} · ${countLabel(facts.posts, "recent post", "recent posts")}`
    : "Based on onboarding";
  const previous = [...history].reverse().find((turn) => turn.role === "brief")?.text ?? "";

  if (/contract|uploaded file|the files|brand guidelines/.test(lower)) {
    const names = (project.library ?? []).map((file) => file.name).filter(Boolean);
    return {
      text: names.length > 0
        ? `These files are on the client: ${names.join(", ")}. Brief has not read what is inside them yet.`
        : "There are no files on this client yet.",
      basis: "Based on files saved for this client",
      ideas: [],
    };
  }

  if (/grow(?:ing)? fastest|follower/.test(lower) && !hasFollowerHistory(project)) {
    const started = firstSnapshot(project);
    return {
      text: `I don't have enough follower history yet to tell you reliably.${started ? ` Tracking started on ${started}.` : ""}`,
      basis,
      ideas: [],
    };
  }

  if (/content ideas|reel ideas|three ideas|five ideas/.test(lower)) {
    const subject = previous || position[0]?.body || record.description || record.name;
    const ideas = ideaSet(record.name, subject);
    return {
      text: ideas.map((idea, index) => `${index + 1}. ${idea.title} — ${idea.body}`).join("\n"),
      basis,
      ideas,
    };
  }

  if (/^why\??$/.test(lower) && previous) {
    return { text: previous, basis, ideas: [] };
  }

  if (/position|differentiat|strongest opportunity|where (?:do|does|are) we/.test(lower)) {
    const text = position.length > 0
      ? position.map((card) => `${card.title}. ${card.body}`).join("\n\n")
      : `${record.name} ${record.description || "does not have a positioning note yet."}`.trim();
    return { text, basis, ideas: [] };
  }

  if (/strongest competitor|who is their strongest|competitors doing/.test(lower)) {
    const names = competitorNames(project);
    return {
      text: names.length > 0
        ? `Brief is tracking ${names.join(", ")}. ${facts.facts.join(". ")}`
        : "Brief has not collected a competitive set yet.",
      basis,
      ideas: [],
    };
  }

  const lines = [
    sentence(record.description ? `${record.name} — ${record.description}` : record.name),
    record.audience ? sentence(`They sell to ${record.audience.replace(/\.$/, "")}`) : "",
    record.goal ? sentence(`Aim: ${record.goal.replace(/\.$/, "")}`) : "",
    record.offers.length > 0 ? sentence(`On offer: ${record.offers.map((offer) => [offer.name, offer.priceLabel].filter(Boolean).join(", ")).join("; ")}`) : "",
    facts.facts.length > 0 ? sentence(facts.facts.join(". ")) : "",
    position[0] ? sentence(position[0].body) : "",
  ].filter(Boolean);
  return {
    text: lines.join(" ") || "Brief doesn't have enough on this client yet.",
    basis,
    ideas: [],
  };
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function sentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function ideaSet(name: string, subject: string): BriefIdea[] {
  const focus = subject.replace(/\s+/g, " ").trim().slice(0, 140);
  return [
    { title: "Show the difference", body: `One short piece for ${name} about this: ${focus}` },
    { title: "A proof, not a claim", body: "Use one real job, price, or decision the client already has." },
    { title: "What the others skip", body: "Make the thing competitors are not posting, if the research shows a gap." },
  ];
}

function competitorNames(project: BriefProject): string[] {
  const names = new Set<string>();
  for (const candidate of project.marketDiscovery?.candidates ?? []) {
    const name = candidate.displayName || candidate.handle;
    if (name) names.add(name);
  }
  for (const competitor of project.watch?.competitors ?? []) names.add(competitor.name);
  for (const competitor of project.competitors ?? []) if (competitor.name) names.add(competitor.name);
  return [...names].filter(Boolean).slice(0, 8);
}

function hasFollowerHistory(project: BriefProject): boolean {
  return (project.watch?.competitors ?? []).some((competitor) => {
    const series = (competitor.snapshots ?? [])
      .map((snapshot) => Number(String(snapshot.metrics.followers ?? "").replace(/[^0-9.]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    return series.length >= 2;
  });
}

function firstSnapshot(project: BriefProject): string {
  const dates = (project.watch?.competitors ?? []).flatMap((competitor) => competitor.snapshots ?? []).map((snapshot) => snapshot.at).filter(Boolean).sort();
  const match = dates[0] ? /Tracking started ([^.]+)/.exec(trackingNote(dates[0])) : null;
  return match?.[1] ?? "";
}
