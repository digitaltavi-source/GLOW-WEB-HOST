import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProtectedStateDir } from "./state-dir.js";

type StaticIdentity = Record<string, unknown>;

function cleanValue(value: string | undefined, fallback = "UNDECLARED") {
  const v = value?.trim();
  if (!v) return fallback;
  return v.slice(0, 160);
}

function issuerHost(raw: string | undefined) {
  try {
    return raw?.trim() ? new URL(raw.trim()).hostname : "UNDECLARED";
  } catch {
    return "INVALID_URL";
  }
}

function mcpPath(raw: string | undefined) {
  try {
    return raw?.trim() ? new URL(raw.trim()).pathname : "UNDECLARED";
  } catch {
    return "INVALID_URL";
  }
}

function loadIdentityFile(candidate: string, source: string): { source: string; value: StaticIdentity } | null {
  if (!existsSync(candidate)) return null;
  try {
    const parsed = JSON.parse(readFileSync(candidate, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.contract === 'GLOW_ASSEMBLY_IDENTITY_V1') {
      const allowed=['contract','assembly_id','assembly_state','carrier_sha','public_host_repository','public_host_sha','private_factory_repository','private_factory_sha','runtime_binding','deployment_target','source_branch'];
      const safe:StaticIdentity={};
      for(const key of allowed){
        if(typeof parsed[key]==='string'&&parsed[key].length<=160)safe[key]=parsed[key];
      }
      return { source, value: safe };
    }
  } catch {
    return null;
  }
  return null;
}

function loadStaticIdentity(env: NodeJS.ProcessEnv): { source: string; value: StaticIdentity } {
  const explicitPath = env.GLOW_RUNTIME_IDENTITY_PATH?.trim();
  if (explicitPath) {
    return loadIdentityFile(explicitPath, "EXPLICIT_RUNTIME_IDENTITY") ?? {
      source: "UNDECLARED",
      value: { state: "UNDECLARED", reason: "EXPLICIT_IDENTITY_PATH_UNAVAILABLE" }
    };
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    { path: path.resolve(moduleDir, "../../runtime-identity.json"), source: "BAKED_RUNTIME_IDENTITY" },
    { path: path.resolve(process.cwd(), "runtime-identity.json"), source: "WORKDIR_RUNTIME_IDENTITY" },
    { path: path.resolve(process.cwd(), "combined-runtime/public-host/runtime-identity.json"), source: "ASSEMBLED_RUNTIME_IDENTITY" }
  ];

  for (const candidate of candidates) {
    const loaded = loadIdentityFile(candidate.path, candidate.source);
    if (loaded) return loaded;
  }

  return { source: "UNDECLARED", value: { state: "UNDECLARED" } };
}

export function loadRuntimeIdentity(env: NodeJS.ProcessEnv = process.env) {
  const staticIdentity = loadStaticIdentity(env);
  const authHost = issuerHost(env.GLOW_OAUTH_ISSUER);
  const backendBinding = env.GLOW_COMBINED_RUNTIME_MODULE?.trim()
    ? "IN_PROCESS_COMBINED_RUNTIME"
    : env.GLOW_PROTECTED_SERVICE_URL?.trim()
      ? "REMOTE_PROTECTED_SERVICE"
      : "UNDECLARED";
  const stateDir = resolveProtectedStateDir(env);
  const authProvider = authHost.endsWith("supabase.co")
    ? "SUPABASE_OAUTH"
    : authHost.endsWith("auth0.com")
      ? "AUTH0_OAUTH"
      : "EXTERNAL_OR_UNDECLARED";

  return {
    contract: "GLOW_RUNTIME_IDENTITY_V1",
    product: "GLOW Web",
    identity_source: staticIdentity.source,
    assembly: staticIdentity.value,
    runtime: {
      backend_binding: backendBinding,
      auth_mode: cleanValue(env.GLOW_AUTH_MODE),
      auth_provider: authProvider,
      auth_issuer_host: authHost,
      mcp_path: mcpPath(env.GLOW_PUBLIC_MCP_URL),
      state_dir_mode: stateDir.mode,
      relative_legacy_state_dir_ignored: stateDir.ignoredRelativeLegacy,
      combined_runtime_module_configured: Boolean(env.GLOW_COMBINED_RUNTIME_MODULE?.trim()),
      node_version: process.version
    },
    security: {
      secrets_exposed: false,
      subject_exposed: false,
      raw_environment_exposed: false,
      filesystem_path_exposed: false
    }
  };
}
