import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { resetCombinedRuntimeCacheForTest } from "../src/backend.js";
import {
  BESPOKE_BINARY_ALLOWED_EXTENSIONS,
  EvaluateAestheticTqcArgsSchema,
  ExecuteBespokeRefinementPinSchema,
  ExecuteBespokeWebsiteArgsSchema,
  NextFactoryControlInputSchema,
  PlanMediaProviderRouteArgsSchema,
  isSafeBespokeBinaryRelPath,
  isSafeBespokeRelPath,
  isSafeVisualDnaRef,
} from "../src/next-factory-schema.js";
import { fetchHttpHandler, hostFixture } from "./http-fixture.js";

const VALID_BUNDLE_ARGS = {
  slug: "son-tra-pavilion-demo",
  brief: {
    brand_name: "Sơn Trà Pavilion",
    industry: "COASTAL_REGENERATIVE_ARCHITECTURE",
    art_direction_thesis: "Warm limestone cantilever with passive sea-breeze microclimate SVG diagrams.",
    locale: "vi-VN",
  },
  files: {
    "index.html": "<!doctype html><html lang='vi'><body><h1>Sơn Trà</h1></body></html>",
    "styles.css": ":root { --bg-primary: #F5F1E8; }",
    "app.js": "(function(){ document.addEventListener('keydown', function(){}); })();",
  },
};

test("execute_bespoke_website schema accepts valid bundle and sets safe defaults", () => {
  const parsed = NextFactoryControlInputSchema.parse({
    action: "execute_bespoke_website",
    args: VALID_BUNDLE_ARGS,
    role: "client",
    locale: "vi-VN",
  });
  assert.equal(parsed.action, "execute_bespoke_website");
  if (parsed.action === "execute_bespoke_website") {
    assert.equal(parsed.args.brief.execution_profile, "DEMO_BOUNDED");
    assert.equal(parsed.args.run_browser_tqc, true);
  }
});

test("execute_bespoke_website rejects path traversal, empty, too-few, too-many, and oversized files", () => {
  for (const badPath of [
    "../evil.html",
    "assets/../../etc/passwd",
    "/etc/passwd",
    "//double-slash.html",
    "dir\\win.html",
    "./dot.html",
  ]) {
    assert.equal(isSafeBespokeRelPath(badPath), false, `Expected unsafe path rejected: ${badPath}`);
    const badRes = ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: {
        ...VALID_BUNDLE_ARGS.files,
        [badPath]: "bad",
      },
    });
    assert.equal(badRes.success, false, `Expected Zod rejection for ${badPath}`);
  }

  // Invalid slug
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      slug: "../escape-slug",
    }).success,
    false
  );

  // Too few files (< 3)
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: { "index.html": "<html/>", "styles.css": "body{}" },
    }).success,
    false
  );

  // Empty file content
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: { ...VALID_BUNDLE_ARGS.files, "app.js": "" },
    }).success,
    false
  );

  // Too many files (> 24)
  const manyFiles: Record<string, string> = {};
  for (let i = 0; i < 25; i++) {
    manyFiles[`file_${i}.txt`] = "ok";
  }
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: manyFiles,
    }).success,
    false
  );

  // Oversized single file (> 350_000 chars)
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: {
        ...VALID_BUNDLE_ARGS.files,
        "index.html": "a".repeat(350_001),
      },
    }).success,
    false
  );
});

test("execute_bespoke_website rejects disallowed extensions, dotfiles, reserved engine paths, and oversized total bundle", () => {
  for (const badPath of [
    "shell.py",
    "exploit.sh",
    "backdoor.php",
    ".htaccess",
    ".env",
    "assets/.hidden.svg",
    "MANIFEST.sha256",
    "manifest.sha256",
    "FACTORY_LINEAGE_AND_RECEIPTS.json",
    "site-manifest.json",
    "provenance-seal.json",
    "tqc_screenshots/01.png",
    "tqc_screenshots/evil.svg",
    "son-tra-deliverable.zip",
    "archive.zip",
    "module.mjs",
    "payload.xhtml",
    "data.xml",
    "page.htm",
  ]) {
    assert.equal(isSafeBespokeRelPath(badPath), false, `Expected disallowed path rejected: ${badPath}`);
    const res = ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      files: {
        ...VALID_BUNDLE_ARGS.files,
        [badPath]: "bad",
      },
    });
    assert.equal(res.success, false, `Expected Zod rejection for disallowed path ${badPath}`);
  }

  // Allowed extensions pass
  for (const goodPath of [
    "index.html",
    "styles.css",
    "app.js",
    "assets/logo.svg",
    "data/specs.json",
    "robots.txt",
    "site.webmanifest",
  ]) {
    assert.equal(isSafeBespokeRelPath(goodPath), true, `Expected allowed path accepted: ${goodPath}`);
  }

  // Oversized total bundle (> 3_500_000 UTF-8 bytes) across valid per-file sizes
  const oversizedFiles: Record<string, string> = {
    "index.html": VALID_BUNDLE_ARGS.files["index.html"],
    "styles.css": VALID_BUNDLE_ARGS.files["styles.css"],
    "app.js": VALID_BUNDLE_ARGS.files["app.js"],
  };
  for (let i = 0; i < 11; i++) {
    oversizedFiles[`chunk_${i}.txt`] = "x".repeat(340_000);
  }
  const oversizedRes = ExecuteBespokeWebsiteArgsSchema.safeParse({
    ...VALID_BUNDLE_ARGS,
    files: oversizedFiles,
  });
  assert.equal(oversizedRes.success, false, "Expected total bundle > 3,500,000 bytes rejected");
});

test("execute_bespoke_website accepts aligned optional brief fields from Python bridge", () => {
  const parsed = ExecuteBespokeWebsiteArgsSchema.parse({
    slug: "aura-neurolabs-medtech-svg",
    brief: {
      brand_name: "Aura NeuroLabs",
      locale: "vi-VN",
      primary_locale: "vi-VN",
      secondary_locale: "en-US",
      industry: "PRECISION_MEDTECH_AI_ROBOTICS",
      archetype: "BESPOKE-MEDTECH-CLINICAL",
      brief_id: "BRIEF-AURA-NEUROLABS-2026",
      sku: "AURA-N7-SURGICAL",
      product_code: "AURA-N7",
      product_title: "Aura NeuroLabs N7 Microsurgery Platform",
      hero_headline: "Sub-millimeter neural tremor suppression",
      hero_subheadline: "Closed-loop hardware safety lock verified in Chrome TQC.",
      business_outcome: "Qualified clinical hospital demonstration requests",
      art_direction: "Crisp clinical precision white/slate/cerulean telemetry",
      pii_fields: ["lead_name", "lead_email", "institution"],
    },
    files: VALID_BUNDLE_ARGS.files,
  });
  assert.equal(parsed.brief.sku, "AURA-N7-SURGICAL");
  assert.equal(parsed.brief.archetype, "BESPOKE-MEDTECH-CLINICAL");
  assert.equal(parsed.brief.brief_id, "BRIEF-AURA-NEUROLABS-2026");
  assert.equal(parsed.brief.execution_profile, "DEMO_BOUNDED");
});

test("glow_execute_bespoke_website tool is registered on /mcp-v2 and forwards to next_factory_control", async () => {
  const serverSource = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.match(serverSource, /registerTool\(['"]glow_execute_bespoke_website['"]/);

  const staticToken = "tok-bespoke-entry217-fixture-1234567890";
  const capturedRequests: Array<Record<string, unknown>> = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    capturedRequests.push(body);
    return new Response(
      JSON.stringify({
        request_id: body["request_id"] ?? "req-1",
        status: "accepted",
        exposure: "MODEL_SESSION_PRIVATE",
        result: {
          action: "execute_bespoke_website",
          authority: "NEXT_FACTORY_CONTROL",
          payload: {
            slug: "son-tra-pavilion-demo",
            mission_id: "NM-deadbeef1234",
            mission_state: "HUMAN_REVIEW_REQUIRED",
            release_authorized: false,
            execution_profile: "DEMO_BOUNDED",
            hard_admitted_specialist_count: 0,
            specialist_count: 12,
          },
        },
        public_evidence: [],
        errors: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    await hostFixture(
      {
        GLOW_AUTH_MODE: "static_bearer",
        GLOW_PUBLIC_TEST_BEARER_TOKEN: staticToken,
        GLOW_PUBLIC_TEST_SUBJECT: "usr_bespoke_test",
      },
      async ({ app, handler }) => {
        try {
          const listRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
            method: "POST",
            headers: {
              authorization: `Bearer ${staticToken}`,
              "content-type": "application/json",
              accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
          });
          assert.equal(listRes.status, 200);
          const listText = await listRes.text();
          assert.match(listText, /glow_execute_bespoke_website/);

          const callRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
            method: "POST",
            headers: {
              authorization: `Bearer ${staticToken}`,
              "content-type": "application/json",
              accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: {
                name: "glow_execute_bespoke_website",
                arguments: {
                  ...VALID_BUNDLE_ARGS,
                  run_browser_tqc: false,
                },
              },
            }),
          });
          assert.equal(callRes.status, 200);
          const callText = await callRes.text();
          assert.match(callText, /HUMAN_REVIEW_REQUIRED/);
          assert.equal(capturedRequests.length, 1);
          const firstReq = capturedRequests[0]!;
          assert.equal(firstReq["operation"], "next_factory_control");
          const inp = firstReq["input"] as Record<string, unknown>;
          assert.equal(inp["action"], "execute_bespoke_website");
          const fwdArgs = inp["args"] as Record<string, unknown>;
          assert.equal(fwdArgs["slug"], "son-tra-pavilion-demo");
          assert.equal(fwdArgs["run_browser_tqc"], false);
        } finally {
          await handler.close();
        }
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

const SAMPLE_VALID_WEBP_B64 =
  "UklGRi4AAABXRUJQVlA4TCEAAAAvf8JjAAdQkELUpv8BAEX6/58i+p/63//+97///e//ggAA";

test("execute_bespoke_website accepts valid binary_files_base64 + visual_tier CINEMA_MULTIMEDIA and rejects invalid payloads", () => {
  assert.equal(BESPOKE_BINARY_ALLOWED_EXTENSIONS.has(".webp"), true);
  assert.equal(BESPOKE_BINARY_ALLOWED_EXTENSIONS.has(".woff2"), true);
  assert.equal(BESPOKE_BINARY_ALLOWED_EXTENSIONS.has(".html"), false);
  assert.equal(BESPOKE_BINARY_ALLOWED_EXTENSIONS.has(".svg"), false);

  for (const goodBin of [
    "assets/hero.webp",
    "assets/poster.avif",
    "assets/still.jpg",
    "assets/still2.jpeg",
    "assets/icon.png",
    "media/reel.mp4",
    "media/reel.webm",
    "fonts/display.woff2",
  ]) {
    assert.equal(isSafeBespokeBinaryRelPath(goodBin), true, `Expected valid binary path: ${goodBin}`);
  }

  for (const badBin of [
    "../evil.webp",
    "assets/../../etc/passwd.webp",
    "/abs/hero.webp",
    "assets/.hidden.webp",
    "assets/shell.exe",
    "index.html",
    "assets/emblem.svg",
    "tqc_screenshots/01.png",
    "archive.zip",
  ]) {
    assert.equal(isSafeBespokeBinaryRelPath(badBin), false, `Expected rejected binary path: ${badBin}`);
    const parsedBadPath = ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      visual_tier: "CINEMA_MULTIMEDIA",
      binary_files_base64: { [badBin]: SAMPLE_VALID_WEBP_B64 },
    });
    assert.equal(parsedBadPath.success, false, `Expected Zod rejection for binary path ${badBin}`);
  }

  // Valid payload passes
  const validParsed = ExecuteBespokeWebsiteArgsSchema.parse({
    ...VALID_BUNDLE_ARGS,
    visual_tier: "CINEMA_MULTIMEDIA",
    binary_files_base64: {
      "assets/hero.webp": SAMPLE_VALID_WEBP_B64,
      "fonts/brand.woff2": Buffer.from("wOF2\x00\x01\x00\x00").toString("base64"),
    },
  });
  assert.equal(validParsed.visual_tier, "CINEMA_MULTIMEDIA");
  assert.equal(validParsed.binary_files_base64?.["assets/hero.webp"], SAMPLE_VALID_WEBP_B64);

  // Invalid visual_tier fails closed
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      visual_tier: "UNTRUSTED_TIER",
    }).success,
    false
  );

  // Invalid base64 fails closed
  for (const badB64 of ["not!valid!base64", "abc", "====", "aGVsbG8"]) {
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        binary_files_base64: { "assets/hero.webp": badB64 },
      }).success,
      false,
      `Expected invalid base64 rejected: ${badB64}`
    );
  }

  // Oversized single binary file (> 4,000,000 decoded bytes) fails closed
  const singleOversizeB64 = Buffer.alloc(4_000_001, 0x41).toString("base64");
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      binary_files_base64: { "assets/huge.webp": singleOversizeB64 },
    }).success,
    false
  );

  // Oversized total binary payload (> 8,000,000 decoded bytes across <= 4MB files) fails closed
  const threeMbB64 = Buffer.alloc(3_000_000, 0x42).toString("base64");
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      binary_files_base64: {
        "assets/a.webp": threeMbB64,
        "assets/b.webp": threeMbB64,
        "assets/c.webp": threeMbB64,
      },
    }).success,
    false
  );
});

test("glow_execute_bespoke_website forwards binary_files_base64 and visual_tier over /mcp-v2", async () => {
  const staticToken = "tok-bespoke-entry218b-mm-1234567890";
  const capturedRequests: Array<Record<string, unknown>> = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    capturedRequests.push(body);
    return new Response(
      JSON.stringify({
        request_id: body["request_id"] ?? "req-mm-1",
        status: "accepted",
        exposure: "MODEL_SESSION_PRIVATE",
        result: {
          action: "execute_bespoke_website",
          authority: "NEXT_FACTORY_CONTROL",
          payload: {
            slug: "son-tra-pavilion-demo",
            mission_id: "NM-112233445566",
            mission_state: "HUMAN_REVIEW_REQUIRED",
            release_authorized: false,
            execution_profile: "DEMO_BOUNDED",
            hard_admitted_specialist_count: 0,
            specialist_count: 12,
          },
        },
        public_evidence: [],
        errors: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    await hostFixture(
      {
        GLOW_AUTH_MODE: "static_bearer",
        GLOW_PUBLIC_TEST_BEARER_TOKEN: staticToken,
        GLOW_PUBLIC_TEST_SUBJECT: "usr_bespoke_mm_test",
      },
      async ({ app, handler }) => {
        try {
          const callRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
            method: "POST",
            headers: {
              authorization: `Bearer ${staticToken}`,
              "content-type": "application/json",
              accept: "application/json, text/event-stream",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 218,
              method: "tools/call",
              params: {
                name: "glow_execute_bespoke_website",
                arguments: {
                  ...VALID_BUNDLE_ARGS,
                  visual_tier: "CINEMA_MULTIMEDIA",
                  binary_files_base64: {
                    "assets/hero.webp": SAMPLE_VALID_WEBP_B64,
                  },
                  run_browser_tqc: false,
                },
              },
            }),
          });
          assert.equal(callRes.status, 200);
          const callText = await callRes.text();
          assert.match(callText, /HUMAN_REVIEW_REQUIRED/);
          assert.equal(capturedRequests.length, 1);
          const inp = capturedRequests[0]!["input"] as Record<string, unknown>;
          const fwdArgs = inp["args"] as Record<string, unknown>;
          assert.equal(fwdArgs["visual_tier"], "CINEMA_MULTIMEDIA");
          assert.deepEqual(fwdArgs["binary_files_base64"], {
            "assets/hero.webp": SAMPLE_VALID_WEBP_B64,
          });
        } finally {
          await handler.close();
        }
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("execute_bespoke_website accepts rich F-218C-06 optional brief fields while rejecting unknown strict keys and out-of-bounds payloads", () => {
  const richNumeric = ExecuteBespokeWebsiteArgsSchema.parse({
    slug: "lumiere-horlogerie-bespoke-svg",
    brief: {
      brand_name: "LUMIÈRE HORLOGERIE",
      locale: "vi-VN",
      primary_locale: "vi-VN",
      secondary_locale: "en-US",
      industry: "BESPOKE_LUXURY_HOROLOGY",
      archetype: "BESPOKE-LUXURY-HOROLOGY",
      brief_id: "BRIEF-ENTRY218C-LUMIERE-LH09",
      sku: "LH09-ASTROLABE-BESPOKE-01",
      product_code: "CALIBER LH-09",
      product_title: "LUMIÈRE HORLOGERIE — Caliber LH-09",
      hero_headline: "Nghệ Thuật Chế Tác Đồng Hồ & Ánh Sáng Cơ Học",
      hero_subheadline: "Ba tác phẩm SVG động nguyên bản và kiểm định Chrome TQC.",
      business_outcome: "Acquire private salon appointments with explicit S12 PII consent.",
      visual_tier: "SVG_BESPOKE",
      cms_material: true,
      price_usd: 148_000,
      users: [
        "Nhà sưu tầm Haute Horlogerie Việt Nam & quốc tế",
        "Giám tuyển mỹ thuật chế tác cơ khí tinh xảo",
      ],
      palette: {
        bg_primary: "#06090F",
        bg_elevated: "#0E1420",
        accent_primary: "#D8B878",
        accent_secondary: "#38D3A2",
        text_primary: "#F6F3EC",
        text_muted: "#B4BCCB",
      },
      typography: {
        heading_font: "Cormorant Garamond, Playfair Display, Georgia, serif",
        sans_font: "Be Vietnam Pro, Inter, system-ui, sans-serif",
        mono_font: "JetBrains Mono, monospace",
        scale_ratio: 1.333,
        vi_line_height: 1.65,
      },
      core_journey: {
        trigger: "Patron inspects kinetic Tourbillon SVG and 4-layer blueprint",
        actor: "Haute Horlogerie Collector",
        true_completion: "Books private salon viewing with S12 consent",
      },
      proof_cards: [
        {
          code: "LH09-CRAFT-01",
          metric: "0.29g Titanium",
          title: "Lồng Tourbillon Hai Cầu",
          summary: "60 vạch phút khắc tia chuẩn 3Hz.",
        },
      ],
      interactive_module: {
        module_id: "LUMIERE_CHRONOMETER_RESONANCE_SOLVER",
        title: "Bộ Mô Phỏng Đẳng Thời Caliber LH-09",
        inputs: [{ id: "freq-hz", label: "Tần số (Hz)", min: 2.5, max: 5.0, default: 3.0 }],
      },
      cta: {
        section_id: "salon-consultation",
        submit_label: "Đặt Lịch Thưởng Lãm Tại Private Salon",
        privacy_notice: "Bảo vệ theo Nghị định 13/2023/NĐ-CP & S12.",
      },
      pii_fields: ["lead_name", "lead_email", "lead_salon"],
    },
    files: {
      ...VALID_BUNDLE_ARGS.files,
      "content-model.json": JSON.stringify({ schema: "GLOW_CMS_CONTENT_MODEL_V1" }),
    },
  });
  assert.equal(richNumeric.brief.cms_material, true);
  assert.equal(richNumeric.brief.price_usd, 148_000);

  // String/array variants for users, palette, core_journey, interactive_module, cta, and decimal price_usd
  const richAltVariants = ExecuteBespokeWebsiteArgsSchema.parse({
    slug: "vernon-luan-flagship-v2",
    brief: {
      brand_name: "Vernon Luân",
      cms_material: true,
      price_usd: "12000.00",
      users: "Hospitality Founders & Executive Partners",
      palette: ["#060B14", "#D4AF6A", "#F4F1EA"],
      core_journey: ["Explore 4 chapters", "Inspect 17 cinema milestones", "Connect directly"],
      interactive_module: "Chapter Filter & Cinema Lightbox",
      cta: "Kết Nối Trực Tiếp Cùng Vernon Luân",
    },
    files: VALID_BUNDLE_ARGS.files,
  });
  assert.equal(richAltVariants.brief.price_usd, "12000.00");

  // Unknown bogus key MUST still fail .strict()
  const bogusKeyRes = ExecuteBespokeWebsiteArgsSchema.safeParse({
    ...VALID_BUNDLE_ARGS,
    brief: {
      ...VALID_BUNDLE_ARGS.brief,
      bogus_unbounded_key: "must_be_rejected_by_strict",
    },
  });
  assert.equal(bogusKeyRes.success, false, "Expected unknown brief key rejected by .strict()");

  // Out-of-bounds price_usd (> 10,000,000) MUST fail
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: { ...VALID_BUNDLE_ARGS.brief, price_usd: 10_000_001 },
    }).success,
    false
  );
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: { ...VALID_BUNDLE_ARGS.brief, price_usd: "15000000.00" },
    }).success,
    false
  );
});

test("ENTRY220: ExecuteBespokeWebsiteBriefSchema validates studio loop, chrome budget, visual_dna_refs, cinema_media_material, and refinement_pins strictly", () => {
  const validStudioBrief = ExecuteBespokeWebsiteArgsSchema.parse({
    slug: "saigon-atelier-ceramic-2026",
    brief: {
      brand_name: "Saigon Atelier Ceramic",
      locale: "vi-VN",
      primary_audience_action: "Book a private architectural tea tasting & ceramic viewing",
      chrome_budget: "GALLERY_ZERO_CHROME",
      studio_loop_mode: "FAST_CREATIVE_STUDIO",
      visual_dna_refs: ["refs/celadon-glaze.webp", "refs/kiln-light-study.png"],
      cinema_media_material: false,
      refinement_pins: [
        {
          pin_id: "pin-01",
          viewport: "desktop_1440",
          region: "hero_above_fold",
          x_pct: 48.5,
          y_pct: 28.0,
          note: "Increase breathing room above headline and soften celadon tint",
        },
        {
          pin_id: "pin-02",
          viewport: "mobile_390",
          region: "detail_panel",
          x_pct: 52.0,
          y_pct: 78.4,
          note: "Align dossier cards cleanly with 16px horizontal rhythm",
        },
      ],
    },
    files: VALID_BUNDLE_ARGS.files,
  });
  assert.equal(validStudioBrief.brief.chrome_budget, "GALLERY_ZERO_CHROME");
  assert.equal(validStudioBrief.brief.studio_loop_mode, "FAST_CREATIVE_STUDIO");
  assert.equal(validStudioBrief.brief.cinema_media_material, false);
  assert.equal(validStudioBrief.brief.refinement_pins?.length, 2);

  // Reject invalid visual_dna_refs (path traversal, absolute path, URL, dotfiles)
  for (const badRef of [
    "../secret.png",
    "/etc/passwd",
    "https://evil.example/a.png",
    "refs/.hidden.webp",
    "refs//double.png",
    "refs\\win.png",
  ]) {
    assert.equal(isSafeVisualDnaRef(badRef), false, `Expected unsafe visual_dna_ref rejected: ${badRef}`);
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, visual_dna_refs: [badRef] },
      }).success,
      false
    );
  }

  // Reject >8 visual_dna_refs
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: {
        ...VALID_BUNDLE_ARGS.brief,
        visual_dna_refs: Array.from({ length: 9 }, (_, i) => `refs/ref-${i}.webp`),
      },
    }).success,
    false
  );

  // Reject malformed / out-of-range / unknown-key refinement_pins
  for (const badPin of [
    { pin_id: "pin-01", viewport: "desktop_1440", region: "hero_above_fold", x_pct: -1, y_pct: 20, note: "neg x" },
    { pin_id: "pin-01", viewport: "desktop_1440", region: "hero_above_fold", x_pct: 50, y_pct: 100.1, note: "gt 100 y" },
    { pin_id: "pin-01", viewport: "tablet_768", region: "hero_above_fold", x_pct: 50, y_pct: 50, note: "bad vp" },
    { pin_id: "pin-01", viewport: "desktop_1440", region: "unknown_zone", x_pct: 50, y_pct: 50, note: "bad region" },
    { pin_id: "../evil", viewport: "desktop_1440", region: "footer", x_pct: 10, y_pct: 92, note: "bad id" },
    { pin_id: "pin-01", viewport: "desktop_1440", region: "footer", x_pct: 10, y_pct: 92, note: "   " },
    { pin_id: "pin-01", viewport: "desktop_1440", region: "footer", x_pct: 10, y_pct: 92, note: "x".repeat(241) },
    { pin_id: "pin-01", viewport: "desktop_1440", region: "footer", x_pct: 10, y_pct: 92, note: "ok", extra_key: true },
  ]) {
    assert.equal(
      ExecuteBespokeRefinementPinSchema.safeParse(badPin).success,
      false,
      `Expected malformed pin rejected: ${JSON.stringify(badPin)}`
    );
  }

  // Reject >8 refinement_pins
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: {
        ...VALID_BUNDLE_ARGS.brief,
        refinement_pins: Array.from({ length: 9 }, (_, i) => ({
          pin_id: `pin-${i + 1}`,
          viewport: "desktop_1440",
          region: "hero_above_fold",
          x_pct: 20 + i,
          y_pct: 30,
          note: "Too many pins",
        })),
      },
    }).success,
    false
  );

  // Reject invalid enum values for chrome_budget and studio_loop_mode
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: { ...VALID_BUNDLE_ARGS.brief, chrome_budget: "UNRESTRICTED_CHROME" },
    }).success,
    false
  );
  assert.equal(
    ExecuteBespokeWebsiteArgsSchema.safeParse({
      ...VALID_BUNDLE_ARGS,
      brief: { ...VALID_BUNDLE_ARGS.brief, studio_loop_mode: "YOLO_UNVERIFIED" },
    }).success,
    false
  );

  // F-220-07: Reject ASCII control chars in refinement_pins[].note and primary_audience_action
  for (const ctrlStr of ["Refine\u0000hero", "Line1\nLine2", "Carriage\rReturn", "Ansi\u001b[31m", "Del\u007fChar"]) {
    assert.equal(
      ExecuteBespokeRefinementPinSchema.safeParse({
        pin_id: "pin-ctrl",
        viewport: "desktop_1440",
        region: "hero_above_fold",
        x_pct: 40,
        y_pct: 30,
        note: ctrlStr,
      }).success,
      false,
      `Expected control chars rejected in pin note: ${JSON.stringify(ctrlStr)}`
    );
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, primary_audience_action: ctrlStr },
      }).success,
      false,
      `Expected control chars rejected in primary_audience_action: ${JSON.stringify(ctrlStr)}`
    );
  }

  // F-220-07: Reject __proto__, constructor, prototype, and control-char keys in bounded records
  const protoRecord = JSON.parse('{"__proto__":"polluted"}') as Record<string, string>;
  const badRecords: Array<Record<string, string>> = [
    protoRecord,
    { constructor: "polluted" },
    { prototype: "polluted" },
    { "bad\u0000key": "x" },
    { "bad\nkey": "x" },
  ];
  for (const badRec of badRecords) {
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, palette: badRec },
      }).success,
      false,
      `Expected forbidden/control key rejected in palette: ${JSON.stringify(Object.keys(badRec))}`
    );
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, typography: badRec },
      }).success,
      false
    );
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, core_journey: badRec },
      }).success,
      false
    );
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, cta: badRec },
      }).success,
      false
    );
    assert.equal(
      ExecuteBespokeWebsiteArgsSchema.safeParse({
        ...VALID_BUNDLE_ARGS,
        brief: { ...VALID_BUNDLE_ARGS.brief, proof_cards: [{ nested: badRec }] },
      }).success,
      false
    );
  }
});

test("ENTRY220: workspace Click-to-Refine Inspector preserves strict CSP hygiene, iframe sandbox=\"\", zero innerHTML, and studio brief controls", async () => {
  const html = await readFile(new URL("../public/workspace.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../public/workspace.css", import.meta.url), "utf8");
  const js = await readFile(new URL("../public/workspace.js", import.meta.url), "utf8");

  // Strict CSP hygiene in workspace.html
  assert.doesNotMatch(html, /\sstyle\s*=/i, "workspace.html must not contain inline style attributes");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i, "workspace.html must not contain inline <script> blocks");
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "workspace.html must not contain inline on* event handlers");
  assert.match(html, /id="studio-template-iframe"[^>]*sandbox=""/, "workspace.html must keep sandbox=\"\" on #studio-template-iframe");

  // Inspector & studio brief controls present
  for (const id of [
    "vp-desktop-1440",
    "vp-laptop-1366",
    "vp-mobile-390",
    "inspector-toggle",
    "studio-pin-overlay",
    "clear-stale-pins-btn",
    "clear-pins-btn",
    "pin-list-panel",
    "chrome-budget",
    "studio-loop-mode",
    "visual-dna-notes",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `workspace.html missing required control #${id}`);
  }

  // Zero innerHTML and preserves GLOW_WEB_PUBLIC_INTAKE_V1 capsule fields
  assert.doesNotMatch(js, /\binnerHTML\b/, "workspace.js must never use innerHTML");
  for (const token of [
    "GLOW_WEB_PUBLIC_INTAKE_V1",
    "chrome_budget",
    "studio_loop_mode",
    "visual_dna_notes",
    "pin_workflow_scope",
    "DRAFT_FEEDBACK_ANNOTATION_ONLY",
    "refinement_pins",
    "isPinMatchingActiveView",
    "studio-pin-reticle",
    "ArrowLeft",
    "header_nav",
    "hero_above_fold",
    "primary_media_stage",
    "detail_panel",
    "footer",
    "Visual Feedback Pins (Draft)",
    "clearStalePinsBtn",
    "chromeOptEditorial",
    "chromeOptGallery",
    "chromeOptApp",
    "loopOptFast",
    "loopOptHardening",
    "visualDnaPlaceholder",
  ]) {
    assert.ok(js.includes(token), `workspace.js missing required Entry220 symbol/token: ${token}`);
  }
  for (const i18nKey of [
    "clearStalePinsBtn",
    "chromeOptEditorial",
    "chromeOptGallery",
    "chromeOptApp",
    "loopOptFast",
    "loopOptHardening",
  ]) {
    assert.ok(html.includes(`data-ws-i18n="${i18nKey}"`), `workspace.html missing EN i18n hook ${i18nKey}`);
  }

  // Viewport preset classes & pin overlay styling in workspace.css
  for (const cls of [
    ".viewport-desktop-1440",
    ".viewport-laptop-1366",
    ".viewport-mobile-390",
    ".studio-pin-overlay",
    ".studio-pin-marker",
    ".studio-pin-reticle",
    ".pin-item.is-stale",
    ".pin-jump-btn",
  ]) {
    assert.ok(css.includes(cls), `workspace.css missing required selector ${cls}`);
  }
});

test("ENTRY220 A220-03 & A220-04: scoped pin schema, TQC/router Zod schemas, and /mcp-v2 operator tool forwarding", async () => {
  // 1) Scoped pin accepts template_id + locale and rejects invalid template_id/locale
  const okPin = ExecuteBespokeRefinementPinSchema.parse({
    pin_id: "pin-01",
    template_id: "coastal-glass-architecture",
    locale: "en",
    viewport: "desktop_1440",
    region: "hero_above_fold",
    x_pct: 50,
    y_pct: 25,
    note: "Increase hero contrast slightly",
  });
  assert.equal(okPin.template_id, "coastal-glass-architecture");
  assert.equal(okPin.locale, "en");
  assert.equal(
    ExecuteBespokeRefinementPinSchema.safeParse({ ...okPin, template_id: "../bad" }).success,
    false
  );
  assert.equal(
    ExecuteBespokeRefinementPinSchema.safeParse({ ...okPin, locale: "fr" }).success,
    false
  );

  // 2) EvaluateAestheticTqcArgsSchema & PlanMediaProviderRouteArgsSchema fail closed on unsafe keys & unknown props
  assert.equal(
    EvaluateAestheticTqcArgsSchema.safeParse({
      metrics_payload: { viewports: { "1440x900": { zero_section_bleed: true, overflow_x: 0, top_gap_px: 20, bottom_gap_px: 24 } } },
      chrome_budget: "EDITORIAL_MINIMAL",
    }).success,
    true
  );
  const protoNested = JSON.parse('{"viewports":{"__proto__":{"overflow_x":0}}}');
  assert.equal(
    EvaluateAestheticTqcArgsSchema.safeParse({ metrics_payload: protoNested }).success,
    false
  );
  assert.equal(
    EvaluateAestheticTqcArgsSchema.safeParse({
      metrics_payload: { ok: true },
      extra_field: true,
    }).success,
    false
  );
  assert.equal(
    PlanMediaProviderRouteArgsSchema.safeParse({
      request_spec: { modality: "cinema_video_loop", clip_count: 2 },
      available_providers: { gemini_veo_api: { available: true, has_api_key: true } },
    }).success,
    true
  );
  assert.equal(
    PlanMediaProviderRouteArgsSchema.safeParse({
      request_spec: { modality: "invalid_modality", clip_count: 1 },
      available_providers: {},
    }).success,
    false
  );

  // 3) Live /mcp-v2 B220-01 enforcement:
  //    a) static_bearer MUST fail closed (EVIDENCE_OAUTH_ONLY_REQUIRED) on direct tools & glow_next_factory_control
  //    b) OAuth web.run-only & scope-only-without-RBAC MUST fail closed (0 operator calls)
  //    c) OAuth with web.evidence.admit scope + RBAC permission SUCCEEDS via callProtectedOperator (ADMIT_EVIDENCE)
  const staticToken = "tok-entry220-mcp-tqc-router-1234567890";
  const tqcArgs = {
    metrics_payload: { viewports: { "1440x900": { zero_section_bleed: true, overflow_x: 0, top_gap_px: 20, bottom_gap_px: 24 } } },
    chrome_budget: "EDITORIAL_MINIMAL",
  };
  const routeArgs = {
    request_spec: { modality: "cinema_video_loop", clip_count: 1 },
    available_providers: { gemini_veo_api: true },
  };
  const parseRpc = (raw: string) =>
    JSON.parse(
      raw.startsWith("data:") || raw.startsWith("event:")
        ? raw.split("\n").find((line) => line.startsWith("data:"))!.slice(5)
        : raw
    );

  // 3a) static_bearer rejected on all 3 paths with 0 backend calls
  let staticBackendCalls = 0;
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    staticBackendCalls++;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await hostFixture(
      {
        GLOW_AUTH_MODE: "static_bearer",
        GLOW_PUBLIC_TEST_BEARER_TOKEN: staticToken,
        GLOW_PUBLIC_TEST_SUBJECT: "usr_entry220_static",
      },
      async ({ app, handler }) => {
        try {
          const unauthRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
          });
          assert.equal(unauthRes.status, 401);

          for (const [id, name, args] of [
            [2, "glow_evaluate_aesthetic_tqc", tqcArgs],
            [3, "glow_plan_media_provider_route", routeArgs],
            [4, "glow_next_factory_control", { action: "evaluate_aesthetic_usability_tqc", args: tqcArgs }],
            [5, "glow_next_factory_control", { action: "plan_media_provider_route", args: routeArgs }],
          ] as const) {
            const res = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", {
              method: "POST",
              headers: {
                authorization: `Bearer ${staticToken}`,
                "content-type": "application/json",
                accept: "application/json, text/event-stream",
              },
              body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }),
            });
            assert.equal(res.status, 200);
            const parsed = parseRpc(await res.text());
            assert.equal(parsed.result.isError, true);
            assert.match(parsed.result.content[0].text, /EVIDENCE_OAUTH_ONLY_REQUIRED/);
          }
          assert.equal(staticBackendCalls, 0);
        } finally {
          await handler.close();
        }
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }

  // 3b & 3c) Full OAuth RS256 JWKS + in-process operator runtime verification
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "entry220-op-k1", alg: "RS256" };
  const issuer = "https://issuer.entry220.test/";
  const audience = "http://127.0.0.1:3100/mcp-v2";
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "glow-host-e220-op-"));
  const runtimeModPath = path.join(tmpDir, "fake-combined-runtime.mjs");
  const logPath = path.join(tmpDir, "operator-calls.ndjson");
  await writeFile(
    runtimeModPath,
    `import fs from "node:fs";
export async function createGlowCombinedRuntime() {
  return {
    async execute() {
      throw new Error("UNEXPECTED_NON_OPERATOR_EXECUTE_CALL");
    },
    async executeOperator(subject, request, actor) {
      fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ subject, action: request?.input?.action, actor }) + "\\n");
      const act = String(request?.input?.action ?? "");
      return {
        status_code: 200,
        body: {
          request_id: request.request_id,
          status: "accepted",
          exposure: "MODEL_SESSION_PRIVATE",
          result: {
            action: act,
            authority: "NEXT_FACTORY_CONTROL",
            payload:
              act === "evaluate_aesthetic_usability_tqc"
                ? { ok: true, status: "PASS", collision_status: "MEASURED_PASS" }
                : { ok: true, advisory_only: true, cost_approval_enforced_at_execution: false, selected_provider: "gemini_veo_api" },
          },
          public_evidence: [],
          errors: [],
        },
      };
    },
  };
}
`,
    "utf8"
  );

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://issuer.entry220.test/jwks") {
      return new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
    }
    return origFetch(input, init);
  }) as typeof fetch;

  try {
    resetCombinedRuntimeCacheForTest();
    await hostFixture(
      {
        GLOW_AUTH_MODE: "oauth",
        GLOW_OAUTH_ISSUER: issuer,
        GLOW_OAUTH_AUDIENCE: audience,
        GLOW_OAUTH_JWKS_URL: "https://issuer.entry220.test/jwks",
        GLOW_OAUTH_REQUIRED_SCOPES: "web.run",
        GLOW_COMBINED_RUNTIME_MODULE: runtimeModPath,
        GLOW_STATE_DIR: tmpDir,
      },
      async ({ app, handler }) => {
        try {
          const sign = (scope: string, permissions: string[]) =>
            new SignJWT({ scope, permissions })
              .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
              .setSubject("usr_entry220_op")
              .setIssuer(issuer)
              .setAudience(audience)
              .setExpirationTime("5m")
              .sign(privateKey);

          const rpc = async (token: string, id: number, method: string, params: unknown) => {
            const res = await fetchHttpHandler(app, audience, {
              method: "POST",
              headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                accept: "application/json, text/event-stream",
              },
              body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
            });
            assert.equal(res.status, 200);
            return parseRpc(await res.text());
          };

          const narrowTok = await sign("web.run", ["web.evidence.admit"]);
          const scopeOnlyTok = await sign("web.run web.evidence.admit", []);
          const operatorTok = await sign("web.run web.evidence.admit", ["web.evidence.admit"]);

          // tools/list advertises oauth2 securitySchemes requiring web.evidence.admit on both tools
          const listed = await rpc(narrowTok, 10, "tools/list", {});
          for (const tName of ["glow_evaluate_aesthetic_tqc", "glow_plan_media_provider_route"]) {
            const found = listed.result.tools.find((t: { name: string }) => t.name === tName);
            assert.ok(found, `Expected ${tName} in tools/list`);
            assert.deepEqual(found._meta.securitySchemes, [{ type: "oauth2", scopes: ["web.run", "web.evidence.admit"] }]);
          }

          // Missing scope rejected with step-up challenge (0 operator calls)
          for (const [id, name, args] of [
            [11, "glow_evaluate_aesthetic_tqc", tqcArgs],
            [12, "glow_plan_media_provider_route", routeArgs],
            [13, "glow_next_factory_control", { action: "evaluate_aesthetic_usability_tqc", args: tqcArgs }],
            [14, "glow_next_factory_control", { action: "plan_media_provider_route", args: routeArgs }],
          ] as const) {
            const res = await rpc(narrowTok, id, "tools/call", { name, arguments: args });
            assert.equal(res.result.isError, true);
            assert.match(res.result.content[0].text, /EVIDENCE_ADMISSION_SCOPE_REQUIRED/);
            assert.match(res.result._meta["mcp/www_authenticate"][0], /scope="web.run web.evidence.admit"/);
          }

          // Scope without RBAC permission rejected (0 operator calls)
          for (const [id, name, args] of [
            [15, "glow_evaluate_aesthetic_tqc", tqcArgs],
            [16, "glow_next_factory_control", { action: "plan_media_provider_route", args: routeArgs }],
          ] as const) {
            const res = await rpc(scopeOnlyTok, id, "tools/call", { name, arguments: args });
            assert.equal(res.result.isError, true);
            assert.match(res.result.content[0].text, /EVIDENCE_ADMISSION_RBAC_REQUIRED/);
          }

          // Authorized OAuth operator succeeds on all 3 paths via executeOperator with ADMIT_EVIDENCE
          const tqcOk = await rpc(operatorTok, 17, "tools/call", { name: "glow_evaluate_aesthetic_tqc", arguments: tqcArgs });
          assert.notEqual(tqcOk.result.isError, true);
          assert.match(tqcOk.result.content[0].text, /MEASURED_PASS/);

          const routeOk = await rpc(operatorTok, 18, "tools/call", { name: "glow_plan_media_provider_route", arguments: routeArgs });
          assert.notEqual(routeOk.result.isError, true);
          assert.match(routeOk.result.content[0].text, /advisory_only/);

          const ctrlOk = await rpc(operatorTok, 19, "tools/call", {
            name: "glow_next_factory_control",
            arguments: { action: "evaluate_aesthetic_usability_tqc", args: tqcArgs },
          });
          assert.notEqual(ctrlOk.result.isError, true);
          assert.match(ctrlOk.result.content[0].text, /MEASURED_PASS/);

          const opLines = (await readFile(logPath, "utf8"))
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l) as { subject: string; action: string; actor: { channel: string; authority_scopes: string[] } });
          assert.equal(opLines.length, 3);
          for (const entry of opLines) {
            assert.equal(entry.subject, "usr_entry220_op");
            assert.equal(entry.actor.channel, "PRIVATE_OPERATOR");
            assert.ok(entry.actor.authority_scopes.includes("ADMIT_EVIDENCE"));
          }
        } finally {
          await handler.close();
          resetCombinedRuntimeCacheForTest();
        }
      }
    );
  } finally {
    globalThis.fetch = origFetch;
    await rm(tmpDir, { recursive: true, force: true });
  }
});
