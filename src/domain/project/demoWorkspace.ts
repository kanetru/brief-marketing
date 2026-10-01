import { organicFixture } from "../../fixtures/brandFixtures";
import {
  createProject,
  inviteDiscovery,
  markDiscoveryOpened,
  submitDiscovery,
  withCompetitor,
  withLibraryAsset,
} from "../../state/projectStore";
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
    id: "c-oak",
    name: "Oak Room",
    website: "https://oak.example",
    notes: "",
  }, now);
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
    now,
  });
  late = inviteDiscovery(late, now);

  return [north, kiln, late];
}
