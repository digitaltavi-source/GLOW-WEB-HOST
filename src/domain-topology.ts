export type DeploymentTopologyMode = "STANDALONE_DOMAIN" | "SHARED_ECOSYSTEM_GATEWAY";

export type HostRouteSet = {
  rootPath: string;
  appPath: string;
  workspacePath: string;
  profileApiPath: string;
  healthPath: string;
  readinessPath: string;
  mcpPath: string;
};

export type HostDomainTopology = {
  topologyMode: DeploymentTopologyMode;
  publicOrigin: string;
  basePath: string;
  standaloneRoutes: HostRouteSet;
  mountedRoutes: HostRouteSet;
  mcpResourceUrl: string;
  protectedResourceMetadataPath: string;
  oauthCallbackUrl: string;
  previewOrigin: string | null;
};

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function parseStrictOrigin(raw: string, errorCode: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(errorCode);
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopbackHost(parsed.hostname))) {
    throw new Error(`${errorCode}_HTTPS_REQUIRED`);
  }
  if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`${errorCode}_ORIGIN_ONLY_REQUIRED`);
  }
  return parsed;
}

function normalizeBasePath(raw: string | undefined, topologyMode: DeploymentTopologyMode): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") {
    if (topologyMode === "SHARED_ECOSYSTEM_GATEWAY") {
      throw new Error("CONFIG_SHARED_GATEWAY_BASE_PATH_REQUIRED");
    }
    return "";
  }
  if (!/^\/[a-z0-9][a-z0-9_-]{0,62}$/.test(trimmed)) {
    throw new Error("CONFIG_BASE_PATH_INVALID");
  }
  return trimmed;
}

function buildRoutes(prefix: string): HostRouteSet {
  return {
    rootPath: prefix || "/",
    appPath: `${prefix}/app`,
    workspacePath: `${prefix}/workspace`,
    profileApiPath: `${prefix}/api/public/profile`,
    healthPath: `${prefix}/healthz`,
    readinessPath: `${prefix}/readyz`,
    mcpPath: `${prefix}/mcp-v2`
  };
}

export function resolveHostDomainTopology(
  env: NodeJS.ProcessEnv = process.env,
  fallbackPort = 3000
): HostDomainTopology {
  const rawBasePath = env.GLOW_BASE_PATH?.trim();
  const explicitMode = env.GLOW_DEPLOYMENT_TOPOLOGY?.trim().toUpperCase();
  const topologyMode: DeploymentTopologyMode = explicitMode
    ? explicitMode === "STANDALONE_DOMAIN" || explicitMode === "SHARED_ECOSYSTEM_GATEWAY"
      ? explicitMode
      : (() => {
          throw new Error("CONFIG_DEPLOYMENT_TOPOLOGY_INVALID");
        })()
    : rawBasePath && rawBasePath !== "/"
      ? "SHARED_ECOSYSTEM_GATEWAY"
      : "STANDALONE_DOMAIN";

  const basePath = normalizeBasePath(rawBasePath, topologyMode);
  if (topologyMode === "STANDALONE_DOMAIN" && basePath !== "") {
    throw new Error("CONFIG_STANDALONE_BASE_PATH_FORBIDDEN");
  }

  const explicitMcpUrlRaw = env.GLOW_PUBLIC_MCP_URL?.trim();
  let explicitMcpUrl: URL | null = null;
  if (explicitMcpUrlRaw) {
    try {
      explicitMcpUrl = new URL(explicitMcpUrlRaw);
    } catch {
      throw new Error("CONFIG_PUBLIC_MCP_URL_INVALID");
    }
    if (
      explicitMcpUrl.protocol !== "https:" &&
      !(explicitMcpUrl.protocol === "http:" && isLoopbackHost(explicitMcpUrl.hostname))
    ) {
      throw new Error("CONFIG_PUBLIC_MCP_URL_HTTPS_REQUIRED");
    }
  }

  const rawPublicOrigin = env.GLOW_PUBLIC_ORIGIN?.trim();
  const publicOrigin = rawPublicOrigin
    ? parseStrictOrigin(rawPublicOrigin, "CONFIG_PUBLIC_ORIGIN").origin
    : explicitMcpUrl
      ? explicitMcpUrl.origin
      : `http://127.0.0.1:${fallbackPort}`;

  const standaloneRoutes = buildRoutes("");
  const mountedRoutes = buildRoutes(basePath);

  const mcpResourceUrl = explicitMcpUrl
    ? (() => {
        if (rawPublicOrigin && explicitMcpUrl.origin !== publicOrigin) {
          throw new Error("CONFIG_MCP_RESOURCE_ORIGIN_MISMATCH");
        }
        return explicitMcpUrl.toString();
      })()
    : `${publicOrigin}${mountedRoutes.mcpPath}`;

  const mcpPathname = new URL(mcpResourceUrl).pathname;
  const protectedResourceMetadataPath = `/.well-known/oauth-protected-resource${mcpPathname}`;

  const rawCallbackUrl = env.GLOW_OAUTH_CALLBACK_URL?.trim();
  let oauthCallbackUrl: string;
  if (rawCallbackUrl) {
    let parsedCb: URL;
    try {
      parsedCb = new URL(rawCallbackUrl);
    } catch {
      throw new Error("CONFIG_OAUTH_CALLBACK_URL_INVALID");
    }
    if (parsedCb.protocol !== "https:" && !(parsedCb.protocol === "http:" && isLoopbackHost(parsedCb.hostname))) {
      throw new Error("CONFIG_OAUTH_CALLBACK_HTTPS_REQUIRED");
    }
    oauthCallbackUrl = parsedCb.toString();
  } else {
    oauthCallbackUrl = `${publicOrigin}/auth/google/callback`;
  }

  const rawPreviewOrigin = env.GLOW_PREVIEW_ORIGIN?.trim();
  let previewOrigin: string | null = null;
  if (rawPreviewOrigin) {
    const parsedPreview = parseStrictOrigin(rawPreviewOrigin, "CONFIG_PREVIEW_ORIGIN");
    if (parsedPreview.origin === publicOrigin) {
      throw new Error("PREVIEW_ORIGIN_MUST_ISOLATE_FROM_MAIN_ORIGIN");
    }
    previewOrigin = parsedPreview.origin;
  }

  return {
    topologyMode,
    publicOrigin,
    basePath,
    standaloneRoutes,
    mountedRoutes,
    mcpResourceUrl,
    protectedResourceMetadataPath,
    oauthCallbackUrl,
    previewOrigin
  };
}
