import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hostFixture, fetchHttpHandler } from "./http-fixture.js";

const IMAGE_ASSETS = [
  "hero-ocean-jade.webp",
  "reel-01-botanical.webp",
  "reel-02-coastal-villa.webp",
  "reel-03-liquid-prism.webp",
] as const;

const VIDEO_ASSETS = [
  "hero-ocean-jade.mp4",
  "reel-01-botanical.mp4",
  "reel-02-coastal-villa.mp4",
  "reel-03-liquid-prism.mp4",
] as const;

const readText = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
const readBytes = (rel: string) => readFileSync(resolve(process.cwd(), rel));

test("flagship WebP posters and 1080p MP4 cinema videos exist with valid headers and compact budgets", () => {
  let totalWebpBytes = 0;
  for (const file of IMAGE_ASSETS) {
    const bytes = readBytes(`public/assets/${file}`);
    assert.ok(bytes.byteLength > 1024, `${file} must be non-empty`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${file} RIFF header`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${file} WEBP header`);
    totalWebpBytes += bytes.byteLength;
  }
  assert.ok(totalWebpBytes <= 420 * 1024, `combined WebP size ${totalWebpBytes} exceeds 420 KB budget`);

  let totalMp4Bytes = 0;
  for (const file of VIDEO_ASSETS) {
    const bytes = readBytes(`public/assets/${file}`);
    assert.ok(bytes.byteLength > 100 * 1024, `${file} must be non-empty 1080p stream`);
    assert.equal(bytes.subarray(4, 8).toString("ascii"), "ftyp", `${file} ISO BMFF ftyp header`);
    const moovIdx = bytes.indexOf(Buffer.from("moov", "ascii"));
    const mdatIdx = bytes.indexOf(Buffer.from("mdat", "ascii"));
    assert.ok(moovIdx > 0 && mdatIdx > moovIdx, `${file} must place moov before mdat (+faststart)`);
    totalMp4Bytes += bytes.byteLength;
  }
  assert.ok(totalMp4Bytes <= 10 * 1024 * 1024, `combined MP4 size ${totalMp4Bytes} exceeds 10 MB budget`);
});

test("server.ts registers explicit 8-file allowlist (4 WebP + 4 MP4) without wildcard static or path-param routes", () => {
  const server = readText("src/server.ts");
  assert.match(server, /const FLAGSHIP_IMAGE_ASSETS\s*=/);
  assert.match(server, /const FLAGSHIP_VIDEO_ASSETS\s*=/);
  for (const file of [...IMAGE_ASSETS, ...VIDEO_ASSETS]) {
    assert.ok(server.includes(`"${file}"`), `missing allowlist entry ${file}`);
  }
  assert.doesNotMatch(server, /express\.static\s*\(/);
  assert.doesNotMatch(server, /app\.get\(\s*["'`][^"'`]*\/assets\/:/);
  assert.doesNotMatch(server, /app\.get\(\s*["'`][^"'`]*\/assets\/\*/);
});

test("public flagship files enforce zero internal leaks, zero external CDN, zero fake canvases, real video tags, and preserve intake hooks", () => {
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
      /(?<!<\/?)\bH[123]\b(?!>)|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE|Pyodide|SQLite|GLOW-WEB-FACTORY/u,
      `internal process leak in ${file}`
    );
    assert.doesNotMatch(
      content,
      /<(?:link|script)\b[^>]*(?:href|src)\s*=\s*["']https?:\/\//i,
      `external CDN forbidden in ${file}`
    );
  }

  const html = readText("public/index.html");
  assert.doesNotMatch(html, /<canvas\b/i, "fake 2D canvas overlays must be removed");
  assert.equal(html.includes("reel03-infinity-canvas"), false, "legacy reel03-infinity-canvas must be removed");
  assert.equal(html.includes("hero-water-canvas"), false, "legacy hero-water-canvas must be removed");
  assert.equal(html.includes('id="tiers"'), false, "e-commerce pricing table must be removed");

  const PUBLIC_HOME_VIDEOS = [
    "hero-ocean-jade.mp4",
    "reel-01-botanical.mp4",
    "reel-02-coastal-villa.mp4",
  ] as const;
  const PUBLIC_HOME_POSTERS = [
    "hero-ocean-jade.webp",
    "reel-01-botanical.webp",
    "reel-02-coastal-villa.webp",
  ] as const;
  for (const file of PUBLIC_HOME_VIDEOS) {
    assert.ok(html.includes(`/assets/${file}`), `index.html missing curated video source /assets/${file}`);
  }
  for (const file of PUBLIC_HOME_POSTERS) {
    assert.ok(html.includes(`/assets/${file}`), `index.html missing curated poster /assets/${file}`);
  }
  assert.ok((html.match(/<video\b/g) || []).length >= 4, "must render 3 curated cinema videos + modal video player");
  assert.ok(html.includes('id="chapter-botanical"'), "index.html missing #chapter-botanical direct scroll chapter");
  assert.ok(html.includes('id="chapter-villa"'), "index.html missing #chapter-villa direct scroll chapter");
  assert.ok(html.includes('class="chapter-editorial'), "index.html missing borderless .chapter-editorial film typography");
  assert.equal(html.includes("chapter-card"), false, "hard bordered .chapter-card boxes over video frames must be removed");
  assert.ok(html.includes('id="sanctuary-sculpture"'), "index.html missing #sanctuary-sculpture atmospheric layer");
  assert.equal(html.includes("prism-ribbons-svg"), false, "crude SVG prism-ribbons-svg curves must be removed");
  assert.equal(html.includes("orbital-ring"), false, "thin wireframe orbital-ring circles must be removed");

  const css = readText("public/app.css");
  assert.equal(css.includes("prism-ribbons-svg"), false, "app.css must not contain removed prism-ribbons-svg rules");
  assert.equal(css.includes("orbital-ring"), false, "app.css must not contain removed orbital-ring rules");
  assert.match(
    css,
    /\.sanctuary-sculpture\s*\{[^}]*mask-image:\s*linear-gradient\(\s*180deg,\s*transparent\s+0%/s,
    "app.css .sanctuary-sculpture must enforce alpha-zero vertical top fade mask"
  );

  const requiredHtmlTokens = [
    'id="runtime-status"',
    'id="ready-state"',
    'id="progress"',
    'id="register"',
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
    'id="cinema-modal"',
    'id="cinema-stage-video"',
    "/auth/login?next=%2Fworkspace",
    "/workspace",
  ];
  for (const token of requiredHtmlTokens) {
    assert.ok(html.includes(token), `index.html missing required hook ${token}`);
  }
  assert.equal((html.match(/class="wizard-step/g) || []).length, 4, "must preserve 4 wizard steps");

  const js = readText("public/app.js");
  assert.match(js, /GLOW_WEB_PUBLIC_INTAKE_V1/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion:\s*reduce/);
  assert.equal(js.includes("reel03-infinity-canvas"), false, "app.js must not reference removed fake canvas");
});

test("HTTP allowlist serves all 8 assets (4 WebP + 4 MP4) on root and basePath and rejects traversal or unknown assets", async () => {
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
          for (const file of IMAGE_ASSETS) {
            const res = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}/assets/${file}`);
            assert.equal(res.status, 200, `${prefix}/assets/${file} must return 200`);
            assert.match(res.headers.get("content-type") || "", /image\/webp/i);
            assert.equal(res.headers.get("cache-control"), "public, max-age=86400");
            const body = Buffer.from(await res.arrayBuffer());
            assert.equal(body.subarray(0, 4).toString("ascii"), "RIFF");
            assert.equal(body.subarray(8, 12).toString("ascii"), "WEBP");
          }

          for (const file of VIDEO_ASSETS) {
            const res = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}/assets/${file}`);
            assert.equal(res.status, 200, `${prefix}/assets/${file} must return 200`);
            assert.match(res.headers.get("content-type") || "", /video\/mp4/i);
            assert.equal(res.headers.get("cache-control"), "public, max-age=86400");
            const body = Buffer.from(await res.arrayBuffer());
            assert.equal(body.subarray(4, 8).toString("ascii"), "ftyp");
          }

          for (const badPath of [
            `${prefix}/assets/unknown.webp`,
            `${prefix}/assets/unknown.mp4`,
            `${prefix}/assets/../package.json`,
            `${prefix}/assets/%2e%2e/package.json`,
            `${prefix}/assets/hero-ocean-jade.webp/extra`,
            `${prefix}/assets/hero-ocean-jade.mp4/extra`,
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
