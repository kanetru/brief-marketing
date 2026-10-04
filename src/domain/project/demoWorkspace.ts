import { organicFixture } from "../../fixtures/brandFixtures";
import { attachDemoWatch } from "../intelligence/demo";
import { buildProjectIntelligence } from "./assemble";
import { demoSiteResearch } from "./demoResearch";
import { createSession } from "../../state/createSession";
import {
  createProject,
  inviteDiscovery,
  markDiscoveryOpened,
  submitDiscovery,
  withCompetitor,
  withCompetitorResearch,
  withLibraryAsset,
  withWebsiteResearch,
} from "../../state/projectStore";
import type { DiscoverySession } from "../../types/discovery";
import type { BriefProject } from "../../types/project";

export const SEED_KEY = "lover-lover.seeded.v1";

/** Jane's practice, seeded once so a returning manager sees a business rather than an empty app. */
export function seedDemoWorkspace(now = new Date().toISOString()): BriefProject[] {
  const finished = organicFixture();
  finished.progress = { ...finished.progress, section: "complete", furthest: "complete" };
  let north = createProject({
    clientName: "North Workshop",
    businessName: "North Workshop",
    website: "https://northworkshop.example",
    category: "Furniture",
    discovery: finished,
    now,
  });
  north = inviteDiscovery(north, now);
  north = markDiscoveryOpened(north, now);
  north = submitDiscovery(north, now);
  north = withCompetitor(north, {
    id: "c-kiln",
    name: "Kiln & Co",
    website: "https://kiln.example",
    notes: "They lead with craftsmanship and finished interiors.",
  }, now);
  north = withCompetitor(north, {
    id: "c-late",
    name: "Late Timber",
    website: "https://late.example",
    notes: "Craftsmanship in every finished interior.",
  }, now);
  north = withCompetitor(north, {
    id: "c-sons",
    name: "North & Sons",
    website: "https://northandsons.example",
    notes: "",
  }, now);
  north = withCompetitor(north, {
    id: "c-field",
    name: "Field & Grain",
    website: "https://field.example",
    notes: "",
  }, now);
  north = withCompetitor(north, {
    id: "c-oak",
    name: "Oak Room",
    website: "https://oak.example",
    notes: "",
  }, now);
  const demoResearch = demoSiteResearch(now);
  north = withWebsiteResearch(north, demoResearch.website, now);
  for (const item of demoResearch.competitors) {
    north = withCompetitorResearch(north, item.id, item.research, now);
  }
  north = withLibraryAsset(north, {
    id: "lib-joint",
    name: "workshop-joint-01.jpg",
    category: "photo_video",
    description: "Close photograph of a joint on the bench.",
    fileRef: "workshop-joint-01.jpg",
    tags: ["process", "workshop"],
    notes: "From the client's phone.",
    createdAt: now,
    updatedAt: now,
    approval: "accepted",
    relatedOpportunityId: null,
  }, now);

  const midway = organicFixture();
  midway.id = "kiln-discovery";
  midway.business.name = { state: "evidence", evidence: { raw: "Kiln & Co", capturedAt: now } };
  midway.business.description = { state: "evidence", evidence: { raw: "A small workshop making tableware for kitchens.", capturedAt: now } };
  midway.business.peopleComeFor = { state: "evidence", evidence: { raw: "People come for pieces that feel made, not manufactured.", capturedAt: now } };
  midway.audience.bestCustomers = { state: "evidence", evidence: { raw: "Cooks setting one careful table.", capturedAt: now } };
  midway.progress = { ...midway.progress, section: "voice", furthest: "voice" };
  let kiln = createProject({
    clientName: "Kiln & Co",
    businessName: "Kiln & Co",
    website: "",
    category: "Ceramics",
    discovery: midway,
    now,
  });
  kiln = inviteDiscovery(kiln, now);
  kiln = markDiscoveryOpened(kiln, now);
  kiln = { ...kiln, discoveryStatus: "in_progress" };

  let late = createProject({
    clientName: "Late Service",
    businessName: "Late Service",
    website: "",
    category: "Restaurant",
    discovery: textSession("late-service", "Late Service", "A neighbourhood restaurant with a short menu and a long bar.", "People come for a weeknight they don't have to plan.", "People who live nearby and come back when the room feels easy.", "Fuller midweek seatings without discounting the room.", now),
    now,
  });
  late = inviteDiscovery(late, now);
  late = markDiscoveryOpened(late, now);
  late = submitDiscovery(late, now);

  let field = createProject({
    clientName: "Field Office",
    businessName: "Field Office",
    website: "",
    category: "Architecture",
    discovery: textSession("field-office", "Field Office", "An architecture practice working on civic and institutional buildings.", "Clients come for a principal who will say what should not be built.", "Public clients and the specifiers who advise them.", "Be the practice a specifier can defend, without publishing faster than the work.", now),
    now,
  });
  field = inviteDiscovery(field, now);
  field = markDiscoveryOpened(field, now);
  field = submitDiscovery(field, now);

  return [north, kiln, late, field].map((project) => {
    const kind = project.businessName === "North Workshop"
      ? "north"
      : project.businessName === "Late Service"
        ? "late"
        : project.businessName === "Field Office"
          ? "field"
          : "kiln";
    return attachDemoWatch(kind, project, buildProjectIntelligence(project, now), now);
  });
}

function textSession(
  id: string,
  name: string,
  description: string,
  comeFor: string,
  customers: string,
  success: string,
  now: string,
): DiscoverySession {
  const session = createSession(now);
  session.id = id;
  const said = (raw: string) => ({ state: "evidence" as const, evidence: { raw, capturedAt: now } });
  session.business.name = said(name);
  session.business.description = said(description);
  session.business.peopleComeFor = said(comeFor);
  session.audience.bestCustomers = said(customers);
  session.goals.twelveMonthSuccess = said(success);
  session.goals.outcomes = { state: "selected", selected: ["generate_enquiries"], capturedAt: now };
  session.progress = { ...session.progress, section: "complete", furthest: "complete" };
  return session;
}
