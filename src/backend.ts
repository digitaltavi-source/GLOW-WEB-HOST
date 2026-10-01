import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WebResponse, type WebRequestType, type WebResponseType } from "./contracts.js";
import type { HostConfig } from "./config.js";
import { resolveProtectedStateDir } from "./state-dir.js";

export class BackendError extends Error {}

type InProcessRuntime = {
  execute(subject: string, raw: WebRequestType): Promise<{ status_code: number; body: unknown }>;
};

let inProcessRuntimePromise: Promise<InProcessRuntime> | null = null;

async function getInProcessRuntime(config: HostConfig): Promise<InProcessRuntime> {
  if (!inProcessRuntimePromise) {
    const runtimePath = config.combinedRuntimeModule?.trim()
      || "host-integration/node-private-host/combined-runtime.mjs";
    const runtimeUrl = pathToFileURL(resolve(process.cwd(), runtimePath)).href;
    inProcessRuntimePromise = import(runtimeUrl).then(async mod => {
      if (typeof mod.createCombinedFactoryRuntime !== "function") {
        throw new BackendError("INPROCESS_COMBINED_RUNTIME_FACTORY_MISSING");
      }
      const state=resolveProtectedStateDir();
      return mod.createCombinedFactoryRuntime({
        repoRoot: process.cwd(),
        stateDir: state.path,
        stateMode: state.mode
      }) as Promise<InProcessRuntime>;
    });
  }
  return inProcessRuntimePromise;
}

export async function callProtectedService(
  config: HostConfig,
  subject: string,
  request: WebRequestType,
  fetchImpl: typeof fetch = fetch
): Promise<WebResponseType> {
  let raw: unknown;

  if (config.inProcessProtected) {
    const runtime = await getInProcessRuntime(config);
    const result = await runtime.execute(subject, request);
    if (result.status_code !== 200) {
      throw new BackendError(`PROTECTED_INPROCESS_STATUS_${result.status_code}`);
    }
    raw = result.body;
  } else {
    const response = await fetchImpl(`${config.protectedServiceUrl}/v1/web-missions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${config.protectedServiceToken}`,
        "x-glow-subject": subject
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new BackendError(`PROTECTED_SERVICE_HTTP_${response.status}`);
    }
    raw = await response.json();
  }

  // Whitelist-based declassification: only the public response schema may cross this boundary.
  const parsed = WebResponse.safeParse(raw);
  if (!parsed.success) throw new BackendError("DECLASSIFICATION_SCHEMA_REJECTED");

  return parsed.data;
}

export async function checkProtectedReadiness(
  config: HostConfig,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; protected_service_authenticated: boolean; code: string }> {
  const probe: WebRequestType = {
    request_id: "r3-readiness-probe-v1",
    operation: "get_status",
    role: "unspecified",
    locale: "vi-VN",
    input: { mission_id: "M-R3-READINESS-NONEXISTENT" }
  };
  try {
    const out = await callProtectedService(config, "r3-readiness-probe", probe, fetchImpl);
    const code = out.errors?.[0]?.code ?? "";
    if (out.status === "failed" && code === "MISSION_NOT_FOUND") {
      return {
        ok: true,
        protected_service_authenticated: true,
        code: config.inProcessProtected ? "PROTECTED_FACTORY_INPROCESS_REACHABLE" : "PROTECTED_FACTORY_REACHABLE"
      };
    }
    return { ok: false, protected_service_authenticated: true, code: "PROTECTED_FACTORY_UNEXPECTED_RESPONSE" };
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROTECTED_FACTORY_PROBE_FAILED";
    return { ok: false, protected_service_authenticated: false, code };
  }
}
