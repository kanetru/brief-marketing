import { assembleSite, pagesFromHtml, storedFromSite } from "./research/extractSite";
import type { ResearchPageRole, StoredResearch } from "../../types/project";

const DEMO_LIMIT = "This demo stored the page HTML. Brief did not fetch the address live.";

/**
 * North Workshop and four competitors, extracted from fixture HTML.
 * Oak Room is left unread on purpose.
 */
export function demoSiteResearch(now: string): { website: StoredResearch; competitors: Array<{ id: string; research: StoredResearch }> } {
  const website = fromPages("https://northworkshop.example", "North Workshop", now, [
    page("https://northworkshop.example", "home", "Homepage", "North Workshop", "Furniture, made to last for generations.", [
      "Each piece is crafted for the room. Every table is crafted to order.",
      "We make furniture for homeowners who want one quieter room.",
    ]),
    page("https://northworkshop.example/about", "about", "About", "About", "A workshop for the home", [
      "Homeowners come to us when a room needs one serious piece.",
    ]),
    page("https://northworkshop.example/furniture", "products", "Products", "Furniture", "Tables, benches, and chairs", [
      "The collection is tables, benches, and chairs.",
    ], ["Tables", "Benches", "Chairs"]),
    page("https://northworkshop.example/journal", "journal", "Journal", "Journal", "Notes from the bench", [
      "Short notes on rooms we have furnished.",
    ]),
  ]);

  const kiln = fromPages("https://kiln.example", "Kiln & Co", now, [
    page("https://kiln.example", "home", "Homepage", "Kiln & Co", "Handcrafted furniture for the finished interior.", [
      "Homeowners choose us for craftsmanship and a finished room.",
    ]),
    page("https://kiln.example/about", "about", "About", "About", "Our story", [
      "We have furnished houses since the work left the bench.",
    ]),
  ]);
  const late = fromPages("https://late.example", "Late Timber", now, [
    page("https://late.example", "home", "Homepage", "Late Timber", "Artisan craftsmanship for styled rooms.", [
      "The offer is artisan furniture and a finished interior.",
    ]),
    page("https://late.example/work", "work", "Work", "Work", "Finished rooms", [
      "Projects are photographed once the room is complete.",
    ]),
  ]);
  const sons = fromPages("https://northandsons.example", "North & Sons", now, [
    page("https://northandsons.example", "home", "Homepage", "North & Sons", "Bespoke craftsmanship for the home.", [
      "Homeowners commission one piece at a time.",
    ]),
    page("https://northandsons.example/process", "process", "Process", "Process", "How the joint is cut", [
      "The joint is cut by hand, then the piece is finished for the room.",
    ]),
  ]);
  const field = fromPages("https://field.example", "Field & Grain", now, [
    page("https://field.example", "home", "Homepage", "Field & Grain", "Ready in six weeks.", [
      "Tables and chairs, from 2400, for people furnishing a first home.",
    ]),
    page("https://field.example/pricing", "pricing", "Pricing", "Pricing", "Pricing", [
      "A dining table starts from 2400.",
    ]),
  ]);

  return {
    website,
    competitors: [
      { id: "c-kiln", research: kiln },
      { id: "c-late", research: late },
      { id: "c-sons", research: sons },
      { id: "c-field", research: field },
    ],
  };
}

function fromPages(
  siteUrl: string,
  businessName: string,
  now: string,
  entries: Array<{ url: string; html: string; role: ResearchPageRole; label: string }>,
): StoredResearch {
  const pages = pagesFromHtml(entries, now);
  const site = assembleSite(siteUrl, businessName, now, pages);
  return storedFromSite({
    ...site,
    researchLimitations: [...site.researchLimitations, DEMO_LIMIT],
  });
}

function page(
  url: string,
  role: ResearchPageRole,
  label: string,
  title: string,
  headline: string,
  paragraphs: string[],
  headings: string[] = [],
): { url: string; html: string; role: ResearchPageRole; label: string } {
  const body = [
    `<h1>${headline}</h1>`,
    ...headings.map((item) => `<h2>${item}</h2>`),
    ...paragraphs.map((item) => `<p>${item}</p>`),
  ].join("");
  const html = `<html><head><title>${title}</title><meta name="description" content="${headline}"></head><body>${body}</body></html>`;
  return { url, html, role, label };
}
