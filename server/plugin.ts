import type { Connect, Plugin } from "vite";
import type { DiscoveryEvidence } from "../src/domain/evidence";
import { analyzeDiscovery } from "./analyze";

export function discoveryApiPlugin(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (url !== "/api/discovery/analyze") {
      next();
      return;
    }
    if (req.method !== "POST") {
      send(res, 405, { ok: false, error: "unavailable" });
      return;
    }
    void readBody(req)
      .then(async (raw) => {
        const body = JSON.parse(raw) as { evidence?: DiscoveryEvidence };
        if (!body?.evidence) {
          send(res, 400, { ok: false, error: "invalid_response" });
          return;
        }
        const result = await analyzeDiscovery(body.evidence);
        send(res, result.ok ? 200 : result.error === "not_configured" ? 503 : 502, result);
      })
      .catch((error: unknown) => {
        console.error("Discovery analysis endpoint failed", error instanceof Error ? error.message : "request");
        send(res, 502, { ok: false, error: "unavailable" });
      });
  };

  return {
    name: "discovery-api",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: Connect.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
