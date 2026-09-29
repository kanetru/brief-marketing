import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const fixtures = await server.ssrLoadModule("/src/fixtures/brandFixtures.ts");
  const reports = fixtures.brandFixtureReports();
  console.log(reports.map((report) => fixtures.formatBrandReport(report)).join("\n\n---\n\n"));
  const organic = reports.find((report) => report.id === "organic-raw-warm");
  const geometric = reports.find((report) => report.id === "geometric-polished");
  const human = reports.find((report) => report.id === "voice-human");
  const formal = reports.find((report) => report.id === "voice-formal");
  if (fixtures.territorySignature(organic.intelligence) === fixtures.territorySignature(geometric.intelligence)) {
    console.error("\nCounterfactual failed: visual choices did not change the territories.\n");
    process.exitCode = 1;
  }
  if (fixtures.voiceSignature(human.intelligence) === fixtures.voiceSignature(formal.intelligence)) {
    console.error("\nCounterfactual failed: voice choices did not change the verbal territory.\n");
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
