import test from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import type { Socket } from "node:net";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { resolve } from "node:path";
import { PUBLIC_HTML_CSP } from "../src/mcp-app.js";
import {
  callProtectedService,
  checkProtectedReadiness,
  resetCombinedRuntimeCacheForTest,
} from "../src/backend.js";
import type { HostConfig } from "../src/config.js";
import { loadRuntimeIdentity } from "../src/runtime-identity.js";
import { fetchHttpHandler, hostFixture, type Dispatch } from "./http-fixture.js";

function makeConfig(overrides: Partial<HostConfig> = {}): HostConfig {
  return {
    port: 3100,
    publicOrigin: "http://127.0.0.1:3100",
    protectedServiceUrl: "https://backend.fixture",
    protectedServiceToken: "fixture-token",
    combinedRuntimeModule: undefined,
    ...overrides,
  } as HostConfig;
}

test("ENTRY214 NORMAL: public security headers, HEAD parity, /privacy + /auth/login routes, enriched /api/templates/:id/source, and operator/workspace parity", async () => {
  const operatorHtml = readFileSync(resolve(process.cwd(), "public/operator.html"), "utf8");
  const operatorJs = readFileSync(resolve(process.cwd(), "public/operator.js"), "utf8");
  assert.doesNotMatch(operatorHtml, /Auth0/i, "operator.html must not contain retired Auth0 copy");
  assert.doesNotMatch(operatorJs, /\/api\/operator\/(?:config|admission)/, "operator.js must not call dead /api/operator/* endpoints");
  assert.match(operatorJs, /\/mcp-v2/, "operator.js must bind canonical /mcp-v2 JSON-RPC endpoint");
  assert.match(operatorJs, /glow_get_factory_work/, "operator.js must support glow_get_factory_work");
  assert.match(operatorJs, /glow_register_factory_evidence/, "operator.js must support glow_register_factory_evidence");

  const workspaceHtml = readFileSync(resolve(process.cwd(), "public/workspace.html"), "utf8");
  const workspaceJs = readFileSync(resolve(process.cwd(), "public/workspace.js"), "utf8");
  assert.match(workspaceHtml, /id="studio-template-iframe"[^>]*sandbox=""/, "workspace.html preview iframe must enforce sandbox=\"\"");
  assert.doesNotMatch(workspaceJs, /\binnerHTML\b/, "workspace.js must forbid innerHTML");

  await hostFixture(
    {
      GLOW_DEPLOYMENT_TOPOLOGY: "SHARED_ECOSYSTEM_GATEWAY",
      GLOW_PUBLIC_ORIGIN: "http://127.0.0.1:3100",
      GLOW_BASE_PATH: "/web",
      GLOW_PUBLIC_MCP_URL: "http://127.0.0.1:3100/web/mcp-v2",
      GLOW_AUTH_MODE: "oauth",
      GLOW_OAUTH_ISSUER: "https://glow.example",
      GLOW_OAUTH_AUDIENCE: "http://127.0.0.1:3100/web/mcp-v2",
      GLOW_OAUTH_JWKS_URL: "https://glow.example/.well-known/jwks.json",
      GLOW_OAUTH_REQUIRED_SCOPES: "web.run",
    },
    async ({ app, handler }) => {
      try {
        const publicRoutes = ["", "/app", "/product", "/solutions", "/resources", "/pricing", "/workspace", "/privacy", "/auth/login"];
        for (const prefix of ["", "/web"]) {
          for (const route of publicRoutes) {
            const targetPath = `${prefix}${route}` || "/";
            const getRes = await fetchHttpHandler(app, `http://127.0.0.1:3100${targetPath}`);
            assert.equal(getRes.status, 200, `GET ${targetPath} must return 200`);
            assert.equal(getRes.headers.get("content-security-policy"), PUBLIC_HTML_CSP);
            assert.equal(getRes.headers.get("x-content-type-options"), "nosniff");
            assert.equal(getRes.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
            assert.equal(getRes.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
            assert.equal(getRes.headers.get("x-frame-options"), "SAMEORIGIN");
            assert.equal(getRes.headers.get("x-powered-by"), null, `${targetPath} must omit x-powered-by`);

            const headRes = await fetchHttpHandler(app, `http://127.0.0.1:3100${targetPath}`, { method: "HEAD" });
            assert.equal(headRes.status, 200, `HEAD ${targetPath} must return 200`);
            assert.equal(headRes.headers.get("content-security-policy"), PUBLIC_HTML_CSP);
            assert.equal((await headRes.arrayBuffer()).byteLength, 0, `HEAD ${targetPath} must return 0 body bytes`);
          }

          const renderRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/coastal-glass-architecture/render?lang=vi`
          );
          assert.equal(renderRes.status, 200);
          assert.match(
            renderRes.headers.get("content-security-policy") ?? "",
            /^default-src 'none';/,
            `${prefix}/api/templates/:id/render must preserve stricter sandbox CSP`
          );

          const srcRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/coastal-glass-architecture/source?lang=en&brand=Atelier%20Glow`
          );
          assert.equal(srcRes.status, 200);
          const srcBody = (await srcRes.json()) as Record<string, unknown>;
          assert.equal(srcBody.ok, true);
          assert.equal(typeof srcBody.name, "string");
          assert.equal(srcBody.category, "showcase");
          assert.equal(srcBody.industry_key, "architecture");
          assert.equal(typeof srcBody.mood, "string");
          assert.equal(srcBody.status, "published");
          assert.equal(typeof srcBody.featured, "boolean");
          assert.equal(typeof srcBody.patternOrigins, "string");
          const blueprint = srcBody.blueprint as Record<string, unknown>;
          assert.ok(blueprint && typeof blueprint === "object", "source payload must include blueprint object");
          assert.ok(Array.isArray(blueprint.blocks) && blueprint.blocks.length > 0, "blueprint must include blocks");
          assert.ok(blueprint.design_tokens && typeof blueprint.design_tokens === "object", "blueprint must include design_tokens");

          const loginRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/auth/login?mode=signup&login_hint=founder%40glow.vn&brand=GLOW%20Atelier&template=coastal-glass-architecture&lang=en&next=%2Fworkspace`
          );
          assert.equal(loginRes.status, 200);
          const loginHtml = await loginRes.text();
          assert.match(loginHtml, /founder@glow\.vn/);
          assert.match(loginHtml, /GLOW Atelier/);
          const expectedWorkspaceHref = `${prefix}/workspace?template=coastal-glass-architecture&amp;brand=GLOW+Atelier&amp;lang=en`;
          assert.ok(
            loginHtml.includes(`href="${expectedWorkspaceHref}"`),
            `expected ${expectedWorkspaceHref} in standalone /auth/login HTML`
          );
        }
      } finally {
        await handler.close();
      }
    }
  );
});

test("ENTRY214 FAILURE: non-MCP JSON body >512kb rejected with 413, upstream callProtectedService attaches AbortSignal timeout, and checkProtectedReadiness masks raw OS errors", async () => {
  await hostFixture(
    {
      GLOW_AUTH_MODE: "static_bearer",
      GLOW_PUBLIC_TEST_BEARER_TOKEN: "entry214-static-bearer-fixture-secret-0123456789",
    },
    async ({ app, handler }) => {
      try {
        const oversizedNonMcp = JSON.stringify({ pad: "x".repeat(600 * 1024) });
        const nonMcpRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/healthz", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: oversizedNonMcp,
        });
        assert.equal(nonMcpRes.status, 413, "non-MCP route must enforce 512kb JSON body ceiling");
      } finally {
        await handler.close();
      }
    }
  );

  let capturedSignal: AbortSignal | null | undefined;
  const readinessNetworkErr = await checkProtectedReadiness(makeConfig(), (async (_input, init) => {
    capturedSignal = init?.signal;
    throw new Error("connect ECONNREFUSED 10.24.0.9:8443 (/srv/private/factory-mtls.pem)");
  }) as typeof fetch);

  assert.ok(capturedSignal instanceof AbortSignal, "callProtectedService must attach AbortSignal timeout");
  assert.equal(readinessNetworkErr.ok, false);
  assert.equal(
    readinessNetworkErr.code,
    "PROTECTED_FACTORY_PROBE_FAILED",
    "raw OS/socket Error.message must never leak into /readyz code"
  );

  const readinessHttp503 = await checkProtectedReadiness(makeConfig(), (async () => {
    return new Response("unavailable", { status: 503 });
  }) as typeof fetch);
  assert.equal(readinessHttp503.ok, false);
  assert.equal(readinessHttp503.code, "PROTECTED_SERVICE_HTTP_503", "canonical uppercase status codes remain intact");
});

async function probeUnauthStreamConsumption(dispatch: Dispatch, targetPath: string): Promise<{ status: number; chunksConsumed: number }> {
  let chunksConsumed = 0;
  const wire: Buffer[] = [];
  const socket = new Duplex({
    autoDestroy: false,
    read() {},
    write(chunk, _enc, done) {
      wire.push(Buffer.from(chunk));
      done();
    },
  }) as Socket;
  Object.defineProperty(socket, "remoteAddress", { value: "127.0.0.1" });
  Object.defineProperty(socket, "encrypted", { value: false });

  const payloadChunk = Buffer.alloc(2 * 1024 * 1024, 0x61);
  let pushed = false;
  const req = new IncomingMessage(socket);
  req.method = "POST";
  req.url = targetPath;
  req.httpVersion = "1.1";
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;
  req.headers = {
    host: "127.0.0.1:3100",
    "content-type": "application/json",
    "content-length": String(payloadChunk.byteLength),
  };
  req.rawHeaders = ["Host", "127.0.0.1:3100", "Content-Type", "application/json", "Content-Length", String(payloadChunk.byteLength)];
  req._read = function () {
    if (!pushed) {
      pushed = true;
      chunksConsumed += 1;
      this.push(payloadChunk);
      this.push(null);
    }
  };

  const res = new ServerResponse(req);
  res.assignSocket(socket);

  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      socket.destroy();
      rejectPromise(new Error(`STREAM_PROBE_TIMEOUT:${targetPath}`));
    }, 5000);
    res.once("finish", () => {
      clearTimeout(timer);
      socket.destroy();
      resolvePromise({ status: res.statusCode, chunksConsumed });
    });
    Promise.resolve(dispatch(req, res)).catch((err) => {
      clearTimeout(timer);
      rejectPromise(err);
    });
  });
}

test("ENTRY214 ADVERSARIAL: unauthenticated /mcp-v2 & /mcp-v2/ reject before reading 2 MiB body while authenticated >600 KiB JSON-RPC succeeds; CWE-601 open-redirect, domain spoofing, and symlink identity blocked", async () => {
  const validBearer = "entry214-static-bearer-fixture-secret-9876543210";
  await hostFixture(
    {
      GLOW_AUTH_MODE: "static_bearer",
      GLOW_PUBLIC_TEST_BEARER_TOKEN: validBearer,
    },
    async ({ app, handler }) => {
      try {
        for (const unauthPath of ["/mcp-v2", "/mcp-v2/"]) {
          const unauthProbe = await probeUnauthStreamConsumption(app, unauthPath);
          assert.equal(unauthProbe.status, 401, `unauthenticated POST ${unauthPath} must return 401`);
          assert.equal(unauthProbe.chunksConsumed, 0, `unauthenticated POST ${unauthPath} must not consume request body stream`);
        }

        // Positive authenticated control (>512kb default ceiling, within 12mb authenticated MCP ceiling)
        const largeInitialize = JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "entry214-large-auth-client", version: "1.0.0", padding: "p".repeat(620 * 1024) },
          },
        });
        const authRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
          method: "POST",
          headers: {
            authorization: `Bearer ${validBearer}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body: largeInitialize,
        });
        assert.notEqual(authRes.status, 401, "authenticated /mcp-v2 positive control must pass authV2");
        assert.notEqual(authRes.status, 413, "authenticated /mcp-v2 >600 KiB JSON-RPC payload must pass 12mb MCP parser");
        assert.equal(authRes.status, 200, "authenticated /mcp-v2 initialize must succeed with 200");

        // CWE-601 open-redirect & XSS attempts on /auth/login
        for (const evilNext of [
          "//evil.example/phish",
          "/\\evil.example/phish",
          "https://evil.example/phish",
          "javascript:alert(1)",
          "/../../etc/passwd",
        ]) {
          const loginRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100/auth/login?next=${encodeURIComponent(evilNext)}&login_hint=${encodeURIComponent('<script>alert(1)</script>')}`
          );
          assert.equal(loginRes.status, 200);
          const html = await loginRes.text();
          assert.ok(
            html.includes('data-glow-continue-workspace="true" href="/workspace"'),
            `adversarial next=${evilNext} must sanitize strictly to /workspace`
          );
          assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/, "login_hint XSS payload must be HTML-escaped");
        }
      } finally {
        await handler.close();
      }
    }
  );

  // SEC-06 domain-suffix spoofing & native OIDC classification
  const spoofAuth0 = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "https://evil-auth0.com",
    GLOW_PUBLIC_ORIGIN: "https://glowstudio.vn",
  } as NodeJS.ProcessEnv);
  assert.equal(spoofAuth0.runtime.auth_provider, "EXTERNAL_OR_UNDECLARED");

  const spoofSupabase = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "https://evil-supabase.co",
    GLOW_PUBLIC_ORIGIN: "https://glowstudio.vn",
  } as NodeJS.ProcessEnv);
  assert.equal(spoofSupabase.runtime.auth_provider, "EXTERNAL_OR_UNDECLARED");

  const validAuth0 = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "https://tenant.us.auth0.com",
  } as NodeJS.ProcessEnv);
  assert.equal(validAuth0.runtime.auth_provider, "AUTH0_OAUTH");

  const nativeGlow = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "https://id.glowstudio.vn",
    GLOW_PUBLIC_ORIGIN: "https://web.glowstudio.vn",
  } as NodeJS.ProcessEnv);
  assert.equal(nativeGlow.runtime.auth_provider, "GLOW_NATIVE_OIDC");

  // SEC-06 symlinked runtime-identity.json rejection
  const tmpDir = mkdtempSync(path.join(tmpdir(), "glow-e214-ident-"));
  try {
    const realPath = path.join(tmpDir, "real-identity.json");
    const linkPath = path.join(tmpDir, "symlink-identity.json");
    writeFileSync(
      realPath,
      JSON.stringify({
        contract: "GLOW_ASSEMBLY_IDENTITY_V1",
        assembly_id: "ASM-TEST-214",
        public_host_sha: "bd6a8624cd2959127b099c5b964da78822d87d14",
      }),
      "utf8"
    );
    symlinkSync(realPath, linkPath);

    const directLoaded = loadRuntimeIdentity({ GLOW_RUNTIME_IDENTITY_PATH: realPath } as NodeJS.ProcessEnv);
    assert.equal(directLoaded.identity_source, "EXPLICIT_RUNTIME_IDENTITY");

    const symlinkLoaded = loadRuntimeIdentity({ GLOW_RUNTIME_IDENTITY_PATH: linkPath } as NodeJS.ProcessEnv);
    assert.equal(symlinkLoaded.identity_source, "UNDECLARED", "symlinked runtime-identity.json must be rejected via lstatSync");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("ENTRY214 RECOVERY: transient combinedRuntimePromise boot rejection clears poisoned cache and recovers on subsequent call", async () => {
  resetCombinedRuntimeCacheForTest();
  const tmpDir = mkdtempSync(path.join(tmpdir(), "glow-e214-recovery-"));
  try {
    const counterFile = path.join(tmpDir, "boot-count.txt");
    writeFileSync(counterFile, "0", "utf8");
    const runtimeModFile = path.join(tmpDir, "mock-combined-runtime.mjs");
    writeFileSync(
      runtimeModFile,
      `import { readFileSync, writeFileSync } from "node:fs";
const counterPath = ${JSON.stringify(counterFile)};
export async function createGlowCombinedRuntime() {
  const attempt = Number(readFileSync(counterPath, "utf8")) + 1;
  writeFileSync(counterPath, String(attempt), "utf8");
  if (attempt === 1) {
    throw new Error("TRANSIENT_SQLITE_BUSY_AT_BOOT");
  }
  return {
    async execute(_subject, req) {
      return {
        status_code: 200,
        body: {
          request_id: req.request_id,
          status: "completed",
          exposure: "PUBLIC_DECLASSIFIED",
          result: { recovered_on_attempt: attempt },
          public_evidence: [],
          errors: []
        }
      };
    }
  };
}
`,
      "utf8"
    );

    const cfg = makeConfig({ combinedRuntimeModule: runtimeModFile });
    const reqPayload = {
      request_id: "e214-recovery-probe-1",
      operation: "get_status" as const,
      role: "client" as const,
      locale: "vi-VN",
      input: { mission_id: "NM-000000000214" },
    };

    await assert.rejects(
      () => callProtectedService(cfg, "user-recovery-1", reqPayload),
      /TRANSIENT_SQLITE_BUSY_AT_BOOT/,
      "attempt #1 surfaces transient boot error"
    );

    const recovered = await callProtectedService(cfg, "user-recovery-1", {
      ...reqPayload,
      request_id: "e214-recovery-probe-2",
    });
    assert.equal(recovered.status, "completed");
    assert.deepEqual(recovered.result, { recovered_on_attempt: 2 });
  } finally {
    resetCombinedRuntimeCacheForTest();
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
