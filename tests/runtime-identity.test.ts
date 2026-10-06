import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRuntimeIdentity } from "../src/runtime-identity.js";
import { createGlowMcpExpressApp } from "../src/mcp-app.js";

test("NORMAL: runtime identity reports baked Web assembly without secrets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-web-runtime-id-"));
  const identityPath = path.join(dir, "runtime-identity.json");
  await writeFile(identityPath, JSON.stringify({
    contract: "GLOW_ASSEMBLY_IDENTITY_V1",
    assembly_id: "WEB-TEST-ASSEMBLY",
    public_host_sha: "a".repeat(40),
    private_factory_sha: "b".repeat(40),
    runtime_binding: "IN_PROCESS"
  }));
  try {
    const out = loadRuntimeIdentity({
      GLOW_RUNTIME_IDENTITY_PATH: identityPath,
      GLOW_COMBINED_RUNTIME_MODULE: "private-runtime.mjs",
      GLOW_AUTH_MODE: "oauth",
      GLOW_OAUTH_ISSUER: "https://tenant.auth0.com/",
      GLOW_PUBLIC_MCP_URL: "https://web.example/mcp-v2",
      SECRET_TOKEN: "must-not-leak"
    });
    assert.equal(out.contract, "GLOW_RUNTIME_IDENTITY_V1");
    assert.equal((out.assembly as any).assembly_id, "WEB-TEST-ASSEMBLY");
    assert.equal(out.runtime.backend_binding, "IN_PROCESS_COMBINED_RUNTIME");
    assert.equal(out.runtime.auth_provider, "AUTH0_OAUTH");
    assert.equal(out.runtime.mcp_path, "/mcp-v2");
    const serialized = JSON.stringify(out);
    assert.equal(serialized.includes("must-not-leak"), false);
    assert.equal(serialized.includes("SECRET_TOKEN"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("FAILURE: missing baked identity stays explicitly UNDECLARED", () => {
  const out = loadRuntimeIdentity({
    GLOW_RUNTIME_IDENTITY_PATH: "/definitely/not/present/runtime-identity.json",
    GLOW_AUTH_MODE: "oauth",
    GLOW_PUBLIC_MCP_URL: "https://web.example/mcp-v2"
  });
  assert.equal((out.assembly as any).state, "UNDECLARED");
  assert.equal(out.runtime.backend_binding, "UNDECLARED");
});

test("ADVERSARIAL: malformed URLs are reported, not echoed as trusted topology", () => {
  const out = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "not-a-url",
    GLOW_PUBLIC_MCP_URL: "also-not-a-url"
  });
  assert.equal(out.runtime.auth_issuer_host, "INVALID_URL");
  assert.equal(out.runtime.mcp_path, "INVALID_URL");
  assert.equal(out.security.raw_environment_exposed, false);
});


test("HTTP: /system/identity exposes baked identity through public app without raw env", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-web-runtime-http-"));
  const identityPath = path.join(dir, "runtime-identity.json");
  await writeFile(identityPath, JSON.stringify({
    contract: "GLOW_ASSEMBLY_IDENTITY_V1",
    assembly_id: "WEB-HTTP-ASSEMBLY",
    public_host_sha: "c".repeat(40),
    private_factory_sha: "d".repeat(40)
  }));
  const oldIdentityPath = process.env.GLOW_RUNTIME_IDENTITY_PATH;
  const oldMcp = process.env.GLOW_PUBLIC_MCP_URL;
  process.env.GLOW_RUNTIME_IDENTITY_PATH = identityPath;
  process.env.GLOW_PUBLIC_MCP_URL = "http://127.0.0.1/mcp-v2";
  const app = createGlowMcpExpressApp(["127.0.0.1", "localhost"]);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/system/identity`);
    assert.equal(response.status, 200);
    const body = await response.json() as any;
    assert.equal(body.contract, "GLOW_RUNTIME_IDENTITY_V1");
    assert.equal(body.assembly.assembly_id, "WEB-HTTP-ASSEMBLY");
    assert.equal(body.runtime.mcp_path, "/mcp-v2");
    assert.equal(body.security.raw_environment_exposed, false);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (oldIdentityPath === undefined) delete process.env.GLOW_RUNTIME_IDENTITY_PATH; else process.env.GLOW_RUNTIME_IDENTITY_PATH = oldIdentityPath;
    if (oldMcp === undefined) delete process.env.GLOW_PUBLIC_MCP_URL; else process.env.GLOW_PUBLIC_MCP_URL = oldMcp;
    await rm(dir, { recursive: true, force: true });
  }
});
