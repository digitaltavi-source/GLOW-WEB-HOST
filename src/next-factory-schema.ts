import {ArtifactLookupSchema} from './artifact-lookup.js';
import {SystemAuditSchema,GetSystemAuditSchema} from './system-audit.js';
import {ArtifactAdmissionSchema,EvidenceAdmissionSchema} from './evidence-admission.js';
import * as z from "zod/v4";
import {H1PhaseSchema,H2PhaseSchema,H3PhaseSchema} from './phase-schema.js';

const SAFE_BESPOKE_SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SAFE_BESPOKE_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,127}$/;
const BESPOKE_ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".svg",
  ".json",
  ".txt",
  ".webmanifest",
]);
export const BESPOKE_BINARY_ALLOWED_EXTENSIONS = new Set([
  ".webp",
  ".avif",
  ".jpg",
  ".jpeg",
  ".png",
  ".mp4",
  ".webm",
  ".woff2",
]);
const BESPOKE_RESERVED_PATHS = new Set([
  "manifest.sha256",
  "factory_lineage_and_receipts.json",
  "site-manifest.json",
  "provenance-seal.json",
]);
const BESPOKE_MAX_TOTAL_BUNDLE_BYTES = 3_500_000;
const BESPOKE_MAX_BINARY_FILE_COUNT = 48;
const BESPOKE_MAX_BINARY_SINGLE_BYTES = 4_000_000;
const BESPOKE_MAX_BINARY_TOTAL_BYTES = 8_000_000;
const STRICT_BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function isSafeBespokeRelPathWithExts(relPath: string, allowedExts: Set<string>): boolean {
  if (!SAFE_BESPOKE_FILE_RE.test(relPath)) return false;
  if (relPath.startsWith("/") || relPath.includes("\\") || relPath.includes("//") || relPath.includes("..")) {
    return false;
  }
  const parts = relPath.split("/");
  if (!parts.every(part => part.length > 0 && part !== "." && part !== ".." && !part.startsWith("."))) {
    return false;
  }
  const low = relPath.toLowerCase();
  if (
    BESPOKE_RESERVED_PATHS.has(low) ||
    low.endsWith("-deliverable.zip") ||
    low.endsWith(".zip") ||
    low === "tqc_screenshots" ||
    low.startsWith("tqc_screenshots/")
  ) {
    return false;
  }
  const lastSegment = parts[parts.length - 1] ?? "";
  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx <= 0) return false;
  const ext = lastSegment.slice(dotIdx).toLowerCase();
  return allowedExts.has(ext);
}

export function isSafeBespokeRelPath(relPath: string): boolean {
  return isSafeBespokeRelPathWithExts(relPath, BESPOKE_ALLOWED_EXTENSIONS);
}

export function isSafeBespokeBinaryRelPath(relPath: string): boolean {
  return isSafeBespokeRelPathWithExts(relPath, BESPOKE_BINARY_ALLOWED_EXTENSIONS);
}

const BespokeBoundedPrimitiveSchema = z.union([
  z.string().max(800),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const BespokeBoundedShallowObjectSchema = z
  .record(z.string().min(1).max(64), BespokeBoundedPrimitiveSchema)
  .refine((obj) => Object.keys(obj).length <= 24, {
    message: "BESPOKE_SHALLOW_OBJECT_MAX_24_KEYS_EXCEEDED",
  });

const BespokeBoundedValueSchema = z.union([
  BespokeBoundedPrimitiveSchema,
  BespokeBoundedShallowObjectSchema,
  z.array(z.union([BespokeBoundedPrimitiveSchema, BespokeBoundedShallowObjectSchema])).max(24),
]);

const BespokeBoundedRecordSchema = z
  .record(z.string().min(1).max(64), BespokeBoundedValueSchema)
  .refine((obj) => Object.keys(obj).length <= 24, {
    message: "BESPOKE_RECORD_MAX_24_KEYS_EXCEEDED",
  });

export const ExecuteBespokeWebsiteBriefSchema = z.object({
  brand_name: z.string().min(1).max(160),
  locale: z.string().min(2).max(32).default("vi-VN"),
  primary_locale: z.string().min(2).max(32).optional(),
  secondary_locale: z.string().min(2).max(32).optional(),
  industry: z.string().min(1).max(128).optional(),
  archetype: z.string().min(1).max(128).optional(),
  brief_id: z.string().regex(SAFE_BESPOKE_SLUG_RE).optional(),
  sku: z.string().min(1).max(128).optional(),
  product_code: z.string().min(1).max(128).optional(),
  product_title: z.string().min(1).max(200).optional(),
  hero_headline: z.string().min(1).max(400).optional(),
  hero_subheadline: z.string().min(1).max(600).optional(),
  business_outcome: z.string().min(1).max(600).optional(),
  art_direction: z.string().min(1).max(1200).optional(),
  art_direction_thesis: z.string().min(1).max(1200).optional(),
  execution_profile: z.enum(["DEMO_BOUNDED", "PRODUCTION"]).default("DEMO_BOUNDED"),
  visual_tier: z.enum(["SVG_BESPOKE", "CINEMA_MULTIMEDIA"]).optional(),
  cms_material: z.boolean().optional(),
  price_usd: z
    .union([
      z.number().finite().nonnegative().max(10_000_000),
      z
        .string()
        .regex(/^\d{1,8}(\.\d{1,2})?$/)
        .refine((val) => Number(val) <= 10_000_000, {
          message: "BESPOKE_PRICE_USD_MAX_10000000_EXCEEDED",
        }),
    ])
    .optional(),
  users: z
    .union([
      z.string().min(1).max(600),
      z.array(z.string().min(1).max(200)).max(24),
    ])
    .optional(),
  palette: z
    .union([
      z
        .record(z.string().min(1).max(64), z.string().min(1).max(120))
        .refine((obj) => Object.keys(obj).length <= 24, {
          message: "BESPOKE_PALETTE_MAX_24_KEYS_EXCEEDED",
        }),
      z.array(z.string().min(1).max(120)).max(24),
    ])
    .optional(),
  typography: z
    .record(
      z.string().min(1).max(64),
      z.union([z.string().min(1).max(240), z.number().finite().positive().max(100)])
    )
    .refine((obj) => Object.keys(obj).length <= 24, {
      message: "BESPOKE_TYPOGRAPHY_MAX_24_KEYS_EXCEEDED",
    })
    .optional(),
  core_journey: z
    .union([
      z.string().min(1).max(800),
      z.array(z.string().min(1).max(300)).max(24),
      z
        .record(z.string().min(1).max(64), z.string().min(1).max(600))
        .refine((obj) => Object.keys(obj).length <= 16, {
          message: "BESPOKE_CORE_JOURNEY_MAX_16_KEYS_EXCEEDED",
        }),
    ])
    .optional(),
  proof_cards: z.array(BespokeBoundedRecordSchema).max(24).optional(),
  interactive_module: z.union([z.string().min(1).max(400), BespokeBoundedRecordSchema]).optional(),
  cta: z.union([z.string().min(1).max(240), BespokeBoundedRecordSchema]).optional(),
  tagline: z.string().min(1).max(240).optional(),
  target_audience: z.string().min(1).max(400).optional(),
  pii_fields: z.array(z.string().min(1).max(64)).max(32).optional(),
}).strict();

export const ExecuteBespokeWebsiteFilesSchema = z.record(
  z.string(),
  z.string().min(1).max(350_000)
).superRefine((files, ctx) => {
  const keys = Object.keys(files);
  if (keys.length < 3) {
    ctx.addIssue({ code: "custom", message: "BESPOKE_FILES_MIN_3_REQUIRED" });
  }
  if (keys.length > 24) {
    ctx.addIssue({ code: "custom", message: "BESPOKE_FILES_MAX_24_EXCEEDED" });
  }
  let totalBytes = 0;
  for (const key of keys) {
    if (!isSafeBespokeRelPath(key)) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `BESPOKE_FILE_PATH_INVALID:${key}`,
      });
    }
    const content = files[key];
    if (typeof content === "string") {
      totalBytes += Buffer.byteLength(content, "utf8");
    }
  }
  if (totalBytes > BESPOKE_MAX_TOTAL_BUNDLE_BYTES) {
    ctx.addIssue({
      code: "custom",
      message: `BESPOKE_FILES_TOTAL_BYTES_EXCEEDED:${totalBytes}>${BESPOKE_MAX_TOTAL_BUNDLE_BYTES}`,
    });
  }
});

export const ExecuteBespokeWebsiteBinaryFilesBase64Schema = z.record(
  z.string(),
  z.string().min(4)
).superRefine((binFiles, ctx) => {
  const keys = Object.keys(binFiles);
  if (keys.length > BESPOKE_MAX_BINARY_FILE_COUNT) {
    ctx.addIssue({
      code: "custom",
      message: `BESPOKE_BINARY_FILES_MAX_${BESPOKE_MAX_BINARY_FILE_COUNT}_EXCEEDED`,
    });
  }
  let totalDecodedBytes = 0;
  for (const key of keys) {
    if (!isSafeBespokeBinaryRelPath(key)) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `BESPOKE_BINARY_FILE_PATH_INVALID:${key}`,
      });
      continue;
    }
    const b64 = binFiles[key];
    if (typeof b64 !== "string" || b64.length < 4 || b64.length % 4 !== 0 || !STRICT_BASE64_RE.test(b64)) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `BESPOKE_BINARY_BASE64_INVALID:${key}`,
      });
      continue;
    }
    const decodedBytes = Buffer.from(b64, "base64").byteLength;
    if (decodedBytes <= 0) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `BESPOKE_BINARY_BASE64_EMPTY:${key}`,
      });
      continue;
    }
    if (decodedBytes > BESPOKE_MAX_BINARY_SINGLE_BYTES) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `BESPOKE_BINARY_FILE_MAX_BYTES_EXCEEDED:${key}:${decodedBytes}>${BESPOKE_MAX_BINARY_SINGLE_BYTES}`,
      });
    }
    totalDecodedBytes += decodedBytes;
  }
  if (totalDecodedBytes > BESPOKE_MAX_BINARY_TOTAL_BYTES) {
    ctx.addIssue({
      code: "custom",
      message: `BESPOKE_BINARY_TOTAL_BYTES_EXCEEDED:${totalDecodedBytes}>${BESPOKE_MAX_BINARY_TOTAL_BYTES}`,
    });
  }
});

export const ExecuteBespokeWebsiteArgsShape = {
  slug: z.string().regex(SAFE_BESPOKE_SLUG_RE),
  brief: ExecuteBespokeWebsiteBriefSchema,
  files: ExecuteBespokeWebsiteFilesSchema,
  binary_files_base64: ExecuteBespokeWebsiteBinaryFilesBase64Schema.optional(),
  visual_tier: z.enum(["SVG_BESPOKE", "CINEMA_MULTIMEDIA"]).optional(),
  run_browser_tqc: z.boolean().default(true),
};

export const ExecuteBespokeWebsiteArgsSchema = z.object(ExecuteBespokeWebsiteArgsShape).strict();

export const NextFactoryControlInputSchema = z.discriminatedUnion("action",[
 z.object({action:z.literal("inspect_artifact_admission"),args:ArtifactLookupSchema,role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
 z.object({action:z.literal("register_system_audit"),args:SystemAuditSchema,role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
 z.object({action:z.literal("get_system_audit"),args:GetSystemAuditSchema,role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
 z.object({action:z.literal("evidence_admission_preflight"),args:z.object({}).strict(),role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
 z.object({action:z.literal("register_artifact"),args:ArtifactAdmissionSchema,role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
 z.object({action:z.literal("register_evidence"),args:EvidenceAdmissionSchema,role:z.enum(["client","operator","unspecified"]).default("unspecified"),locale:z.string().default("vi-VN")}).strict(),
        z.object({
          action:z.literal("get_preproduction_capability_plan"),
          args:z.object({mission_id:z.string().min(1).max(128),expected_state_version:z.number().int().min(1),blueprint_revision:z.number().int().min(1)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_preproduction_capability_contribution"),
          args:z.object({mission_id:z.string().min(1).max(128),expected_state_version:z.number().int().min(1),blueprint_revision:z.number().int().min(1),
            phase_work_id:z.string().min(1).max(128),capability_id:z.string().min(1).max(128),contribution_result:z.record(z.string(),z.unknown()),
            evidence_refs:z.array(z.string().min(1)).min(1)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("create_mission"),
          args:z.object({
            mission_input:z.object({
              execution_profile:z.enum(["PRODUCTION","DEMO_BOUNDED"])
            }).passthrough()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("status"),
          args:z.object({mission_id:z.string().min(1).max(128)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("get_work"),
          args:z.object({mission_id:z.string().min(1).max(128)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("submit_phase"),
          args:z.discriminatedUnion("phase",[
            z.object({
              mission_id:z.string().min(1).max(128),
              expected_state_version:z.number().int().min(1),
              phase:z.literal("H1"),
              payload:H1PhaseSchema
            }).strict(),
            z.object({
              mission_id:z.string().min(1).max(128),
              expected_state_version:z.number().int().min(1),
              phase:z.literal("H2"),
              payload:H2PhaseSchema
            }).strict(),
            z.object({
              mission_id:z.string().min(1).max(128),
              expected_state_version:z.number().int().min(1),
              phase:z.literal("H3"),
              payload:H3PhaseSchema
            }).strict()
          ]),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("attempt_fork"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            orders:z.array(z.record(z.string(),z.unknown())).length(3)
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("list_work_items"),
          args:z.object({mission_id:z.string().min(1).max(128)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("claim_work"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            owner:z.string().min(1)
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("reassign_work"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            new_owner:z.string().min(1),
            reason:z.string().min(1)
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("checkpoint"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            owner_epoch:z.number().int().min(0),
            checkpoint:z.record(z.string(),z.unknown()).optional()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("report_defect"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            owner_epoch:z.number().int().min(0),
            classification:z.string().min(1).optional(),
            evidence:z.record(z.string(),z.unknown()).optional()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("barrier_review"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            defect_id:z.string().min(1).max(128),
            repair_succeeded:z.boolean().optional(),
            repair_evidence:z.array(z.string().min(1)).optional(),
            repair_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/).optional()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("human_recovery"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            defect_id:z.string().min(1).max(128),
            choice:z.string().min(1),
            reason:z.string().optional(),
            verified:z.boolean().optional(),
            accepted_risk:z.array(z.unknown()).optional(),
            repair_evidence:z.array(z.string().min(1)).optional(),
            repair_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/).optional()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_capability_contribution"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            owner_epoch:z.number().int().min(0),
            capability_id:z.string().min(1),
            contribution_result:z.record(z.string(),z.unknown()),
            evidence_refs:z.array(z.string().min(1)).min(1)
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("package_work"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            work_item_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            owner_epoch:z.number().int().min(0),
            manifest:z.record(z.string(),z.unknown())
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("compose_readiness"),
          args:z.object({mission_id:z.string().min(1).max(128)}).passthrough(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_composition_result"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            result:z.object({
              integrated_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/),
              candidate_preview_identity:z.string().min(1),
              composition_manifest:z.record(z.string(),z.unknown()),
              evidence_refs:z.array(z.string().min(1)).min(1)
            }).strict()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("submit_system_assurance"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            report:z.object({
              integrated_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/),
              frozen_acceptance_refs:z.array(z.string().min(1)).min(1),
              g0_g12:z.record(z.string(),z.record(z.string(),z.unknown())),
              false_green_probes:z.record(z.string(),z.record(z.string(),z.unknown())),
              claim_limit:z.enum(['DEMO_ONLY_UNQUALIFIED_CAPABILITIES_NOT_PRODUCTION_EVIDENCE','DEV_INTEGRATION']),
              dimensions:z.record(z.string(),z.object({
                status:z.enum(["PASS","FAIL"]),
                criteria_refs:z.array(z.string().min(1)).min(1),
                evidence_refs:z.array(z.string().min(1)).min(1),
                evidence_type:z.string().min(1),
                evaluator_class:z.literal('OPERATOR_REVIEW'),
                observed_result:z.string().min(1),
                notes:z.string().optional()
              }).strict())
            }).strict()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_human_release_decision"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            decision:z.object({
              actor_type:z.enum(["HUMAN","AUTHORIZED_OPERATOR"]),
              decision:z.enum(["APPROVE","REQUEST_CHANGES","REJECT"]),
              reason:z.string().min(1),
              integrated_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/),
              assurance_report_hash:z.string().regex(/^[0-9a-f]{64}$/),
              candidate_preview_identity:z.string().min(1),
              approved_scope:z.array(z.string()).optional(),
              known_accepted_risks:z.array(z.string()).optional(),
              invalidation_conditions:z.array(z.string()).optional()
            }).strict()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_deployment"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            deployment:z.object({
              approval_receipt_id:z.string().min(1),
              integrated_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/),
              release_identity:z.string().min(1),
              environment:z.string().min(1),
              evidence_refs:z.array(z.string().min(1)).min(1)
            }).strict()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("record_live_verification"),
          args:z.object({
            mission_id:z.string().min(1).max(128),
            expected_state_version:z.number().int().min(1),
            verification:z.object({
              deployment_receipt_id:z.string().min(1),
              observed_artifact_sha256:z.string().regex(/^[0-9a-f]{64}$/),
              status:z.literal("PASS"),
              evidence_refs:z.array(z.string().min(1)).min(1)
            }).strict()
          }).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }),
        z.object({
          action:z.literal("execute_bespoke_website"),
          args:ExecuteBespokeWebsiteArgsSchema,
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        }).strict()
      ]);
