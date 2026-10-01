import { textsContainFiller } from "../languageGuard";
import type { CategorySynthesis, Opportunity, UnderstandingField } from "../../types/project";

const BANNED = ["modern yet timeless", "bold yet approachable", "premium experience", "meaningful connection", "stand out", "purpose-driven", "your brand is"];

export function buildOpportunities(fields: UnderstandingField[], category: CategorySynthesis | null, businessName: string): Opportunity[] {
  const idea = textOf(fields, "brand.central_idea");
  const offer = textOf(fields, "company.offer");
  const audience = textOf(fields, "audience.primary");
  const avoid = textOf(fields, "brand.avoid");
  const voice = textOf(fields, "brand.voice");
  const name = businessName || "the client";
  const drafted: Opportunity[] = [
    {
      id: "opp-position",
      title: `Say what ${name} actually does before the category does`,
      type: "positioning",
      why: idea || `${name} has a hypothesis worth testing against the category costume.`,
      evidenceIds: ids(fields, "brand.central_idea", "company.what_they_do"),
      confidence: idea ? "medium" : "low",
      action: "Write the first line of the site as the work itself, then the person it is for.",
      effort: "low",
      impactHypothesis: "A specific first line gives every later asset a sentence to obey.",
    },
    {
      id: "opp-proof",
      title: "Capture one piece of proof from the work, not a slogan",
      type: "proof",
      why: offer ? `The offer on record is: ${offer} The brief does not yet hold a concrete proof of that.` : "The offer is still thin, so proof would be a guess.",
      evidenceIds: ids(fields, "company.offer"),
      confidence: offer ? "medium" : "low",
      action: "Photograph or write one real job, with the material and the person named.",
      effort: "medium",
      impactHypothesis: "One specific proof is more useful than a page of claims.",
    },
    {
      id: "opp-voice",
      title: "Turn the voice idea into three lines the manager can reuse",
      type: "content",
      why: voice || "Voice is not settled.",
      evidenceIds: ids(fields, "brand.voice"),
      confidence: voice ? "medium" : "low",
      action: "Draft a homepage line, a caption, and a reply to an enquiry in that voice. Keep them short.",
      effort: "low",
      impactHypothesis: "Reusable lines stop each new post from inventing a new personality.",
    },
    {
      id: "opp-audience",
      title: audience ? "Make the next piece for the person who already pays" : "Name who actually pays",
      type: "channel",
      why: audience || "Without a paying audience, channel advice would be generic.",
      evidenceIds: ids(fields, "audience.primary"),
      confidence: audience ? "medium" : "low",
      action: audience ? "Put that person in the first three sentences of the next page or post." : "Ask which audience pays before planning a channel.",
      effort: "low",
      impactHypothesis: "Talking to the payer keeps the work from splitting across two crowds.",
    },
    {
      id: "opp-avoid",
      title: "Keep one cliché out of the next asset",
      type: "visual",
      why: avoid ? `The direction fails if it becomes ${avoid}` : "No cliché has been named yet.",
      evidenceIds: ids(fields, "brand.avoid"),
      confidence: avoid ? "medium" : "low",
      action: "Before publishing, check the picture and the first line against that failure.",
      effort: "low",
      impactHypothesis: "A named failure is easier to avoid than a mood.",
    },
  ];
  if (category) {
    drafted.push({
      id: "opp-category",
      title: "Use the competitor notes as a contrast, not as a script",
      type: "gap",
      why: category.observation,
      evidenceIds: category.evidenceIds,
      confidence: "low",
      action: "List what the notes repeat, then write the client's version only where the evidence differs.",
      effort: "medium",
      impactHypothesis: "The gap is only real where the client's own words disagree with those notes.",
    });
  }
  return drafted.filter(acceptOpportunity);
}

export function acceptOpportunity(item: Opportunity): boolean {
  const blob = `${item.title} ${item.why} ${item.action} ${item.impactHypothesis}`.toLowerCase();
  if (textsContainFiller([blob])) return false;
  if (BANNED.some((phrase) => blob.includes(phrase))) return false;
  return item.title.trim().length > 0 && item.why.trim().length > 0 && item.action.trim().length > 0;
}

function textOf(fields: UnderstandingField[], id: string): string {
  return fields.find((field) => field.id === id)?.text ?? "";
}

function ids(fields: UnderstandingField[], ...fieldIds: string[]): string[] {
  return fieldIds.flatMap((id) => fields.find((field) => field.id === id)?.evidenceIds ?? []);
}
