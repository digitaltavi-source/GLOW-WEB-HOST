import express from "express";
import { hostHeaderValidation } from "@modelcontextprotocol/express";
import { loadRuntimeIdentity } from "./runtime-identity.js";

export const DEFAULT_MCP_JSON_LIMIT = "512kb";

export const PUBLIC_HTML_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://chatgpt.com; frame-ancestors 'self'";

export interface GlowMcpExpressOptions {
  readonly deferredJsonPaths?: readonly string[];
}

export function createGlowMcpExpressApp(
  allowedHosts: string[] | undefined,
  jsonLimit = process.env.GLOW_MCP_JSON_LIMIT?.trim() || DEFAULT_MCP_JSON_LIMIT,
  options?: GlowMcpExpressOptions
) {
  const app = express();
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    if (!res.hasHeader("X-Content-Type-Options")) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
    if (!res.hasHeader("Referrer-Policy")) {
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    }
    if (!res.hasHeader("Permissions-Policy")) {
      res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    }
    if (!res.hasHeader("X-Frame-Options")) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
    }
    next();
  });

  if (allowedHosts && allowedHosts.length > 0) {
    app.use(hostHeaderValidation(allowedHosts));
  }

  const defaultJsonParser = express.json(jsonLimit ? { limit: jsonLimit } : undefined);
  const deferredSet = new Set(options?.deferredJsonPaths ?? []);
  if (deferredSet.size > 0) {
    app.use((req, res, next) => {
      const normalizedPath = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
      if (deferredSet.has(req.path) || deferredSet.has(normalizedPath)) {
        next();
        return;
      }
      defaultJsonParser(req, res, next);
    });
  } else {
    app.use(defaultJsonParser);
  }

  app.get("/system/identity", (_req, res) => {
    res.json(loadRuntimeIdentity());
  });

  return app;
}
