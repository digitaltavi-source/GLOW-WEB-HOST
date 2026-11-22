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
  "basalt-terrace-deck.webp",
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
  assert.ok(totalWebpBytes <= 580 * 1024, `combined WebP size ${totalWebpBytes} exceeds 580 KB budget`);
  const basaltBytes = readBytes("public/assets/basalt-terrace-deck.webp").byteLength;
  assert.ok(basaltBytes <= 140 * 1024, `basalt-terrace-deck.webp size ${basaltBytes} exceeds 140 KB budget`);

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

test("server.ts registers explicit 9-file allowlist (5 WebP + 4 MP4) without wildcard static or path-param routes", () => {
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
      /(?<!<\/?)\bH[123]\b(?!>)|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE|Pyodide|SQLite|GLOW-WEB-FACTORY|Kim sinh Thủy sinh Mộc/u,
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
  assert.equal(
    html.includes("KHỞI TẠO KHÔNG GIAN · XƯỞNG STUDIO"),
    false,
    "removed finale eyebrow must stay absent"
  );
  assert.ok(html.includes('id="hero-seam-flare"'), "index.html missing #hero-seam-flare seamless loop optical flare");
  assert.ok(html.includes('id="hero-starfield"'), "index.html missing #hero-starfield multi-depth SVG starfield");
  assert.ok(html.includes('class="hero-manifesto-dock" id="manifesto"'), "index.html must dock #manifesto inside Frame 1 .hero-shell");
  assert.equal(html.includes("mist-bridge-12"), false, "opaque .mist-bridge-12 horizontal cut block must remain removed");
  assert.ok(html.includes("GLOW WEBSITE · STUDIO KIẾN TẠO SỐ"), "index.html missing executive Hero eyebrow");
  assert.ok(html.includes("Không gian số"), "index.html missing executive Hero headline line 1");
  assert.ok(html.includes("mang dấu ấn riêng."), "index.html missing executive Hero headline line 2");
  assert.ok(html.includes("01 · CHUẨN MỰC THIẾT KẾ"), "index.html missing executive Manifesto eyebrow");
  assert.ok(html.includes('id="open-auth-modal"'), "index.html missing unified #open-auth-modal button");
  assert.ok(html.includes('id="auth-modal"'), "index.html missing unified #auth-modal dialog");
  assert.ok(html.includes('id="lang-toggle"'), "index.html missing far-right VI/EN #lang-toggle switcher");
  assert.ok(html.includes('id="mobile-menu-toggle"'), "index.html missing mobile navigation toggle");
  assert.ok(html.includes('id="pricing-plans"'), "index.html missing #pricing-plans container");
  assert.ok(html.includes('id="pricing-billing-toggle"'), "index.html missing #pricing-billing-toggle switch");
  assert.ok(html.includes('id="template-gallery-grid"'), "index.html missing live #template-gallery-grid");
  assert.ok(html.includes('id="template-preview-modal"'), "index.html missing #template-preview-modal");
  assert.ok(html.includes('id="preview-live-iframe"'), "index.html missing live #preview-live-iframe");
  assert.ok(html.includes('id="preview-tab-live"'), "index.html missing #preview-tab-live tab");
  assert.ok(html.includes('id="preview-tab-source"'), "index.html missing #preview-tab-source tab");
  assert.ok(html.includes('id="copy-template-html"'), "index.html missing #copy-template-html button");
  assert.ok(html.includes("Đánh thức không gian số"), "index.html missing 1-line Hero CTA lead");
  assert.ok(html.includes("mang dấu ấn độc bản."), "index.html missing 1-line Hero CTA accent");
  assert.ok(html.includes('id="cta-connect-plugin"'), "index.html missing uniform Kết nối Plugin capsule");
  assert.ok(html.includes('id="cta-design-website"'), "index.html missing uniform Thiết kế Website capsule");
  for (const route of ["home", "product", "solutions", "resources", "pricing"]) {
    assert.ok(html.includes(`data-route="${route}"`), `index.html missing 5-tab route ${route}`);
    assert.ok(html.includes(`data-view="${route}"`), `index.html missing platform view ${route}`);
  }

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
  assert.equal(html.includes("ai-entry-card"), false, "redundant .ai-entry-card box must be removed from finale");
  assert.ok(html.includes('id="open-intake-drawer"'), "index.html missing #open-intake-drawer trigger");
  assert.ok(html.includes('class="intake-modal hidden" id="intake-modal"'), "index.html must keep #intake-modal closed by default");

  const css = readText("public/app.css");
  assert.equal(css.includes("prism-ribbons-svg"), false, "app.css must not contain removed prism-ribbons-svg rules");
  assert.equal(css.includes("orbital-ring"), false, "app.css must not contain removed orbital-ring rules");
  assert.equal(css.includes("ai-entry-card"), false, "app.css must not contain removed ai-entry-card rules");
  assert.match(
    css,
    /\.sanctuary-sculpture\s*\{[^}]*mask-image:\s*linear-gradient\(\s*180deg,\s*transparent\s+0%/s,
    "app.css .sanctuary-sculpture must enforce alpha-zero vertical top fade mask"
  );
  assert.match(
    css,
    /\.chapter-stage-villa\s*\{[^}]*mask-image:\s*linear-gradient\([^;]*#000\s+100%\s*\);/s,
    "app.css .chapter-stage-villa must keep crisp unblurred bottom horizon (#000 100%)"
  );
  assert.match(
    css,
    /\.chapter-stage-villa\s+\.chapter-video\s*\{[^}]*object-position:\s*center\s+bottom;/s,
    "app.css Video 03 must preserve natural bottom pixel row (object-position: center bottom)"
  );
  assert.match(
    css,
    /\.hero-stage\s*\{[^}]*mask-image:\s*linear-gradient\(\s*180deg,\s*#000\s+0%,\s*#000\s+93%/s,
    "app.css .hero-stage must keep solid #000 mask down to 93% for zero Frame-1 foot bleed"
  );
  assert.match(
    css,
    /\.chapter-villa\s*\{[^}]*margin-top:\s*0;[^}]*border-bottom:\s*0;/s,
    "app.css .chapter-villa must enforce margin-top: 0 and border-bottom: 0 for seamless obsidian coping merge"
  );
  assert.match(
    css,
    /\.sanctuary-world\s*\{[^}]*margin-top:\s*0;[^}]*min-height:\s*100svh;[^}]*rgba\(3,\s*10,\s*13,\s*0\.56\)\s+0%[^}]*rgba\(4,\s*24,\s*22,\s*0\.14\)\s+14%[^}]*rgba\(4,\s*26,\s*24,\s*0\.18\)\s+68%[^}]*url\("\/assets\/basalt-terrace-deck\.webp"\)/s,
    "app.css .sanctuary-world must start cleanly at margin-top: 0 with min-height: 100svh, v5.3 nocturnal jade-abyss overlay, and real /assets/basalt-terrace-deck.webp"
  );
  assert.ok(css.includes("--flare-intensity"), "app.css must define --flare-intensity for Video 01 seamless loop flare");
  assert.ok(css.includes(".hero-starfield"), "app.css must style .hero-starfield multi-depth SVG starfield");
  assert.ok(css.includes(".hero-manifesto-dock"), "app.css must style .hero-manifesto-dock inside Frame 1");
  assert.equal(css.includes(".mist-bridge-12"), false, "app.css must not contain removed opaque .mist-bridge-12 section");
  assert.match(
    css,
    /\.chapter-botanical\s*\{[^}]*margin-top:\s*0;/s,
    "app.css .chapter-botanical must use margin-top: 0 (zero negative overlap bleed into Frame 1)"
  );
  assert.doesNotMatch(
    css,
    /\.chapter-botanical\s*\{[^}]*margin-top:\s*-/s,
    "app.css .chapter-botanical must never use negative margin-top"
  );
  assert.match(
    css,
    /\.footer-links\s*\{[^}]*flex-shrink:\s*0;/s,
    "app.css .footer-links must enforce flex-shrink: 0 for single-line desktop footer"
  );
  assert.match(
    css,
    /\.footer-links\s+a\s*\{[^}]*white-space:\s*nowrap;/s,
    "app.css .footer-links a must enforce white-space: nowrap for single-line desktop footer links"
  );
  assert.ok(css.includes(".terrace-coping-sheen"), "app.css must define .terrace-coping-sheen basalt continuation");
  assert.ok(css.includes(".terrace-basalt-grid"), "app.css must define .terrace-basalt-grid mineral terrace");
  assert.ok(css.includes(".pill-neon-capsule"), "app.css must define uniform .pill-neon-capsule buttons");
  assert.ok(css.includes("#34E8B4"), "app.css must define neon jade-aqua hover glow #34E8B4");

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
  assert.ok(js.includes("--flare-intensity"), "app.js must drive --flare-intensity on Video 01 loop seam");
  assert.ok(js.includes("--flare-progress"), "app.js must drive --flare-progress on Video 01 loop seam");
  assert.match(js, /function\s+initHomeFrameSnap\s*\(/, "app.js must define initHomeFrameSnap() frame-locked scroll engine");
  assert.ok(js.includes('"wheel"') && js.includes('"PageDown"') && js.includes('"PageUp"'), "app.js initHomeFrameSnap must wire wheel, PageDown, and PageUp navigation");
  assert.doesNotMatch(js, /\binnerHTML\b/, "app.js must strictly forbid innerHTML (safe DOM creation only)");
  assert.equal(js.includes("reel03-infinity-canvas"), false, "app.js must not reference removed fake canvas");
});

test("HTTP allowlist serves all 9 assets (5 WebP + 4 MP4) on root and basePath and rejects traversal or unknown assets", async () => {
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
