import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("showcase public package is present and bounded", () => {
  const html=readFileSync("public/showcase.html","utf8");
  const css=readFileSync("public/showcase.css","utf8");
  const js=readFileSync("public/showcase.js","utf8");
  assert.match(html,/LIVE PUBLIC DEMO/);
  assert.match(html,/href="\/app"/);
  assert.match(html,/Public experience ≠ Private Factory/);
  assert.match(html,/canonical/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/@media \(max-width:620px\)/);
  assert.ok(js.length>50);
  assert.doesNotMatch(html,/MODEL_SESSION_PRIVATE|github_pat_|ghp_/);
});

test("server owns showcase routes without replacing app or MCP", () => {
  const server=readFileSync("src/server.ts","utf8");
  assert.match(server,/app\.get\("\/showcase"/);
  assert.match(server,/app\.get\("\/showcase\.css"/);
  assert.match(server,/app\.get\("\/showcase\.js"/);
  assert.match(server,/app\.get\("\/app"/);
  assert.match(server,/mcpV2ServerUrl/);
});
