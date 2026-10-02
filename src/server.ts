import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getOAuthProtectedResourceMetadataUrl, requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpServerFactory } from "@modelcontextprotocol/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { loadConfig } from "./config.js";
import { loadOAuthConfig, loadStaticBearerConfig, createJwtVerifier, createStaticBearerVerifier, createHybridVerifier } from "./oauth.js";
import { callProtectedService, checkProtectedReadiness } from "./backend.js";
import { WebRequest } from "./contracts.js";
import { classifyWorkResponse } from "./work-response.js";
import { buildProtectedResourceMetadata } from "./resource-metadata.js";
import { createGlowMcpExpressApp } from "./mcp-app.js";

const HOST_ADAPTER_REVISION = "0.1.2-rc3";
const HOST_CONTRACT_ID = "RC4_FULL_WORK_LOOP_PERSISTENT_V1";
const config = loadConfig();
const configuredMcpServerUrl = new URL(process.env.GLOW_PUBLIC_MCP_URL ?? `http://127.0.0.1:${config.port}/mcp`);
const publicAuthorizationServerBase = process.env.GLOW_PUBLIC_AUTHORIZATION_SERVER?.trim() || configuredMcpServerUrl.origin;
const configuredAuthMode = (process.env.GLOW_AUTH_MODE?.trim() || "static_bearer").toLowerCase();
if (!["static_bearer","oauth","hybrid"].includes(configuredAuthMode)) {
  throw new Error("CONFIG_AUTH_MODE_INVALID");
}
const authMode = configuredAuthMode as "static_bearer"|"oauth"|"hybrid";
const oauthConfig = authMode === "static_bearer" ? null : loadOAuthConfig();
const requiredScopes = authMode === "static_bearer"
  ? ["web.run"]
  : (process.env.GLOW_OAUTH_REQUIRED_SCOPES ?? "email")
      .split(/\s+/).map(v=>v.trim()).filter(Boolean);
const verifier = authMode === "static_bearer"
  ? createStaticBearerVerifier(loadStaticBearerConfig())
  : authMode === "hybrid"
    ? createHybridVerifier({
        staticConfig: loadStaticBearerConfig(),
        oauthConfig: oauthConfig!,
        oauthScopes: requiredScopes
      })
    : createJwtVerifier(oauthConfig!);
const toolSecuritySchemes = authMode === "static_bearer"
  ? undefined
  : [{ type: "oauth2" as const, scopes: requiredScopes }];

function toolResult(value: Record<string, unknown>) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }]
  };
}

function toolError(code: string) {
  return {
    isError: true,
    structuredContent: {
      status: "failed",
      exposure: "PUBLIC_DECLASSIFIED",
      errors: [{ code, message: code, retryable: false }]
    },
    content: [{ type: "text" as const, text: code }]
  };
}

function subjectFrom(ctx: { authInfo?: { scopes: string[]; extra?: Record<string, unknown> } }) {
  const authInfo = ctx.authInfo;
  const subject = authInfo?.extra?.["sub"];
  if (typeof subject !== "string" || !subject) throw new Error("AUTH_REQUIRED");
  if (!requiredScopes.every(scope=>authInfo.scopes.includes(scope))) throw new Error("SCOPE_REQUIRED");
  return subject;
}

async function invoke(
  ctx: { authInfo?: { scopes: string[]; extra?: Record<string, unknown> } },
  operation: "create_web_mission"|"get_work"|"get_capability_plan"|"submit_capability_contributions"|"submit_work"|"inspect_blocked_stage"|"recover_blocked_stage"|"approve_stage"|"get_status"|"get_delivery"|"get_next_factory_capability_handshake"|"next_factory_control",
  role: "client"|"operator"|"unspecified",
  locale: string,
  input: Record<string, unknown>,
  request_id?: string
) {
  const subject = subjectFrom(ctx);
  const request = WebRequest.parse({
    request_id: request_id ?? randomUUID(),
    operation, role, locale, input
  });
  return callProtectedService(config, subject, request);
}

const buildServer: McpServerFactory = ctx => {
  const server = new McpServer(
    { name: "glow-web", version: HOST_ADAPTER_REVISION },
    {
      instructions:
        "Use GLOW Web only for the user's explicit web mission request. ChatGPT is the reasoning/intelligence host. The backend owns Factory state, validation, approval binding, freeze/admission, evidence and delivery boundaries. Legacy RC4 and the parallel Next Factory candidate are separate control paths. Use the Next Factory tools only when the user explicitly requests the Next Factory/demo path; for current demo operation require execution_profile=DEMO_BOUNDED, preserve its degraded claim ceiling, and never describe demo capability use as hard-admitted or production-ready. When a work package is returned, perform only that bounded work, then submit the result. Never invent success, approvals, evidence, or Factory state."
    }
  );

  server.registerTool(
    "glow_public_profile",
    {
      title: "GLOW Web public profile",
      description: "Returns the public host status and current claim boundary.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      inputSchema: z.object({})
    },
    async () => toolResult({
      product: "GLOW Web",
      version: HOST_ADAPTER_REVISION,
      contract_id: HOST_CONTRACT_ID,
      status: "CHATGPT_FULL_WORK_LOOP_PERSISTENCE_VERIFIED_CANDIDATE",
      next_factory_demo: "DEMO_BOUNDED_CONNECTED_CANDIDATE",
      next_factory_production_fork: "BLOCKED_HARD_ADMISSION_REQUIRED"
    })
  );

  server.registerTool(
    "glow_start_web_mission",
    {
      title: "Start a GLOW Web mission",
      description: "Creates a protected Factory mission. After this, call glow_get_factory_work.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.string(), z.unknown())
      })
    },
    async ({request_id,role,locale,input}) => {
      try { return toolResult(await invoke(ctx,"create_web_mission",role,locale,input,request_id) as unknown as Record<string,unknown>); }
      catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_factory_work",
    {
      title: "Get the next bounded Factory work package",
      description: "Returns a MODEL_SESSION_PRIVATE work package for ChatGPT reasoning. Do not present private work-package internals to the user as public Factory output.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_work",role,locale,{mission_id});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE"){
          return {
            isError:true,
            ...toolResult(out as unknown as Record<string,unknown>)
          };
        }
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_capability_plan",
    {
      title: "Get bounded Capability Plane plan for current Factory work",
      description: "Returns MODEL_SESSION_PRIVATE capability scope/specs bound to the exact current mission/work. Capability Control supplies expertise only and does not own Process state.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        work_id:z.string().min(1).max(128),
        work_contract_revision:z.number().int().min(1),
        triggered_scope:z.array(z.string().min(1).max(64)).default([]),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,work_id,work_contract_revision,triggered_scope,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_capability_plan",role,locale,{
          mission_id,expected_state_version,work_id,work_contract_revision,triggered_scope
        });
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_submit_capability_contributions",
    {
      title: "Bind Capability Plane contributions to current Factory work",
      description: "Capability Control validates exact mission/work scope and issues canonical coverage/contribution receipts. ChatGPT supplies bounded contribution results but cannot mint receipts or change Process state.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        work_id:z.string().min(1).max(128),
        work_contract_revision:z.number().int().min(1),
        triggered_scope:z.array(z.string().min(1).max(64)).default([]),
        material:z.record(z.string(),z.object({
          contribution_result:z.record(z.string(),z.unknown()),
          claim_limit:z.string().min(1).max(2000)
        }).strict()),
        not_material:z.record(z.string(),z.string().min(1).max(2000)),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,work_id,work_contract_revision,triggered_scope,material,not_material,role,locale}) => {
      try {
        const out=await invoke(ctx,"submit_capability_contributions",role,locale,{
          mission_id,expected_state_version,work_id,work_contract_revision,triggered_scope,material,not_material
        });
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_next_factory_capability_handshake",
    {
      title:"GLOW Web Next Factory capability handshake",
      description:"Returns MODEL_SESSION_PRIVATE readiness for the Next Factory semantic Capability Broker, including bounded demo availability and production hard-admission block state. Internal Sxx/Cxx implementation IDs remain private.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({role,locale}) => {
      try {
        const out=await invoke(ctx,"get_next_factory_capability_handshake",role,locale,{});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_next_factory_control",
    {
      title:"GLOW Web Next Factory control",
      description:"Runs one bounded action in the parallel H1?H2?H3 Next Factory candidate. The private backend owns durable state, Fork Control, work-item epochs, defect recovery and claim limits. This tool does not promote the candidate or replace RC4.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.discriminatedUnion("action",[
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
              payload:z.object({
                unknowns:z.array(z.unknown()),
                conflicts:z.array(z.unknown()),
                mission_truth:z.record(z.string(),z.unknown())
              }).strict()
            }).strict(),
            z.object({
              mission_id:z.string().min(1).max(128),
              expected_state_version:z.number().int().min(1),
              phase:z.literal("H2"),
              payload:z.object({
                blueprint_revision:z.number().int().min(1),
                product_decomposition:z.record(z.string(),z.unknown()),
                system_blueprint:z.record(z.string(),z.unknown())
              }).strict()
            }).strict(),
            z.object({
              mission_id:z.string().min(1).max(128),
              expected_state_version:z.number().int().min(1),
              phase:z.literal("H3"),
              payload:z.object({
                packet_id:z.string().min(1),
                fork_readiness:z.record(z.string(),z.unknown()),
                kit_orders:z.record(z.string(),z.unknown())
              }).strict()
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
            repair_evidence:z.array(z.unknown()).optional()
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
            accepted_risk:z.array(z.unknown()).optional()
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
          args:z.object({mission_id:z.string().min(1).max(128)}).strict(),
          role:z.enum(["client","operator","unspecified"]).default("unspecified"),
          locale:z.string().min(2).max(32).default("vi-VN")
        })
      ])
    },
    async ({action,args,role,locale}) => {
      try {
        const out=await invoke(ctx,"next_factory_control",role,locale,{action,args});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_inspect_blocked_factory_stage",
    {
      title:"Inspect a blocked GLOW Web Factory stage",
      description:"MODEL_SESSION_PRIVATE diagnosis binding for the exact blocked mission version. It records diagnosis only; it does not recover, approve or advance Process state.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        diagnosis:z.object({
          summary:z.string().min(1).max(4000),
          evidence_refs:z.array(z.string().min(1).max(1000)).min(1)
        }).strict(),
        inspector_type:z.enum(["MODEL","HUMAN","AUTHORIZED_OPERATOR"]).default("MODEL"),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,diagnosis,inspector_type,role,locale}) => {
      try {
        const out=await invoke(ctx,"inspect_blocked_stage",role,locale,{mission_id,expected_state_version,diagnosis,inspector_type});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_recover_blocked_factory_stage",
    {
      title:"Request bounded Factory recovery for a blocked stage",
      description:"Requests recovery bound to the current state version and diagnosis receipt. Factory Control alone decides whether recovery is allowed.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        actor_type:z.enum(["HUMAN","AUTHORIZED_OPERATOR"]),
        recovery_action:z.string().min(1).max(4000),
        diagnosis_id:z.string().min(1).max(128),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,actor_type,recovery_action,diagnosis_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"recover_blocked_stage",role,locale,{
          mission_id,expected_state_version,actor_type,recovery_action,diagnosis_id
        });
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("RECOVERY_RESPONSE_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_submit_factory_work",
    {
      title:"Submit completed bounded Factory work",
      description:"Submits the exact current Factory work binding. Requires state_version, work_id and work_contract_revision returned by glow_get_factory_work; no synthetic work token is accepted.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        work_id:z.string().min(1).max(128),
        work_contract_revision:z.number().int().min(1),
        result:z.record(z.string(),z.unknown()),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,work_id,work_contract_revision,result,role,locale}) => {
      try {
        const out=await invoke(ctx,"submit_work",role,locale,{
          mission_id,expected_state_version,work_id,work_contract_revision,result
        });
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("SUBMIT_RESPONSE_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_approve_factory_stage",
    {
      title:"Approve or reject the current Factory stage candidate",
      description:"Submits a human/authorized-operator decision bound to the current Factory state version. The model cannot self-approve KIT_A.",
      annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:z.object({
        mission_id:z.string().min(1).max(128),
        expected_state_version:z.number().int().min(1),
        actor_type:z.enum(["HUMAN","AUTHORIZED_OPERATOR"]),
        decision:z.enum(["APPROVE","REJECT"]),
        approval_note:z.string().min(1).max(4000),
        role:z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale:z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,expected_state_version,actor_type,decision,approval_note,role,locale}) => {
      try {
        const out=await invoke(ctx,"approve_stage",role,locale,{
          mission_id,expected_state_version,actor_type,decision,approval_note
        });
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("APPROVAL_RESPONSE_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_factory_status",
    {
      title: "Get GLOW Web Factory mission status",
      description: "Returns declassified mission state and the next allowed action.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_status",role,locale,{mission_id});
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("STATUS_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  server.registerTool(
    "glow_get_delivery",
    {
      title: "Get the final GLOW Web delivery",
      description: "Returns only the final PUBLIC_DECLASSIFIED delivery after H3 admission.",
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        mission_id: z.string().min(1).max(128),
        role: z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN")
      })
    },
    async ({mission_id,role,locale}) => {
      try {
        const out=await invoke(ctx,"get_delivery",role,locale,{mission_id});
        if(out.exposure!=="PUBLIC_DECLASSIFIED") throw new Error("DELIVERY_EXPOSURE_INVALID");
        return toolResult(out as unknown as Record<string,unknown>);
      } catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  // Compatibility alias for the old single-tool profile. It now only starts a mission.
  server.registerTool(
    "glow_create_web_mission",
    {
      title: "Start a GLOW web mission (compatibility alias)",
      description: "Starts a Factory mission; use the work-loop tools to continue it.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema: z.object({
        request_id: z.string().min(1).max(128).optional(),
        role: z.enum(["client","operator","unspecified"]).default("unspecified"),
        locale: z.string().min(2).max(32).default("vi-VN"),
        input: z.record(z.string(), z.unknown())
      })
    },
    async ({request_id,role,locale,input}) => {
      try { return toolResult(await invoke(ctx,"create_web_mission",role,locale,input,request_id) as unknown as Record<string,unknown>); }
      catch(error){ return toolError(error instanceof Error?error.message:"HOST_REQUEST_FAILED"); }
    }
  );

  return server;
};

const handler = createMcpHandler(buildServer);
const app = createGlowMcpExpressApp(
  (process.env.GLOW_ALLOWED_HOSTS ?? "localhost,127.0.0.1").split(",").map(v=>v.trim()).filter(Boolean)
);

const mcpServerUrl = configuredMcpServerUrl;
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);
const resourceMetadata = buildProtectedResourceMetadata({
  resource:mcpServerUrl.toString(),
  authMode,
  oauthIssuer:authMode === "static_bearer" ? null : oauthConfig!.issuer,
  scopes:requiredScopes
});
const auth = requireBearerAuth({
  verifier,
  requiredScopes,
  resourceMetadataUrl
});

const mcpV2ServerUrl = new URL("/mcp-v2", mcpServerUrl.origin);
const resourceMetadataV2Url = getOAuthProtectedResourceMetadataUrl(mcpV2ServerUrl);
const resourceMetadataV2 = buildProtectedResourceMetadata({
  resource:mcpV2ServerUrl.toString(),
  authMode,
  oauthIssuer:authMode === "static_bearer" ? null : oauthConfig!.issuer,
  scopes:requiredScopes
});
const authV2 = requireBearerAuth({
  verifier,
  requiredScopes,
  resourceMetadataUrl: resourceMetadataV2Url
});

const mcpV3ServerUrl = new URL("/mcp-v3", mcpServerUrl.origin);
const resourceMetadataV3Url = getOAuthProtectedResourceMetadataUrl(mcpV3ServerUrl);
const resourceMetadataV3 = buildProtectedResourceMetadata({
  resource:mcpV3ServerUrl.toString(),
  authMode,
  oauthIssuer:authMode === "static_bearer" ? null : oauthConfig!.issuer,
  scopes:requiredScopes
});
const authV3 = requireBearerAuth({
  verifier,
  requiredScopes,
  resourceMetadataUrl: resourceMetadataV3Url
});

const node = toNodeHandler(handler);

const resourceMetadataPath = new URL(resourceMetadataUrl).pathname;
app.get(resourceMetadataPath, (_req,res) => {
  res.json(resourceMetadata);
});

const resourceMetadataV2Path = new URL(resourceMetadataV2Url).pathname;
app.get(resourceMetadataV2Path, (_req,res) => {
  res.json(resourceMetadataV2);
});

const resourceMetadataV3Path = new URL(resourceMetadataV3Url).pathname;
app.get(resourceMetadataV3Path, (_req,res) => {
  res.json(resourceMetadataV3);
});

app.get("/.well-known/oauth-authorization-server", (_req,res) => {
  if (authMode === "static_bearer" || !oauthConfig) {
    res.status(404).json({error:"OAUTH_NOT_CONFIGURED"});
    return;
  }
  const issuer=oauthConfig.issuer.replace(/\/$/,"");
  res.json({
    issuer: publicAuthorizationServerBase,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/clients/register`,
    scopes_supported: ["email","profile","openid"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code","refresh_token"],
    token_endpoint_auth_methods_supported: ["none","client_secret_post","client_secret_basic"],
    code_challenge_methods_supported: ["S256"]
  });
});

const publicDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");

app.get("/",(_req,res) => {
  res.type("html").sendFile(path.join(publicDir,"index.html"));
});

app.get("/app",(_req,res) => {
  res.type("html").sendFile(path.join(publicDir,"index.html"));
});

app.get("/app.css",(_req,res) => {
  res.type("text/css").sendFile(path.join(publicDir,"app.css"));
});

app.get("/app.js",(_req,res) => {
  res.type("application/javascript").sendFile(path.join(publicDir,"app.js"));
});

app.get("/api/public/profile",(_req,res) => {
  res.json({
    product:"GLOW Web",
    version:HOST_ADAPTER_REVISION,
    contract_id:HOST_CONTRACT_ID,
    status_label:"Public Experience candidate",
    surfaces:["WEB_WORKSPACE","MCP_OAUTH","PUBLIC_RESULTS"],
    canonical_ai_resource:"/mcp-v2",
    private_factory_exposed:false,
    claim_limit:"CANDIDATE_NOT_HOSTINGER_VERIFIED"
  });
});

app.get("/oauth-config.js",(_req,res) => {
  const supabaseUrl=process.env.GLOW_SUPABASE_URL?.trim();
  const supabasePublishableKey=process.env.GLOW_SUPABASE_PUBLISHABLE_KEY?.trim();
  if(!supabaseUrl || !supabasePublishableKey){
    res.status(503).type("application/javascript").send(
      "throw new Error('WEB_OAUTH_PUBLIC_CONFIG_MISSING');"
    );
    return;
  }
  res.type("application/javascript").send(
    `window.__GLOW_WEB_OAUTH_CONFIG__=${JSON.stringify({supabaseUrl,supabasePublishableKey})};`
  );
});

app.get("/oauth-client.js", (_req,res) => {
  res.type("application/javascript");
  res.sendFile(path.join(publicDir,"oauth-client.js"));
});

app.get("/oauth/consent", (_req,res) => {
  if(authMode==="static_bearer"){
    res.status(404).type("text").send("OAuth is not configured for this deployment.");
    return;
  }
  res.type("html").send(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLOW Web — Cấp quyền</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#f6f7fb}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
main{width:min(560px,100%);background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:28px;box-shadow:0 18px 50px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 8px}.muted{color:#666;line-height:1.55}.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0}
label{display:block;font-weight:600;margin:12px 0 6px}input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px}
button{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.primary{background:#111827;color:#fff}.secondary{background:#eef2f7}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
#status{font-size:14px;margin-top:16px;color:#475569}#status[data-error="1"]{color:#b91c1c}code{word-break:break-all;font-size:12px}
</style>
</head>
<body>
<main>
<h1>GLOW Web</h1>
<p class="muted">ChatGPT đang yêu cầu quyền sử dụng GLOW Web thay mặt bạn. Factory chỉ nhận quyền sau khi bạn xác nhận.</p>
<section id="login-panel" class="card" hidden>
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" placeholder="you@example.com">
<div class="actions"><button id="signin" class="primary" type="button">Gửi liên kết đăng nhập</button></div>
</section>
<section id="consent-panel" class="card" hidden>
<p><strong>Ứng dụng:</strong> <span id="client-name">ChatGPT</span></p>
<p><strong>Quyền yêu cầu:</strong> <span id="scopes"></span></p>
<p class="muted"><strong>Callback:</strong> <code id="redirect-uri"></code></p>
<div class="actions">
<button id="approve" class="primary" type="button">Cho phép</button>
<button id="deny" class="secondary" type="button">Từ chối</button>
</div>
</section>
<p id="status" aria-live="polite">Đang kiểm tra yêu cầu…</p>
</main>
<script src="/oauth-config.js"></script>
<script src="/oauth-client.js"></script>
</body>
</html>`);
});

app.get("/healthz", (_req,res) => {
  res.json({ok:true,product:"GLOW Web",version:HOST_ADAPTER_REVISION,contract_id:HOST_CONTRACT_ID,mode:"CHATGPT_WORK_LOOP"});
});

app.get("/readyz", async (_req,res) => {
  const readiness = await checkProtectedReadiness(config);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    product: "GLOW Web",
    version: HOST_ADAPTER_REVISION,
    contract_id: HOST_CONTRACT_ID,
    public_host: "running",
    protected_factory: readiness.ok ? "reachable_authenticated" : "unavailable",
    code: readiness.code
  });
});

app.all("/mcp",auth,(req,res)=>void node(req,res,req.body));
app.all("/mcp-v2",authV2,(req,res)=>void node(req,res,req.body));
app.all("/mcp-v3",authV3,(req,res)=>void node(req,res,req.body));

app.listen(config.port,()=>{
  console.error(`GLOW Web public host listening on :${config.port}`);
});
