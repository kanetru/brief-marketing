import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const fixtures = await server.ssrLoadModule("/src/fixtures/profileFixtures.ts");
  const reports = fixtures.profileFixtureReports();
  console.log(reports.map((report) => fixtures.formatProfileReport(report)).join("\n\n---\n\n"));
} finally {
  await server.close();
}
