import test from "node:test";
import assert from "node:assert/strict";
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
  /\bAGPL\b|\bH[123]\b|KIT[_ -]?[ABC]|CAP\.WEB\.|MODEL_SESSION_PRIVATE|Pyodide|SQLite|GLOW-WEB-FACTORY|Kim sinh Thủy sinh Mộc/iu;

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
