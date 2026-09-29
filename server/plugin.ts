import type { Connect, Plugin } from "vite";
import type { DiscoveryEvidence } from "../src/domain/evidence";
import type { ProfileGenerationRequest, ProfileRefinementRequest } from "../src/domain/profileRequest";
import { analyzeDiscovery } from "./analyze";
import { generateDiscoveryProfile, refineDiscoveryProfile } from "./profile";
import { generateCreativeReading, type StrategistRequest } from "./strategist";
import { resolveTerritoryImages, type TerritoryImageRequest } from "./territoryImages";

export function discoveryApiPlugin(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (
      url !== "/api/discovery/analyze" &&
      url !== "/api/discovery/profile" &&
      url !== "/api/discovery/profile/refine" &&
      url !== "/api/discovery/strategist" &&
      url !== "/api/territory-images"
    ) {
      next();
      return;
    }
    if (req.method !== "POST") {
      send(res, 405, { ok: false, error: "unavailable" });
      return;
    }
    void readBody(req)
      .then(async (raw) => {
        const body: unknown = JSON.parse(raw);
        if (url === "/api/territory-images") {
          send(res, 200, await resolveTerritoryImages(body as TerritoryImageRequest));
          return;
        }
        if (url === "/api/discovery/strategist") {
          send(res, 200, await generateCreativeReading(body as StrategistRequest));
          return;
        }
        if (url === "/api/discovery/analyze") {
          const evidence = (body as { evidence?: DiscoveryEvidence }).evidence;
          if (!evidence) {
            send(res, 400, { ok: false, error: "invalid_response" });
            return;
          }
          const result = await analyzeDiscovery(evidence);
          send(res, result.ok ? 200 : result.error === "not_configured" ? 503 : 502, result);
          return;
        }
        const request = body as ProfileGenerationRequest;
        if (!request?.evidence) {
          send(res, 400, { ok: false, error: "invalid_response" });
          return;
        }
        const result =
          url === "/api/discovery/profile/refine"
            ? await refineDiscoveryProfile(body as ProfileRefinementRequest)
            : await generateDiscoveryProfile(request);
        send(res, 200, result);
      })
      .catch((error: unknown) => {
        console.error("Discovery endpoint failed", error instanceof Error ? error.message : "request");
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
