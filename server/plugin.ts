import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import type { DiscoveryEvidence } from "../src/domain/evidence";
import type { ProfileGenerationRequest, ProfileRefinementRequest } from "../src/domain/profileRequest";
import { analyzeDiscovery } from "./analyze";
import { generateDiscoveryProfile, refineDiscoveryProfile } from "./profile";
import { generateCreativeReading, type StrategistRequest } from "./strategist";
import { generateClientReading, type ClientStrategistRequest } from "./clientStrategist";
import { resolveTerritoryImages, type TerritoryImageRequest } from "./territoryImages";
import { researchPage, researchSiteUrl } from "./research";
import { applyServerEnv, providerStatusLines } from "./env";
import { readEnsembleToken } from "./ensembleData";
import { runMarketDiscovery } from "./marketRun";
import type { EnsembleCache } from "./ensembleClient";
import type { CompetitorDiscoveryContext, SocialDiscoveryQuery } from "../src/types/marketDiscovery";

const ensembleCache: EnsembleCache = new Map();

export function discoveryApiPlugin(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (
      url !== "/api/discovery/analyze" &&
      url !== "/api/discovery/profile" &&
      url !== "/api/discovery/profile/refine" &&
      url !== "/api/discovery/strategist" &&
      url !== "/api/client-strategist" &&
      url !== "/api/territory-images" &&
      url !== "/api/research/page" &&
      url !== "/api/research/site" &&
      url !== "/api/market/discover"
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
        if (url === "/api/research/page") {
          const target = (body as { url?: string }).url ?? "";
          send(res, 200, await researchPage(target));
          return;
        }
        if (url === "/api/research/site") {
          const target = body as { url?: string; businessName?: string };
          send(res, 200, await researchSiteUrl(target.url ?? "", target.businessName ?? ""));
          return;
        }
        if (url === "/api/market/discover") {
          const request = body as {
            context?: CompetitorDiscoveryContext;
            queries?: SocialDiscoveryQuery[];
            executeQueryIds?: string[];
            refresh?: boolean;
          };
          const context = request.context;
          if (!context || typeof context.clientId !== "string" || !context.clientId.trim()) {
            send(res, 400, { ok: false, failure: "unavailable", message: "Discovery unavailable" });
            return;
          }
          const result = await runMarketDiscovery({
            context,
            queries: Array.isArray(request.queries) ? request.queries : undefined,
            executeQueryIds: Array.isArray(request.executeQueryIds) ? request.executeQueryIds.filter((id) => typeof id === "string") : undefined,
            refresh: request.refresh === true,
            now: new Date().toISOString(),
          }, {
            fetchImpl: fetch,
            cache: ensembleCache,
            token: readEnsembleToken(),
            openaiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
          });
          send(res, 200, result);
          return;
        }
        if (url === "/api/territory-images") {
          send(res, 200, await resolveTerritoryImages(body as TerritoryImageRequest));
          return;
        }
        if (url === "/api/discovery/strategist") {
          send(res, 200, await generateCreativeReading(body as StrategistRequest));
          return;
        }
        if (url === "/api/client-strategist") {
          send(res, 200, await generateClientReading(body as ClientStrategistRequest));
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
      prepare(server, true);
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      prepare(server, false);
      server.middlewares.use(handle);
    },
  };
}

function prepare(server: ViteDevServer | PreviewServer, report: boolean) {
  // Tests set their own fake env. Never load .env.local into a test process.
  if (process.env.VITEST) return;
  applyServerEnv(server.config.mode, server.config.envDir);
  if (!report || server.config.mode !== "development") return;
  for (const line of providerStatusLines()) console.info(line);
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
