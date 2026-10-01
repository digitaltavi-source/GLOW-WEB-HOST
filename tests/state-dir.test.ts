import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { resolveProtectedStateDir } from "../src/state-dir.js";

test("relative legacy state dir is rejected in favor of home-persistent storage",()=>{
  const out=resolveProtectedStateDir({
    GLOW_NODE_STATE_DIR:".glow-node-state",
    GLOW_PUBLIC_MCP_URL:"https://lightsteelblue-newt-327142.hostingersite.com/mcp-v2"
  } as NodeJS.ProcessEnv,"/home/tester");
  assert.equal(out.mode,"HOME_PERSISTENT");
  assert.equal(out.ignoredRelativeLegacy,true);
  assert.equal(out.path,resolve("/home/tester",".glow-web-state","lightsteelblue-newt-327142.hostingersite.com"));
});

test("absolute state dir remains an explicit operator override",()=>{
  const out=resolveProtectedStateDir({
    GLOW_NODE_STATE_DIR:"/persistent/glow"
  } as NodeJS.ProcessEnv,"/home/tester");
  assert.equal(out.mode,"EXPLICIT_ABSOLUTE");
  assert.equal(out.ignoredRelativeLegacy,false);
  assert.equal(out.path,resolve("/persistent/glow"));
});

test("explicit persistent root is namespaced by MCP hostname",()=>{
  const out=resolveProtectedStateDir({
    GLOW_PERSISTENT_STATE_ROOT:"/var/lib/glow",
    GLOW_PUBLIC_MCP_URL:"https://example.com/mcp-v2"
  } as NodeJS.ProcessEnv,"/home/tester");
  assert.equal(out.path,resolve("/var/lib/glow","example.com"));
  assert.equal(out.mode,"HOME_PERSISTENT");
});
