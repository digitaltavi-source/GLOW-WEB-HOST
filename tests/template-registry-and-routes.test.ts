import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TEMPLATE_ID_PATTERN,
  TEMPLATE_LICENSE,
  TEMPLATE_REGISTRY_SCHEMA_VERSION,
  getTemplateById,
  isValidTemplateId,
  queryTemplates,
} from "../src/template-registry.js";
import { hostFixture, fetchHttpHandler } from "./http-fixture.js";

const EXPECTED_TEMPLATE_IDS = [
  "coastal-glass-architecture",
  "botanical-wellness-sanctuary",
  "ocean-obsidian-ai-platform",
  "atelier-maison-luxury",
  "azure-horizon-resort",
  "jade-botanical-skincare",
  "silver-prism-creative-studio",
  "calm-sea-fine-dining",
  "serene-clinic-medical",
  "monolith-advisory-legal",
  "kinetic-academy-edtech",
  "veranda-interior-atelier",
] as const;

const ALLOWED_LOCAL_IMAGES = new Set([
  "/assets/hero-ocean-jade.webp",
  "/assets/reel-01-botanical.webp",
  "/assets/reel-02-coastal-villa.webp",
  "/assets/reel-03-liquid-prism.webp",
]);

const ALLOWED_LOCAL_VIDEOS = new Set([
  "/assets/hero-ocean-jade.mp4",
  "/assets/reel-01-botanical.mp4",
  "/assets/reel-02-coastal-villa.mp4",
  "/assets/reel-03-liquid-prism.mp4",
]);

const FORBIDDEN_INTERNAL_OR_LICENSE_RE =
  /\bAGPL\b|(?<!<\/?)\bH[123]\b(?!>)|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE|Pyodide|SQLite|GLOW-WEB-FACTORY|Kim sinh Thủy sinh Mộc/u;

test("NORMAL: cleanroom template registry validates 12 bilingual templates with VF-001 IDs, local assets, and zero AGPL or process leaks", () => {
  const srcText = readFileSync(resolve(process.cwd(), "src/template-registry.ts"), "utf8");
  assert.equal(srcText.includes("\r"), false, "src/template-registry.ts must be LF-only");
  assert.doesNotMatch(srcText, FORBIDDEN_INTERNAL_OR_LICENSE_RE, "registry source must not contain AGPL or private process jargon");

  const res = queryTemplates();
  assert.equal(res.ok, true);
  assert.equal(res.schema_version, TEMPLATE_REGISTRY_SCHEMA_VERSION);
  assert.equal(res.mcp_resource, "/mcp-v2");
  assert.ok(res.total >= 12, "must expose at least 12 templates");
  assert.equal(res.templates.length, 12);
  assert.equal(res.industries.length, 12);

  const ids = res.templates.map((t) => t.id);
  for (const expectedId of EXPECTED_TEMPLATE_IDS) {
    assert.ok(ids.includes(expectedId), `missing required template ${expectedId}`);
  }

  let featuredCount = 0;
  for (const tpl of res.templates) {
    assert.ok(TEMPLATE_ID_PATTERN.test(tpl.id), `invalid VF-001 id: ${tpl.id}`);
    assert.equal(isValidTemplateId(tpl.id), true);
    assert.equal(tpl.schema_version, "1.0.0");
    assert.equal(tpl.status, "published");
    assert.equal(tpl.license, TEMPLATE_LICENSE);
    assert.equal(tpl.mcp_compatible, true);
    assert.ok(ALLOWED_LOCAL_IMAGES.has(tpl.preview_image), `non-allowlisted image ${tpl.preview_image}`);
    assert.ok(ALLOWED_LOCAL_VIDEOS.has(tpl.preview_video), `non-allowlisted video ${tpl.preview_video}`);
    assert.ok(tpl.blocks.length >= 5, `${tpl.id} must have >= 5 structured blocks`);
    assert.ok(tpl.vi.title.length > 0 && tpl.en.title.length > 0);
    assert.ok(tpl.vi.highlights.length >= 3 && tpl.en.highlights.length >= 3);
    if (tpl.featured) featuredCount += 1;

    const serialized = JSON.stringify(tpl);
    assert.doesNotMatch(serialized, /https?:\/\//i, `${tpl.id} must not reference external URLs`);
    assert.doesNotMatch(serialized, FORBIDDEN_INTERNAL_OR_LICENSE_RE, `${tpl.id} contains forbidden jargon`);
  }
  assert.ok(featuredCount >= 4 && featuredCount <= 6, `expected 4-6 featured templates, got ${featuredCount}`);

  const coastal = queryTemplates({ mood: "coastal" });
  assert.ok(coastal.total >= 4);
  assert.ok(coastal.templates.every((t) => t.mood === "coastal"));

  const saas = queryTemplates({ industry: "saas-ai" });
  assert.equal(saas.total, 1);
  assert.equal(saas.templates[0]?.id, "ocean-obsidian-ai-platform");

  const featured = queryTemplates({ featuredOnly: true });
  assert.equal(featured.total, featuredCount);
  assert.ok(featured.templates.every((t) => t.featured));
});

test("FAILURE & ADVERSARIAL unit checks reject unknown and malformed VF-001 template IDs", () => {
  const notFound = getTemplateById("does-not-exist-yet");
  assert.equal(notFound.ok, false);
  if (!notFound.ok) {
    assert.equal(notFound.status, 404);
    assert.equal(notFound.code, "TEMPLATE_NOT_FOUND");
  }

  for (const badId of [
    "",
    "a",
    "UpperCase-Id",
    "../package.json",
    "bad_underscore",
    "-leading-dash",
    "space in id",
    "x".repeat(65),
  ]) {
    assert.equal(isValidTemplateId(badId), false, `expected invalid id: ${badId}`);
    const result = getTemplateById(badId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.code, "INVALID_TEMPLATE_ID");
    }
  }
});

test("HTTP Four-Path (NORMAL / FAILURE / ADVERSARIAL / RECOVERY) for /api/templates, /api/templates/:id, and 5-tab SPA routes on root and basePath", async () => {
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
          // 1. NORMAL: direct SPA multi-routes return 200 HTML with 5-tab platform views
          for (const route of ["/product", "/solutions", "/resources", "/pricing"]) {
            const pageRes = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}${route}`);
            assert.equal(pageRes.status, 200, `${prefix}${route} must return 200`);
            assert.match(pageRes.headers.get("content-type") || "", /text\/html/i);
            const html = await pageRes.text();
            assert.ok(html.includes('id="view-product"'));
            assert.ok(html.includes('id="view-solutions"'));
            assert.ok(html.includes('id="view-resources"'));
            assert.ok(html.includes('id="view-pricing"'));
          }

          // 1. NORMAL: /api/templates & /api/templates/:id
          const listRes = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}/api/templates`);
          assert.equal(listRes.status, 200);
          const listBody = (await listRes.json()) as {
            ok: boolean;
            schema_version: string;
            total: number;
            mcp_resource: string;
            templates: Array<{ id: string }>;
          };
          assert.equal(listBody.ok, true);
          assert.equal(listBody.schema_version, "1.0.0");
          assert.equal(listBody.total, 12);
          assert.equal(listBody.mcp_resource, "/mcp-v2");
          assert.equal(listBody.templates.length, 12);

          const filteredRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates?mood=botanical&featured=true`
          );
          assert.equal(filteredRes.status, 200);
          const filteredBody = (await filteredRes.json()) as { total: number; templates: Array<{ mood: string; featured: boolean }> };
          assert.ok(filteredBody.total >= 2);
          assert.ok(filteredBody.templates.every((t) => t.mood === "botanical" && t.featured));

          const detailRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/coastal-glass-architecture`
          );
          assert.equal(detailRes.status, 200);
          const detailBody = (await detailRes.json()) as { ok: boolean; schema_version: string; template: { id: string } };
          assert.equal(detailBody.ok, true);
          assert.equal(detailBody.schema_version, "1.0.0");
          assert.equal(detailBody.template.id, "coastal-glass-architecture");

          // 2. FAILURE: unknown valid-format ID -> 404; unmatched search -> 200 empty array
          const missingRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/unknown-template-id`
          );
          assert.equal(missingRes.status, 404);
          const missingBody = (await missingRes.json()) as { ok: boolean; error: string };
          assert.equal(missingBody.ok, false);
          assert.equal(missingBody.error, "TEMPLATE_NOT_FOUND");

          const noMatchRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates?q=zzzz-no-template-matches`
          );
          assert.equal(noMatchRes.status, 200);
          const noMatchBody = (await noMatchRes.json()) as { ok: boolean; total: number; templates: unknown[] };
          assert.equal(noMatchBody.ok, true);
          assert.equal(noMatchBody.total, 0);
          assert.deepEqual(noMatchBody.templates, []);

          // 3. ADVERSARIAL: malformed/traversal/uppercase/oversized IDs -> 400; raw traversal -> 404
          for (const badId of [
            "%2e%2e%2fpackage.json",
            "Coastal-Glass",
            "a",
            "bad_underscore",
            "-leading-dash",
            "x".repeat(65),
          ]) {
            const badRes = await fetchHttpHandler(
              app,
              `http://127.0.0.1:3100${prefix}/api/templates/${badId}`
            );
            assert.equal(badRes.status, 400, `adversarial id ${badId} on ${prefix} must return 400`);
            const badBody = (await badRes.json()) as { ok: boolean; error: string };
            assert.equal(badBody.ok, false);
            assert.equal(badBody.error, "INVALID_TEMPLATE_ID");
          }

          const traversalRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/../package.json`
          );
          assert.equal(traversalRes.status, 404);

          const arrayQueryRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates?q=coastal&q=extra&industry=nonexistent`
          );
          assert.equal(arrayQueryRes.status, 200);
          const arrayQueryBody = (await arrayQueryRes.json()) as { ok: boolean; total: number };
          assert.equal(arrayQueryBody.ok, true);
          assert.equal(arrayQueryBody.total, 0);

          // 4. RECOVERY: valid requests succeed cleanly after failure & adversarial probes
          const recoverList = await fetchHttpHandler(app, `http://127.0.0.1:3100${prefix}/api/templates`);
          assert.equal(recoverList.status, 200);
          const recoverListBody = (await recoverList.json()) as { ok: boolean; total: number };
          assert.equal(recoverListBody.ok, true);
          assert.equal(recoverListBody.total, 12);

          const recoverItem = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/botanical-wellness-sanctuary`
          );
          assert.equal(recoverItem.status, 200);
          const recoverItemBody = (await recoverItem.json()) as { ok: boolean; template: { id: string } };
          assert.equal(recoverItemBody.ok, true);
          assert.equal(recoverItemBody.template.id, "botanical-wellness-sanctuary");
        }
      } finally {
        await handler.close();
      }
    }
  );
});

const EXPECTED_RENDER_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'";

test("HTTP Four-Path (NORMAL / FAILURE / ADVERSARIAL / RECOVERY) for /api/templates/:id/render and /api/templates/:id/source on root and basePath", async () => {
  const rendererSrc = readFileSync(resolve(process.cwd(), "src/template-renderer.ts"), "utf8");
  assert.equal(rendererSrc.includes("\r"), false, "src/template-renderer.ts must be LF-only");
  assert.doesNotMatch(
    rendererSrc,
    FORBIDDEN_INTERNAL_OR_LICENSE_RE,
    "src/template-renderer.ts must not contain AGPL or private process leaks"
  );

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
          // 1. NORMAL: all 12 templates render distinct industry HTML + structured JSON source
          const renderedHashes = new Set<string>();
          for (const id of EXPECTED_TEMPLATE_IDS) {
            const renderRes = await fetchHttpHandler(
              app,
              `http://127.0.0.1:3100${prefix}/api/templates/${id}/render`
            );
            assert.equal(renderRes.status, 200, `${prefix}/api/templates/${id}/render must return 200`);
            assert.match(renderRes.headers.get("content-type") || "", /text\/html/i);
            assert.equal(renderRes.headers.get("x-frame-options"), "SAMEORIGIN");
            assert.equal(renderRes.headers.get("content-security-policy"), EXPECTED_RENDER_CSP);
            const html = await renderRes.text();
            assert.ok(html.startsWith("<!DOCTYPE html>"), `${id} render must start with DOCTYPE`);
            assert.ok(html.includes(`data-template-id="${id}"`), `${id} render missing data-template-id`);
            assert.equal(html.includes("/assets/reel-"), false, `${id} render must not reuse video posters`);
            assert.equal(html.includes("/assets/hero-"), false, `${id} render must not reuse hero posters`);
            assert.doesNotMatch(html, /<script\b/i, `${id} render must stay script-free`);
            assert.doesNotMatch(html, /https?:\/\//i, `${id} render must not load external CDNs`);
            assert.doesNotMatch(html, FORBIDDEN_INTERNAL_OR_LICENSE_RE, `${id} render leaked internal terms`);
            renderedHashes.add(createHash("sha256").update(html).digest("hex"));

            const sourceRes = await fetchHttpHandler(
              app,
              `http://127.0.0.1:3100${prefix}/api/templates/${id}/source`
            );
            assert.equal(sourceRes.status, 200, `${prefix}/api/templates/${id}/source must return 200`);
            const sourceBody = (await sourceRes.json()) as {
              ok: boolean;
              schema_version: string;
              id: string;
              license: string;
              source_inspiration: string;
              blocks: unknown[];
              html: string;
              design_tokens: { surface_bg: string; accent: string };
            };
            assert.equal(sourceBody.ok, true);
            assert.equal(sourceBody.schema_version, "1.0.0");
            assert.equal(sourceBody.id, id);
            assert.equal(sourceBody.license, TEMPLATE_LICENSE);
            assert.ok(sourceBody.source_inspiration.length > 0);
            assert.ok(Array.isArray(sourceBody.blocks) && sourceBody.blocks.length >= 5);
            assert.ok(sourceBody.html.includes("<!DOCTYPE html>"));
            assert.ok(sourceBody.design_tokens.surface_bg.startsWith("#"));
            assert.ok(sourceBody.design_tokens.accent.startsWith("#"));
          }
          assert.equal(
            renderedHashes.size,
            12,
            `all 12 templates on ${prefix || "root"} must render 12 genuinely distinct HTML documents`
          );

          // NORMAL bilingual & brand/brief customization check
          const enCustomRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/serene-clinic-medical/render?lang=en&brand=TestBrand&brief=CustomBriefNote`
          );
          assert.equal(enCustomRes.status, 200);
          const enCustomHtml = await enCustomRes.text();
          assert.ok(enCustomHtml.includes('<html lang="en">'));
          assert.ok(enCustomHtml.includes("TestBrand"));
          assert.ok(enCustomHtml.includes("CustomBriefNote"));

          // 2. FAILURE: unknown valid-format ID -> 404 on /render and /source
          for (const suffix of ["render", "source"]) {
            const missingRes = await fetchHttpHandler(
              app,
              `http://127.0.0.1:3100${prefix}/api/templates/unknown-template-id/${suffix}`
            );
            assert.equal(missingRes.status, 404, `unknown id /${suffix} must return 404`);
            const missingBody = (await missingRes.json()) as { ok: boolean; error: string };
            assert.equal(missingBody.ok, false);
            assert.equal(missingBody.error, "TEMPLATE_NOT_FOUND");
          }

          // 3. ADVERSARIAL: malformed/traversal IDs -> 400; XSS query overrides strictly escaped
          for (const badId of ["%2e%2e%2fpackage.json", "BadUpper", "a", "bad_id", "-dash"]) {
            for (const suffix of ["render", "source"]) {
              const badRes = await fetchHttpHandler(
                app,
                `http://127.0.0.1:3100${prefix}/api/templates/${badId}/${suffix}`
              );
              assert.equal(badRes.status, 400, `adversarial id ${badId}/${suffix} must return 400`);
              const badBody = (await badRes.json()) as { ok: boolean; error: string };
              assert.equal(badBody.ok, false);
              assert.equal(badBody.error, "INVALID_TEMPLATE_ID");
            }
          }

          const xssBrand = encodeURIComponent("<script>alert(1)</script>");
          const xssBrief = encodeURIComponent('"><img src=x onerror=alert(1)>');
          const xssRenderRes = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/ocean-obsidian-ai-platform/render?brand=${xssBrand}&brief=${xssBrief}`
          );
          assert.equal(xssRenderRes.status, 200);
          const xssHtml = await xssRenderRes.text();
          assert.ok(xssHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "XSS script payload must be HTML-escaped");
          assert.equal(xssHtml.includes("<script>"), false, "raw <script> must never appear in rendered output");
          assert.equal(xssHtml.includes("<img "), false, "raw <img tag must never appear in rendered output");

          // 4. RECOVERY: valid /render and /source succeed cleanly after failure & adversarial probes
          const recRender = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/jade-botanical-skincare/render?lang=vi`
          );
          assert.equal(recRender.status, 200);
          assert.ok((await recRender.text()).includes('data-template-id="jade-botanical-skincare"'));

          const recSource = await fetchHttpHandler(
            app,
            `http://127.0.0.1:3100${prefix}/api/templates/jade-botanical-skincare/source?lang=en`
          );
          assert.equal(recSource.status, 200);
          const recSourceBody = (await recSource.json()) as { ok: boolean; id: string; html: string };
          assert.equal(recSourceBody.ok, true);
          assert.equal(recSourceBody.id, "jade-botanical-skincare");
          assert.ok(recSourceBody.html.includes('<html lang="en">'));
        }
      } finally {
        await handler.close();
      }
    }
  );
});
