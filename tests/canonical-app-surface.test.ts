import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const serverSource = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");

test("critical ChatGPT file-backed artifact tool stays registered", () => {
  assert.match(serverSource, /registerTool\(['\"]glow_register_factory_artifact_file['\"]/);
  assert.match(serverSource, /['\"]openai\/fileParams['\"]\s*:\s*\[['\"]file['\"]\]/);
  assert.match(serverSource, /AuthorizedFileAdmissionSchema/);
});

test("canonical MCP v2 endpoint stays registered", () => {
  assert.match(serverSource, /app\.all\(['\"]\/mcp-v2['\"]/);
});
