import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRuntimeIdentity } from "../src/runtime-identity.js";

test("NORMAL: runtime identity reports baked assembly and safe live topology", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glow-web-runtime-id-"));
  const identityPath = path.join(dir, "runtime-identity.json");
  await writeFile(identityPath, JSON.stringify({
    contract: "GLOW_ASSEMBLY_IDENTITY_V1",
    assembly_id: "TEST-WEB-ASSEMBLY",
    public_host_sha: "a".repeat(40),
    private_factory_sha: "b".repeat(40)
  }));
  try {
    const out = loadRuntimeIdentity({
      GLOW_RUNTIME_IDENTITY_PATH: identityPath,
      GLOW_COMBINED_RUNTIME_MODULE: "private-runtime.mjs",
      GLOW_AUTH_MODE: "oauth",
      GLOW_OAUTH_ISSUER: "https://tenant.us.auth0.com/",
      GLOW_PUBLIC_MCP_URL: "https://web.example/mcp-v2",
      GLOW_NODE_STATE_DIR: "/persistent/glow-web",
      SECRET_TOKEN: "must-not-leak"
    });
    assert.equal(out.contract, "GLOW_RUNTIME_IDENTITY_V1");
    assert.equal((out.assembly as any).assembly_id, "TEST-WEB-ASSEMBLY");
    assert.equal(out.runtime.backend_binding, "IN_PROCESS_COMBINED_RUNTIME");
    assert.equal(out.runtime.auth_provider, "AUTH0_OAUTH");
    assert.equal(out.runtime.mcp_path, "/mcp-v2");
    assert.equal(out.runtime.state_dir_mode, "EXPLICIT_ABSOLUTE");
    assert.equal(out.identity_source, "EXPLICIT_RUNTIME_IDENTITY");
    assert.equal(out.security.filesystem_path_exposed, false);
    const serialized = JSON.stringify(out);
    assert.equal(serialized.includes(identityPath), false);
    assert.equal(serialized.includes(dir), false);
    assert.equal(serialized.includes("must-not-leak"), false);
    assert.equal(serialized.includes("SECRET_TOKEN"), false);
    assert.equal(serialized.includes("/persistent/glow-web"), false);
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

test("ADVERSARIAL: malformed URLs are reported without echoing raw values", () => {
  const out = loadRuntimeIdentity({
    GLOW_OAUTH_ISSUER: "not-a-url-secretish",
    GLOW_PUBLIC_MCP_URL: "also-not-a-url-secretish"
  });
  assert.equal(out.runtime.auth_issuer_host, "INVALID_URL");
  assert.equal(out.runtime.mcp_path, "INVALID_URL");
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes("secretish"), false);
});

test('ADVERSARIAL: identity JSON does not declassify extra private fields',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'glow-id-whitelist-'));
  const file=path.join(dir,'identity.json');
  try{
    await writeFile(file,JSON.stringify({contract:'GLOW_ASSEMBLY_IDENTITY_V1',assembly_id:'test',operator_token:'private-value',customer_truth:{secret:'private-value'}}));
    const out=loadRuntimeIdentity({GLOW_RUNTIME_IDENTITY_PATH:file});
    assert.equal(JSON.stringify(out).includes('private-value'),false);
    assert.equal((out.assembly as any).assembly_id,'test');
  }finally{await rm(dir,{recursive:true,force:true});}
});
