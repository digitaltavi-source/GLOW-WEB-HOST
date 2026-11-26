import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BESPOKE_BINARY_ALLOWED_EXTENSIONS,
  ExecuteBespokeWebsiteArgsSchema,
  NextFactoryControlInputSchema,
  isSafeBespokeBinaryRelPath,
  isSafeBespokeRelPath,
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
