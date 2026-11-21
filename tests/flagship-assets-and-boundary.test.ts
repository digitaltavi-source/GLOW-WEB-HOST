import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hostFixture, fetchHttpHandler } from "./http-fixture.js";

const ASSETS = [
  "hero-ocean-jade.webp",
  "reel-01-botanical.webp",
  "reel-02-coastal-villa.webp",
  "reel-03-liquid-prism.webp",
] as const;

const readText = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
const readBytes = (rel: string) => readFileSync(resolve(process.cwd(), rel));

test("flagship WebP assets exist on disk with valid RIFF/WEBP headers and compact total size", () => {
  let totalBytes = 0;
  for (const file of ASSETS) {
    const bytes = readBytes(`public/assets/${file}`);
    assert.ok(bytes.byteLength > 1024, `${file} must be non-empty`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${file} RIFF header`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${file} WEBP header`);
    totalBytes += bytes.byteLength;
  }
  assert.ok(totalBytes <= 420 * 1024, `combined WebP size ${totalBytes} exceeds 420 KB budget`);
});

test("server.ts registers explicit 4-file WebP allowlist without wildcard static or path-param routes", () => {
  const server = readText("src/server.ts");
  assert.match(server, /const FLAGSHIP_IMAGE_ASSETS\s*=/);
  for (const file of ASSETS) {
    assert.ok(server.includes(`"${file}"`), `missing allowlist entry ${file}`);
  }
  assert.doesNotMatch(server, /express\.static\s*\(/);
  assert.doesNotMatch(server, /app\.get\(\s*["'`][^"'`]*\/assets\/:/);
  assert.doesNotMatch(server, /app\.get\(\s*["'`][^"'`]*\/assets\/\*/);
});

test("public flagship files enforce zero internal leaks, zero external CDN, LF-only, and preserve intake & canvas hooks", () => {
  const textFiles = [
    "public/index.html",
    "public/app.css",
    "public/app.js",
    "public/workspace.html",
    "public/workspace.css",
    "public/workspace.js",
  ];
  for (const file of textFiles) {
    const content = readText(file);
    assert.equal(content.includes("\r"), false, `${file} must be LF-only`);
    assert.doesNotMatch(
      content,
      /(?<!<\/?)\bH[123]\b(?!>)|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE/u,
      `internal process leak in ${file}`
    );
    assert.doesNotMatch(content, /<(?:link|script)\b[^>]*(?:href|src)\s*=\s*["']https?:\/\//i, `external CDN forbidden in ${file}`);
  }

  const html = readText("public/index.html");
  const requiredHtmlTokens = [
    'id="runtime-status"',
    'id="ready-state"',
    'id="progress"',
    'class="cursor-glow"',
    'class="hero-stage"',
    'id="hero-water-canvas"',
    'id="reel01-canvas"',
    'id="reel02-canvas"',
    'id="reel03-infinity-canvas"',
    'id="intake-form"',
    'id="site-type"',
    'id="goal"',
    'id="feeling"',
    'id="name"',
    'id="language"',
    'id="back"',
    'id="next"',
    'id="launch"',
    'id="capsule-result"',
    'id="capsule-preview"',
    'id="copy-capsule"',
    '/auth/login?next=%2Fworkspace',
    '/workspace',
  ];
  for (const token of requiredHtmlTokens) {
    assert.ok(html.includes(token), `index.html missing required hook ${token}`);
  }
  assert.equal((html.match(/class="wizard-step/g) || []).length, 4, "must preserve 4 wizard steps");

  const js = readText("public/app.js");
  assert.match(js, /GLOW_WEB_PUBLIC_INTAKE_V1/);
  assert.match(js, /#hero-water-canvas/);
  assert.match(js, /#reel03-infinity-canvas/);
  assert.match(js, /prefers-reduced-motion:\s*reduce/);
});

test("HTTP allowlist serves all 4 WebP assets on root and basePath and rejects traversal or unknown assets", async () => {
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
        for (const prefix of ["", "/web"]) {
          for (const file of ASSETS) {
            const res = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}/assets/${file}`);
            assert.equal(res.status, 200, `${prefix}/assets/${file} must return 200`);
            assert.match(res.headers.get("content-type") || "", /image\/webp/i);
            assert.equal(res.headers.get("cache-control"), "public, max-age=86400");
            const body = Buffer.from(await res.arrayBuffer());
            assert.equal(body.subarray(0, 4).toString("ascii"), "RIFF");
            assert.equal(body.subarray(8, 12).toString("ascii"), "WEBP");
          }

          for (const badPath of [
            `${prefix}/assets/unknown.webp`,
            `${prefix}/assets/../package.json`,
            `${prefix}/assets/%2e%2e/package.json`,
            `${prefix}/assets/hero-ocean-jade.webp/extra`,
          ]) {
            const bad = await fetchHttpHandler(app, `http://127.0.0.1:3100${badPath}`);
            assert.equal(bad.status, 404, `adversarial path ${badPath} must return 404`);
          }
        }
      } finally {
        await handler.close();
      }
    }
  );
});
