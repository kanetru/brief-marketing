import { createServer } from "vite";

const live = process.argv.includes("--live");
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const fixtures = await server.ssrLoadModule("/src/fixtures/discoveryFixtures.ts");
  const analyze = live ? await server.ssrLoadModule("/server/analyze.ts") : null;
  const reports = [];

  for (const fixture of fixtures.discoveryFixtures) {
    if (!live) {
      reports.push(fixtures.buildFixtureReport(fixture, "mock"));
      continue;
    }
    const evidence = (await server.ssrLoadModule("/src/domain/evidence.ts")).buildDiscoveryEvidence(fixture.session);
    const result = await analyze.analyzeDiscovery(evidence);
    if (!result.ok) {
      console.error(`\n# ${fixture.name}\nlive analysis failed: ${result.error}\n`);
      continue;
    }
    reports.push(fixtures.reportFromModelJson(fixture, result.rawModelResponse, "live"));
  }

  console.log(reports.map((report) => fixtures.formatFixtureReport(report)).join("\n\n---\n\n"));
  if (live && reports.length !== fixtures.discoveryFixtures.length) process.exitCode = 1;
} finally {
  await server.close();
}
