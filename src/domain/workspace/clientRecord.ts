import { textValue } from "../../state/textEvidence";
import type { BriefProject, ClientOfferRecord, ClientSocial, ClientSocialPlatform } from "../../types/project";
import type { MarketingOutcome } from "../../types/discovery";

export interface RecordLink {
  label: string;
  value: string;
  href: string;
}

export interface ClientRecord {
  name: string;
  category: string;
  description: string;
  website: RecordLink | null;
  socials: RecordLink[];
  offers: ClientOfferRecord[];
  audience: string;
  goal: string;
  contact: string;
}

const OUTCOME: Record<MarketingOutcome, string> = {
  generate_enquiries: "Generate enquiries",
  increase_sales: "Increase direct sales",
  build_awareness: "Build awareness",
  build_trust: "Build trust",
  educate_people: "Educate people",
  build_a_community: "Build a community",
  launch_something: "Launch something",
  reach_a_new_audience: "Reach a new audience",
  show_our_work: "Show the work",
  stay_visible: "Stay visible",
  something_else: "Something else",
};

const PLATFORM: Record<ClientSocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  facebook: "Facebook",
};

export function websiteLink(raw: string): RecordLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(href).host.replace(/^www\./, "");
    if (!host) return null;
    return { label: "Website", value: host, href };
  } catch {
    return null;
  }
}

export function socialLink(social: ClientSocial): RecordLink | null {
  const handle = social.handle.trim().replace(/^@/, "");
  if (!handle) return null;
  const href = social.platform === "instagram"
    ? `https://instagram.com/${handle}`
    : social.platform === "tiktok"
      ? `https://www.tiktok.com/@${handle}`
      : social.platform === "linkedin"
        ? `https://www.linkedin.com/in/${handle}`
        : social.platform === "youtube"
          ? `https://www.youtube.com/@${handle}`
          : `https://facebook.com/${handle}`;
  return { label: PLATFORM[social.platform], value: `@${handle}`, href };
}

function discoveryOffers(project: BriefProject): ClientOfferRecord[] {
  return (project.discovery?.strategyInputs?.offers ?? [])
    .filter((offer) => offer.name?.trim())
    .map((offer) => ({
      name: offer.name.trim(),
      description: offer.description?.trim() ?? "",
      priceLabel: offer.priceLabel?.trim() ?? "",
    }));
}

function goalLine(project: BriefProject): string {
  const written = textValue(project.discovery?.goals?.twelveMonthSuccess);
  if (written.trim()) return written.trim();
  const selected = project.discovery?.goals?.outcomes?.state === "selected"
    ? project.discovery.goals.outcomes.selected
    : [];
  return selected.map((item) => OUTCOME[item]).filter(Boolean).join(", ");
}

/** What the manager should see about this client. Profile text wins when it has been written. */
export function clientRecord(project: BriefProject): ClientRecord {
  const profile = project.profile;
  const description = profile?.description?.trim() || textValue(project.discovery?.business?.description).trim();
  const audience = profile?.audience?.trim() || textValue(project.discovery?.audience?.bestCustomers).trim();
  const goal = profile?.goal?.trim() || goalLine(project);
  const storedOffers = (profile?.offers ?? []).filter((offer) => offer.name.trim());
  return {
    name: project.businessName.trim() || project.clientName.trim() || "Untitled",
    category: project.category.trim(),
    description,
    website: websiteLink(project.website),
    socials: (project.socials ?? []).map(socialLink).filter((item): item is RecordLink => item !== null),
    offers: storedOffers.length > 0 ? storedOffers : discoveryOffers(project),
    audience,
    goal,
    contact: project.clientName.trim(),
  };
}
