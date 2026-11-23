import {ArtifactLookupSchema} from './artifact-lookup.js';
import {connectionDiagnostics} from './connection-diagnostics.js';
import {SystemAuditSchema,GetSystemAuditSchema,createSystemAuditExecutor} from './system-audit.js';
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { getOAuthProtectedResourceMetadataUrl, requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import type { McpServerFactory } from "@modelcontextprotocol/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { loadConfig } from "./config.js";
import { loadOAuthConfig, loadStaticBearerConfig, createJwtVerifier, createStaticBearerVerifier, createHybridVerifier } from "./oauth.js";
import { callProtectedService, callProtectedOperator, checkProtectedReadiness } from "./backend.js";
import { WebRequest } from "./contracts.js";
import {EVIDENCE_ADMISSION_SCOPE,ArtifactAdmissionSchema,EvidenceAdmissionSchema,evidenceAdmissionStatus,evidenceAdmissionChallenge,createEvidenceAdmissionExecutor,createArtifactAdmissionPreflight} from './evidence-admission.js';
import {fetchAuthorizedFile} from './file-input.js';
import { classifyWorkResponse } from "./work-response.js";
import { buildProtectedResourceMetadata } from "./resource-metadata.js";
import { createGlowMcpExpressApp, DEFAULT_MCP_JSON_LIMIT, PUBLIC_HTML_CSP } from "./mcp-app.js";
import { NextFactoryControlInputSchema } from "./next-factory-schema.js";
import { resolveHostDomainTopology } from "./domain-topology.js";
import {PHASE_ACCEPTANCE_SCOPE,PHASE_ACCEPTANCE_MISSION_PATTERN,toolOAuthMetadata,phaseAcceptanceActor,phaseAcceptanceAuthChallenge,phaseAcceptanceAuthorityStatus,validateAcceptanceBytes} from './phase-acceptance.js';
import { queryTemplates, getTemplateById, isValidTemplateId } from "./template-registry.js";
import { renderTemplateHtml, buildTemplateSourcePayload, escapeHtml } from "./template-renderer.js";

const HOST_ADAPTER_REVISION = "0.3.10-file-artifact-input-candidate";
const HOST_CONTRACT_ID = "GWF_NEXT_FACTORY_ACTIVE_DEMO_CANDIDATE_V2";
const config = loadConfig();
export const domainTopology = resolveHostDomainTopology(process.env, config.port);
const configuredMcpServerUrl = new URL(process.env.GLOW_PUBLIC_MCP_URL?.trim() || domainTopology.mcpResourceUrl);
const configuredAuthMode = (process.env.GLOW_AUTH_MODE?.trim() || "static_bearer").toLowerCase();
if (!["static_bearer","oauth","hybrid"].includes(configuredAuthMode)) {
  throw new Error("CONFIG_AUTH_MODE_INVALID");
}
const authMode = configuredAuthMode as "static_bearer"|"oauth"|"hybrid";
const gatewayProfile=process.env.GLOW_GATEWAY_PROFILE?.trim()||(config.combinedRuntimeModule?'DEMO':'DEVELOPMENT');
if(!['DEVELOPMENT','DEMO','PRODUCTION'].includes(gatewayProfile))throw Error('GATEWAY_PROFILE_INVALID');
if(gatewayProfile!=='DEVELOPMENT'&&authMode!=='oauth')throw Error('GATEWAY_OAUTH_ONLY_REQUIRED');
const oauthConfig = authMode === "static_bearer" ? null : loadOAuthConfig();
const requiredScopes = authMode === "static_bearer"
  ? ["web.run"]
  : (process.env.GLOW_OAUTH_REQUIRED_SCOPES ?? "web.run")
      .split(/\s+/).map(v=>v.trim()).filter(Boolean);
if(!requiredScopes.length)throw Error('GATEWAY_ACTION_SCOPE_REQUIRED');
if(gatewayProfile!=='DEVELOPMENT'&&requiredScopes.some(x=>['email','openid','profile'].includes(x)))throw Error('GATEWAY_ACTION_SCOPE_REQUIRED');
const AuthorizedFileAdmissionSchema=z.object({
  mission_id:z.string().regex(/^NM-[a-f0-9]{12}$/),
  expected_state_version:z.number().int().min(1),
  phase_work_id:z.string().min(1).max(128),
  work_contract_revision:z.number().int().min(1),
  file:z.object({
    download_url:z.string().min(1),
    file_id:z.string().min(1),
    mime_type:z.string().min(1).optional(),
    file_name:z.string().min(1).optional()
  }).strict()
}).strict();

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
  if(operation==='approve_stage'||operation==='recover_blocked_stage')throw Error('LEGACY_AUTHORITY_MUTATION_DISABLED');
  const request = WebRequest.parse({
    request_id: request_id ?? randomUUID(),
    operation, role, locale, input
  });
  return callProtectedService(config, subject, request);
}

const admitEvidence=createEvidenceAdmissionExecutor(
 (subject,request)=>callProtectedService(config,subject,request),
 (subject,request,actor)=>callProtectedOperator(config,subject,request,actor!)
);
const preflightArtifactFile=createArtifactAdmissionPreflight((subject,request)=>callProtectedService(config,subject,request));
const reportSystemAudit=createSystemAuditExecutor((subject,request,actor)=>callProtectedOperator(config,subject,request,actor));
const buildServer: McpServerFactory = ctx => {
  const server = new McpServer(
    { name: "glow-web", version: HOST_ADAPTER_REVISION },
    {
      instructions:
        "Use GLOW Web for the user's explicit web mission or Factory audit request. Audit reports record bounded observations and repair proposals; registration is not verified quality, automatic defect closure or phase approval. ChatGPT is the reasoning/intelligence host. The backend owns Factory state, validation, approval binding, freeze/admission, evidence and delivery boundaries. The legacy RC4 flow is a frozen A/B baseline retained for controlled post-demo comparison only; it is not a fallback for a Next Factory mission. The Next Factory is the active demo candidate path. For current demo operation require execution_profile=DEMO_BOUNDED, preserve its degraded claim ceiling, and never describe demo capability use as hard-admitted or production-ready. When a work package is returned, perform only that bounded work, then submit the result. Never invent success, approvals, evidence, or Factory state."
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
      status: "NEXT_FACTORY_V2_BOUNDED_DEMO_CANDIDATE_NOT_PRODUCTION_QUALIFIED",
      legacy_contract_id: "RC4_FULL_WORK_LOOP_PERSISTENT_V1",
      legacy_route_is_next_factory_authority: false,
      next_factory_demo: "DEMO_BOUNDED_CONNECTED_CANDIDATE",
      current_connection_phase_acceptance: phaseAcceptanceAuthorityStatus(ctx.authInfo),
      current_request_evidence_admission: evidenceAdmissionStatus(ctx.authInfo),
      connection_diagnostics: connectionDiagnostics(ctx.authInfo),
      system_audit_contract: {version:"GWF_SYSTEM_AUDIT_V1",report_tool:"glow_report_system_audit",read_tool:"glow_get_system_audit",required_scope:"web.evidence.admit",coverage:"FACTORY_OR_ANY_MISSION_PHASE",finding_verification:"REPORTER_SUPPLIED"},
      next_factory_production_fork: "BLOCKED_HARD_ADMISSION_REQUIRED"
    })
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
      description:"Prepares and inspects bounded Next Factory work. Canonical V2 work route. Evidence admission and acceptance use separate verified OAuth scopes on this same MCP endpoint; role labels cannot grant authority. Factory Control owns state and exact versions. Do not retry authority errors with invented HUMAN labels or legacy routes.",
      annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
      ...(toolSecuritySchemes ? { securitySchemes: toolSecuritySchemes } : {}),
      inputSchema:NextFactoryControlInputSchema
    },
    async ({action,args,role,locale}) => {
      try {
        if(action==='register_system_audit'){
          if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
          try{
            const out=await reportSystemAudit(ctx.authInfo,args);
            return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
          }catch(error){
            const code=error instanceof Error?error.message:'SYSTEM_AUDIT_FAILED';
            const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
            return {...toolError(code),...(challenge?{_meta:challenge}:{})};
          }
        }
        if(action==='evidence_admission_preflight'){
          const status=evidenceAdmissionStatus(ctx.authInfo);
          const challenge=evidenceAdmissionChallenge(status.code,resourceMetadataV2Url);
          return {...toolResult(status),...(!status.eligible?{isError:true}:{}),...(challenge?{_meta:challenge}:{})};
        }
        if(action==='register_artifact'||action==='register_evidence'){
          if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
          try{
            const out=await admitEvidence(ctx.authInfo,{action,args});
            return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
          }catch(error){
            const code=error instanceof Error?error.message:'EVIDENCE_ADMISSION_FAILED';
            const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
            return {...toolError(code),...(challenge?{_meta:challenge}:{})};
          }
        }
        const out=await invoke(ctx,"next_factory_control",role,locale,{action,args});
        const classification=classifyWorkResponse(out);
        if(classification==="SAFE_PUBLIC_FAILURE") return {isError:true,...toolResult(out as unknown as Record<string,unknown>)};
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

  server.registerTool('glow_prepare_phase_acceptance',{
    title:'Prepare an exact V2 phase approval',
    description:'Read-only operator authorization preflight, validation and exact JSON/hash preparation for H1/H2/H3 review. Requires verified OAuth web.accept authority and triggers scope authorization before review. Does not approve, advance or grant authority. Present the proposed content for explicit user approval, then pass the unchanged returned JSON/hash to acceptance.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,PHASE_ACCEPTANCE_SCOPE]):{}),
    inputSchema:z.object({mission_id:z.string().regex(PHASE_ACCEPTANCE_MISSION_PATTERN).max(128),expected_state_version:z.number().int().min(1),phase:z.enum(['H1','H2','H3']),payload:z.record(z.string(),z.unknown()),locale:z.string().min(2).max(32).default('vi-VN')}).strict()
  },async input=>{
    try{
      if(authMode!=='oauth')throw Error('OPERATOR_OAUTH_ONLY_REQUIRED');
      phaseAcceptanceActor(ctx.authInfo);
      const {locale,...args}=input;
      return toolResult(await invoke(ctx,'next_factory_control','unspecified',locale,{action:'prepare_phase_acceptance',args}) as unknown as Record<string,unknown>);
    }catch(error){
      const code=error instanceof Error?error.message:'PHASE_ACCEPTANCE_PREPARATION_FAILED';
      const challenge=phaseAcceptanceAuthChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });
  server.registerTool('glow_next_factory_accept_phase',{
    title:'Accept a bound V2 phase',
    description:'Accept H1/H2/H3 only with verified OAuth web.accept authority. Requires explicit approval of the exact payload JSON/hash and mission/state version. Never invent authority, reset missions, or use role labels. Reuse request_id only for the identical approval; reconcile UNKNOWN_OUTCOME instead of blindly retrying.',
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,PHASE_ACCEPTANCE_SCOPE]):{}),
    inputSchema:z.object({request_id:z.string().min(1).max(128),mission_id:z.string().regex(PHASE_ACCEPTANCE_MISSION_PATTERN).max(128),expected_state_version:z.number().int().min(1),phase:z.enum(['H1','H2','H3']),payload_json:z.string().min(2).max(1024*1024),payload_sha256:z.string().regex(/^[0-9a-f]{64}$/),locale:z.string().min(2).max(32).default('vi-VN')}).strict()
  },async input=>{
    try{
      if(authMode!=='oauth')throw Error('OPERATOR_OAUTH_ONLY_REQUIRED');
      const subject=subjectFrom(ctx);
      const actor=phaseAcceptanceActor(ctx.authInfo);
      validateAcceptanceBytes(input.payload_json,input.payload_sha256);
      const {request_id,locale,...args}=input;
      const request=WebRequest.parse({request_id,operation:'next_factory_control',role:'unspecified',locale,input:{action:'accept_phase',args}});
      return toolResult(await callProtectedOperator(config,subject,request,actor) as unknown as Record<string,unknown>);
    }catch(error){
      const code=error instanceof Error?error.message:'PHASE_ACCEPTANCE_FAILED';
      const challenge=phaseAcceptanceAuthChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });

  server.registerTool('glow_phase_acceptance_preflight',{
    title:'Check phase acceptance authority',
    description:'Read-only check of this request token for web.accept scope and RBAC. Requires no mission or approval payload. Does not prepare, approve, advance or grant authority.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,PHASE_ACCEPTANCE_SCOPE]):{}),
    inputSchema:z.object({}).strict()
  },async()=>{
    const status=phaseAcceptanceAuthorityStatus(ctx.authInfo);
    const challenge=phaseAcceptanceAuthChallenge(status.code,resourceMetadataV2Url);
    return {...toolResult(status),...(challenge?{isError:true,_meta:challenge}:{})};
  });
  server.registerTool('glow_evidence_admission_preflight',{
    title:'Check evidence admission authority',
    description:'Read-only check of this request token for dedicated evidence admission scope and RBAC. Does not register evidence, approve a phase or certify quality.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    inputSchema:z.object({}).strict()
  },async()=> {
    const status=evidenceAdmissionStatus(ctx.authInfo);
    const challenge=evidenceAdmissionChallenge(status.code,resourceMetadataV2Url);
    return {...toolResult(status),...(challenge?{isError:true,_meta:challenge}:{})};
  });
  server.registerTool('glow_register_factory_artifact',{
    title:'Register actual H2 artifact bytes',
    description:'Requires dedicated web.evidence.admit scope and RBAC. Upload actual bytes bound to the current mission/work/version. Returns identity only, not quality approval. Never upload dummy bytes or invent evidence.',
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    inputSchema:ArtifactAdmissionSchema
  },async args=>{
    try{
      if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
      const out=await admitEvidence(ctx.authInfo,{action:'register_artifact',args});
      return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
    }catch(error){
      const code=error instanceof Error?error.message:'ARTIFACT_ADMISSION_FAILED';
      const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });
  server.registerTool('glow_register_factory_artifact_file',{
    title:'Register actual H2 artifact from authorized ChatGPT file',
    description:'Requires dedicated web.evidence.admit scope and RBAC. Reads one ChatGPT-authorized file reference, enforces bounded HTTPS transport, then submits the exact bytes through the existing canonical artifact admission path. Returns identity only, not quality approval. Never upload dummy bytes or invent evidence.',
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    _meta:{'openai/fileParams':['file']},
    inputSchema:AuthorizedFileAdmissionSchema
  },async ({file,...binding})=>{
    try{
      if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
      const preflight=await preflightArtifactFile(ctx.authInfo,binding);
      if(preflight.status==='failed'||!preflight.result)return {...toolResult(preflight as unknown as Record<string,unknown>),isError:true};
      const fetched=await fetchAuthorizedFile(file);
      const localSha=createHash('sha256').update(fetched.bytes).digest('hex');
      const args={...binding,data_base64:fetched.bytes.toString('base64')};
      const out=await admitEvidence(ctx.authInfo,{action:'register_artifact',args});
      if(out.status!=='accepted')return {...toolResult(out as unknown as Record<string,unknown>),isError:true};
      const payload=(out.result as {payload?:Record<string,unknown>}|null)?.payload;
      const backendSha=payload?.artifact_sha256;
      if(typeof backendSha!=='string'||backendSha!==localSha)throw Error('FILE_ARTIFACT_SHA_MISMATCH');
      return toolResult({
        ...(out as unknown as Record<string,unknown>),
        file_transport:{file_id:fetched.file_id,size_bytes:fetched.bytes.byteLength,sha256:localSha,mime_type:fetched.mime_type,file_name:fetched.file_name}
      });
    }catch(error){
      const code=error instanceof Error?error.message:'FILE_ARTIFACT_ADMISSION_FAILED';
      const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });
  server.registerTool('glow_register_factory_evidence',{
    title:'Admit reviewed H2 evidence',
    description:'Requires dedicated web.evidence.admit scope and RBAC. Registers CAPABILITY or ASSURANCE evidence for actual previously admitted bytes with exact H2 binding. Returns server-issued GE. Registration is operator attestation, not independent qualification or phase approval.',
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    inputSchema:EvidenceAdmissionSchema
  },async args=>{
    try{
      if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
      const out=await admitEvidence(ctx.authInfo,{action:'register_evidence',args});
      return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
    }catch(error){
      const code=error instanceof Error?error.message:'EVIDENCE_ADMISSION_FAILED';
      const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });
  server.registerTool('glow_report_system_audit',{
    title:'Record a Factory-wide or mission audit',
    description:'Requires web.run and web.evidence.admit plus RBAC. Records actual observations, evidence references, reproduction, severity and recommended repairs for any Factory stage. Findings and source identity are reporter supplied. Does not scan automatically, issue GE receipts, certify quality, close defects or approve phases. Redact secrets from reports.',
    annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    inputSchema:SystemAuditSchema
  },async report=>{
    try{
      if(authMode!=='oauth')throw Error('EVIDENCE_OAUTH_ONLY_REQUIRED');
      const out=await reportSystemAudit(ctx.authInfo,report);
      return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
    }catch(error){
      const code=error instanceof Error?error.message:'SYSTEM_AUDIT_FAILED';
      const challenge=evidenceAdmissionChallenge(code,resourceMetadataV2Url);
      return {...toolError(code),...(challenge?{_meta:challenge}:{})};
    }
  });
  server.registerTool('glow_get_system_audit',{
    title:'Read an audit submitted by this identity',
    description:'Read the persisted audit report for the current authenticated subject. Does not expose other users reports or certify their findings.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(toolSecuritySchemes?{securitySchemes:toolSecuritySchemes}:{}),
    inputSchema:GetSystemAuditSchema
  },async args=>{
    try{
      const out=await invoke(ctx,'next_factory_control','unspecified','vi-VN',{action:'get_system_audit',args});
      return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
    }catch(error){return toolError(error instanceof Error?error.message:'SYSTEM_AUDIT_READ_FAILED');}
  });
  server.registerTool('glow_inspect_factory_artifact',{
    title:'Inspect current artifact admission',
    description:'Read-only owner-scoped lookup by exact mission and actual artifact SHA256. Verifies stored bytes. Current presence does not prove the outcome of an earlier lost-response call, quality, GE evidence or phase acceptance.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(toolSecuritySchemes?{securitySchemes:toolSecuritySchemes}:{}),
    inputSchema:ArtifactLookupSchema
  },async args=>{
    try{
      const out=await invoke(ctx,'next_factory_control','unspecified','vi-VN',{action:'inspect_artifact_admission',args});
      return {...toolResult(out as unknown as Record<string,unknown>),...(out.status==='failed'?{isError:true}:{})};
    }catch(error){return toolError(error instanceof Error?error.message:'ARTIFACT_LOOKUP_FAILED');}
  });
  return server;
};

export const handler = createMcpHandler(buildServer);
const deferredMcpPaths = [
  "/mcp-v2",
  ...(domainTopology.basePath ? [`${domainTopology.basePath}/mcp-v2`] : []),
];
export const app = createGlowMcpExpressApp(
  (process.env.GLOW_ALLOWED_HOSTS ?? "localhost,127.0.0.1").split(",").map(v=>v.trim()).filter(Boolean),
  DEFAULT_MCP_JSON_LIMIT,
  { deferredJsonPaths: deferredMcpPaths }
);

const mcpServerUrl = configuredMcpServerUrl;
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);
const resourceMetadata = buildProtectedResourceMetadata({
  resource:mcpServerUrl.toString(),
  authMode,
  oauthIssuer:authMode === "static_bearer" ? null : oauthConfig!.issuer,
  scopes:[...new Set([...requiredScopes,PHASE_ACCEPTANCE_SCOPE,EVIDENCE_ADMISSION_SCOPE])]
});
const auth = requireBearerAuth({
  verifier,
  requiredScopes,
  resourceMetadataUrl
});

const resourceMetadataV2Url=resourceMetadataUrl;
const mcpLargeJsonParser = express.json({ limit: "12mb" });
const authV2: express.RequestHandler = (req, res, next) => {
  auth(req, res, (authErr?: unknown) => {
    if (authErr) {
      next(authErr);
      return;
    }
    mcpLargeJsonParser(req, res, next);
  });
};

const node = toNodeHandler(handler);

const resourceMetadataPath = new URL(resourceMetadataUrl).pathname;
app.get(resourceMetadataPath, (_req,res) => {
  res.json(resourceMetadata);
});

app.get("/.well-known/oauth-authorization-server", (_req,res) => {
  if (authMode === "static_bearer" || !oauthConfig) {
    res.status(404).json({error:"OAUTH_NOT_CONFIGURED"});
    return;
  }
  res.status(404).json({
    error:"EXTERNAL_AUTHORIZATION_SERVER",
    authorization_server:oauthConfig.issuer.replace(/\/$/,""),
    discovery_via:resourceMetadataPath
  });
});

const publicDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");
const FLAGSHIP_IMAGE_ASSETS = [
  "hero-ocean-jade.webp",
  "reel-01-botanical.webp",
  "reel-02-coastal-villa.webp",
  "reel-03-liquid-prism.webp",
  "basalt-terrace-deck.webp",
] as const;

const TEMPLATE_IMAGE_ASSETS = [
  "coastal-glass-architecture.webp",
  "botanical-wellness-sanctuary.webp",
  "ocean-obsidian-ai-platform.webp",
  "atelier-maison-luxury.webp",
  "azure-horizon-resort.webp",
  "jade-botanical-skincare.webp",
  "silver-prism-creative-studio.webp",
  "calm-sea-fine-dining.webp",
  "serene-clinic-medical.webp",
  "monolith-advisory-legal.webp",
  "kinetic-academy-edtech.webp",
  "veranda-interior-atelier.webp",
] as const;

const FLAGSHIP_VIDEO_ASSETS = [
  "hero-ocean-jade.mp4",
  "reel-01-botanical.mp4",
  "reel-02-coastal-villa.mp4",
  "reel-03-liquid-prism.mp4",
] as const;

const PUBLIC_PLATFORM_ROUTES = [
  "/product",
  "/solutions",
  "/resources",
  "/pricing",
] as const;

function firstQueryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function cleanSingleLineParam(value: string | undefined, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : undefined;
}

const ALLOWED_STANDALONE_NEXT_PATHS = new Set([
  "/",
  "/app",
  "/product",
  "/solutions",
  "/resources",
  "/pricing",
  "/workspace",
  "/privacy",
]);

function sanitizeStandaloneNextPath(
  rawNext: string | undefined,
  prefix: string,
  extra: { readonly brand?: string; readonly template?: string; readonly lang?: "vi" | "en" }
): string {
  const defaultNext = `${prefix}/workspace`;
  let targetPath = defaultNext;
  if (typeof rawNext === "string") {
    const trimmed = rawNext.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= 256 &&
      trimmed.startsWith("/") &&
      !trimmed.startsWith("//") &&
      !/[\u0000-\u001F\u007F\\]/.test(trimmed) &&
      !trimmed.split(/[/?#]/).includes("..") &&
      !/%2e|%5c/i.test(trimmed) &&
      !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ) {
      try {
        const parsed = new URL(trimmed, "http://glow.internal");
        const unprefixed =
          prefix && (parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))
            ? parsed.pathname.slice(prefix.length) || "/"
            : parsed.pathname;
        if (
          parsed.origin === "http://glow.internal" &&
          parsed.pathname.startsWith("/") &&
          !parsed.pathname.startsWith("//") &&
          ALLOWED_STANDALONE_NEXT_PATHS.has(unprefixed)
        ) {
          if (prefix && parsed.pathname === "/workspace") {
            parsed.pathname = `${prefix}/workspace`;
          }
          targetPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        targetPath = defaultNext;
      }
    }
  }
  try {
    const enriched = new URL(targetPath, "http://glow.internal");
    if (enriched.pathname === "/workspace" || (prefix && enriched.pathname === `${prefix}/workspace`)) {
      if (extra.template && isValidTemplateId(extra.template) && !enriched.searchParams.has("template")) {
        enriched.searchParams.set("template", extra.template);
      }
      if (extra.brand && !enriched.searchParams.has("brand")) {
        enriched.searchParams.set("brand", extra.brand);
      }
      if (extra.lang && !enriched.searchParams.has("lang")) {
        enriched.searchParams.set("lang", extra.lang);
      }
      return `${enriched.pathname}${enriched.search}${enriched.hash}`;
    }
  } catch {
    return defaultNext;
  }
  return targetPath;
}

function renderStandalonePrivacyHtml(prefix: string, isEn: boolean): string {
  const homeHref = prefix || "/";
  const workspaceHref = `${prefix}/workspace`;
  return `<!doctype html>
<html lang="${isEn ? "en" : "vi"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isEn ? "GLOW Web · Privacy & Security Policy" : "GLOW Web · Chính sách Quyền riêng tư & Bảo mật"}</title>
  <style>
    :root{color-scheme:light;font-family:"SF Pro Display","Inter","Segoe UI",-apple-system,system-ui,sans-serif}
    body{margin:0;padding:40px 20px;background:linear-gradient(176deg,#E7F3EF 0%,#F4FAF8 50%,#E6F2EE 100%);color:#071E2B;line-height:1.68}
    main{max-width:780px;margin:0 auto;background:#FFFFFF;border:1px solid #ACC8BF;border-radius:24px;padding:36px;box-shadow:0 24px 56px -24px rgba(7,30,43,.14)}
    .eyebrow{font-size:11px;font-weight:700;letter-spacing:.18em;color:#147A5B;text-transform:uppercase}
    h1{margin:10px 0 14px;font-size:clamp(1.7rem,3vw,2.3rem);line-height:1.18}
    h2{margin:24px 0 8px;font-size:1.12rem;color:#0E5E46}
    p,li{color:#2B4C59;font-size:15px}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
    a.btn{display:inline-flex;align-items:center;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:650;font-size:14px;border:1px solid #ACC8BF;color:#071E2B}
    a.btn.primary{background:linear-gradient(135deg,#168664 0%,#116D51 100%);color:#FFFFFF;border-color:#116D51}
  </style>
</head>
<body data-glow-page="standalone-privacy-policy">
  <main>
    <div class="eyebrow">GLOW WEB · PRIVACY &amp; DATA STEWARDSHIP</div>
    <h1>${isEn ? "Privacy &amp; Data Protection Policy" : "Chính sách Quyền riêng tư &amp; Bảo vệ Dữ liệu"}</h1>
    <p>${isEn ? "GLOW Web processes identity, project briefs, and authorized workspace artifacts strictly to operate your requested digital studio workflows." : "GLOW Web chỉ xử lý thông tin định danh, bản mô tả yêu cầu thiết kế và tài nguyên dự án được ủy quyền nhằm phục vụ trực tiếp không gian chế tác website của bạn."}</p>
    <h2>${isEn ? "1. Data Minimization &amp; Isolation" : "1. Tối thiểu hóa &amp; Cô lập Dữ liệu"}</h2>
    <ul>
      <li>${isEn ? "Public storefront drafts prepared in browser memory stay local until you explicitly sign in or submit through an authenticated channel." : "Bản nháp chuẩn bị trên trình duyệt tại trang công khai không tự động gửi đi khi chưa có thao tác xác thực rõ ràng của bạn."}</li>
      <li>${isEn ? "Authenticated workspace sessions enforce tenant isolation, CSRF verification, and strict Content-Security-Policy boundaries." : "Phiên làm việc đã xác thực áp dụng cô lập dữ liệu theo không gian làm việc, kiểm tra chống giả mạo yêu cầu (CSRF) và chính sách bảo mật nội dung (CSP) nghiêm ngặt."}</li>
    </ul>
    <h2>${isEn ? "2. Zero Third-Party Advertising Sale" : "2. Không bán hoặc chia sẻ dữ liệu quảng cáo"}</h2>
    <p>${isEn ? "GLOW never sells customer briefs, email addresses, or OAuth profile attributes to third-party ad networks." : "GLOW tuyệt đối không bán bản mô tả dự án, địa chỉ email hoặc thông tin hồ sơ đăng nhập cho bên thứ ba phục vụ quảng cáo."}</p>
    <div class="actions">
      <a class="btn primary" href="${escapeHtml(workspaceHref)}">${isEn ? "Open Studio Workspace" : "Mở Không gian dự án"}</a>
      <a class="btn" href="${escapeHtml(homeHref)}">${isEn ? "← Back to GLOW Web" : "← Về trang chủ GLOW Web"}</a>
    </div>
  </main>
</body>
</html>`;
}

function renderStandaloneLoginBridgeHtml(opts: {
  readonly prefix: string;
  readonly isEn: boolean;
  readonly isSignup: boolean;
  readonly loginHint?: string;
  readonly brand?: string;
  readonly safeNext: string;
}): string {
  const homeHref = opts.prefix || "/";
  const privacyHref = `${opts.prefix}/privacy${opts.isEn ? "?lang=en" : ""}`;
  return `<!doctype html>
<html lang="${opts.isEn ? "en" : "vi"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.isEn ? "GLOW Web · Studio Sign-In Gateway" : "GLOW Web · Cổng kết nối Không gian dự án"}</title>
  <style>
    :root{color-scheme:light;font-family:"SF Pro Display","Inter","Segoe UI",-apple-system,system-ui,sans-serif}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px 16px;background:linear-gradient(176deg,#E7F3EF 0%,#F4FAF8 50%,#E6F2EE 100%);color:#071E2B;line-height:1.62}
    main{width:min(520px,100%);background:#FFFFFF;border:1px solid #ACC8BF;border-radius:24px;padding:32px;box-shadow:0 24px 56px -24px rgba(7,30,43,.16)}
    .eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;color:#147A5B;text-transform:uppercase}
    h1{margin:10px 0 10px;font-size:1.65rem;line-height:1.22}
    p{margin:0 0 14px;color:#2B4C59;font-size:14.5px}
    .meta{background:#EEF6F3;border:1px solid #ACC8BF;border-radius:14px;padding:12px 14px;margin:14px 0;font-size:13.5px;color:#071E2B}
    .meta div+div{margin-top:6px}
    .actions{display:flex;flex-direction:column;gap:10px;margin-top:20px}
    a.btn{display:inline-flex;justify-content:center;align-items:center;min-height:46px;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:650;font-size:14px;border:1px solid #ACC8BF;color:#071E2B}
    a.btn.primary{background:linear-gradient(135deg,#168664 0%,#116D51 100%);color:#FFFFFF;border-color:#116D51}
    .foot{margin-top:18px;padding-top:14px;border-top:1px solid #D9EFE6;display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:#506F7B}
    .foot a{color:inherit;text-decoration:none}
  </style>
</head>
<body data-glow-page="standalone-auth-bridge" data-glow-auth-state="STANDALONE_PUBLIC_HOST_NO_LOCAL_SESSION">
  <main>
    <div class="eyebrow">${opts.isSignup ? (opts.isEn ? "STUDIO ONBOARDING" : "KHỞI TẠO TÀI KHOẢN STUDIO") : (opts.isEn ? "STUDIO ACCESS" : "TRUY CẬP STUDIO")}</div>
    <h1>${opts.isSignup ? (opts.isEn ? "Continue to GLOW Studio Draft" : "Tiếp tục khởi tạo dự án trên GLOW Studio") : (opts.isEn ? "GLOW Web Standalone Gateway" : "Cổng GLOW Web độc lập")}</h1>
    <p role="status" aria-live="polite">${opts.isEn ? "This standalone public host serves template previews, draft preparation, and OAuth-protected MCP tools (/mcp-v2). Interactive Google Sign-In &amp; Email OTP sessions run on the unified GLOW Identity Service." : "Máy chủ giao diện công khai độc lập này phục vụ xem trước mẫu website, chuẩn bị bản nháp và cổng kết nối AI (/mcp-v2). Đăng nhập phiên trực tiếp (Google OIDC / Email OTP) hoạt động khi kết nối cùng Dịch vụ Định danh Hợp nhất GLOW."}</p>
    ${
      opts.loginHint || opts.brand
        ? `<div class="meta">
            ${opts.loginHint ? `<div><strong>Email:</strong> <span data-glow-login-hint="true">${escapeHtml(opts.loginHint)}</span></div>` : ""}
            ${opts.brand ? `<div><strong>${opts.isEn ? "Brand / Project:" : "Thương hiệu / Dự án:"}</strong> <span data-glow-signup-brand="true">${escapeHtml(opts.brand)}</span></div>` : ""}
          </div>`
        : ""
    }
    <div class="actions">
      <a class="btn primary" data-glow-continue-workspace="true" href="${escapeHtml(opts.safeNext)}">${opts.isEn ? "Continue to Studio Draft Workspace →" : "Tiếp tục vào Không gian dự án (Bản nháp) →"}</a>
      <a class="btn" href="${escapeHtml(homeHref)}">${opts.isEn ? "← Back to Homepage" : "← Quay lại Trang chủ"}</a>
    </div>
    <div class="foot">
      <span>STANDALONE_HOST_BRIDGE</span>
      <a href="${escapeHtml(privacyHref)}">${opts.isEn ? "Privacy Policy" : "Chính sách Quyền riêng tư"}</a>
    </div>
  </main>
</body>
</html>`;
}

function sendPublicHtmlShell(res: express.Response, fileName: string): void {
  res.setHeader("Content-Security-Policy", PUBLIC_HTML_CSP);
  res.type("html").sendFile(fileName, { root: publicDir });
}

function registerPublicTemplateAndPlatformRoutes(prefix: string): void {
  for (const route of PUBLIC_PLATFORM_ROUTES) {
    app.get(`${prefix}${route}`, (_req, res) => {
      sendPublicHtmlShell(res, "index.html");
    });
  }

  app.get(`${prefix}/privacy`, (req, res) => {
    const langParam = firstQueryString(req.query.lang)?.trim().toLowerCase();
    const isEn = langParam === "en";
    res.setHeader("Content-Security-Policy", PUBLIC_HTML_CSP);
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).type("html").send(renderStandalonePrivacyHtml(prefix, isEn));
  });

  app.get(`${prefix}/auth/login`, (req, res) => {
    const langParam = firstQueryString(req.query.lang)?.trim().toLowerCase();
    const isEn = langParam === "en";
    const modeParam = firstQueryString(req.query.mode)?.trim().toLowerCase();
    const isSignup = modeParam === "signup";
    const loginHint = cleanSingleLineParam(firstQueryString(req.query.login_hint), 160);
    const brand = cleanSingleLineParam(firstQueryString(req.query.brand), 80);
    const templateParam = cleanSingleLineParam(firstQueryString(req.query.template), 64);
    const safeNext = sanitizeStandaloneNextPath(firstQueryString(req.query.next), prefix, {
      brand,
      template: templateParam,
      lang: langParam === "en" ? "en" : langParam === "vi" ? "vi" : undefined,
    });
    res.setHeader("Content-Security-Policy", PUBLIC_HTML_CSP);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).type("html").send(
      renderStandaloneLoginBridgeHtml({
        prefix,
        isEn,
        isSignup,
        loginHint,
        brand,
        safeNext,
      })
    );
  });

  app.get(`${prefix}/api/templates`, (req, res) => {
    const featuredParam = firstQueryString(req.query.featured)?.trim().toLowerCase();
    const payload = queryTemplates({
      industry: firstQueryString(req.query.industry),
      category: firstQueryString(req.query.category),
      mood: firstQueryString(req.query.mood),
      q: firstQueryString(req.query.q),
      featuredOnly: featuredParam === "1" || featuredParam === "true",
      mcpResource: "/mcp-v2",
    });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(payload);
  });

  app.get(`${prefix}/api/templates/:id`, (req, res) => {
    const rawId = Array.isArray(req.params.id) ? "" : String(req.params.id ?? "");
    const result = getTemplateById(rawId);
    if (!result.ok) {
      res.status(result.status).json({
        ok: false,
        error: result.code,
      });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(result);
  });

  app.get(`${prefix}/api/templates/:id/render`, (req, res) => {
    const rawId = Array.isArray(req.params.id) ? "" : String(req.params.id ?? "");
    const result = getTemplateById(rawId);
    if (!result.ok) {
      res.status(result.status).json({
        ok: false,
        error: result.code,
      });
      return;
    }
    const langParam = firstQueryString(req.query.lang)?.trim().toLowerCase();
    const lang = langParam === "en" ? "en" : "vi";
    const html = renderTemplateHtml(result.template, {
      lang,
      brand: firstQueryString(req.query.brand),
      brief: firstQueryString(req.query.brief),
      basePath: prefix,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self'"
    );
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(html);
  });

  app.get(`${prefix}/api/templates/:id/source`, (req, res) => {
    const rawId = Array.isArray(req.params.id) ? "" : String(req.params.id ?? "");
    const result = getTemplateById(rawId);
    if (!result.ok) {
      res.status(result.status).json({
        ok: false,
        error: result.code,
      });
      return;
    }
    const langParam = firstQueryString(req.query.lang)?.trim().toLowerCase();
    const lang = langParam === "en" ? "en" : "vi";
    const payload = buildTemplateSourcePayload(result.template, lang, {
      brand: firstQueryString(req.query.brand),
      brief: firstQueryString(req.query.brief),
      basePath: prefix,
    });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(payload);
  });
}

app.get("/",(_req,res) => {
  sendPublicHtmlShell(res, "index.html");
});

app.get("/app",(_req,res) => {
  sendPublicHtmlShell(res, "index.html");
});
registerPublicTemplateAndPlatformRoutes("");
app.get("/workspace",(_req,res) => {
  sendPublicHtmlShell(res, "workspace.html");
});
app.get("/workspace.css",(_req,res) => {
  res.type("text/css; charset=utf-8").sendFile("workspace.css", { root: publicDir });
});
app.get("/workspace.js",(_req,res) => {
  res.type("application/javascript; charset=utf-8").sendFile("workspace.js", { root: publicDir });
});


app.get("/app.css",(_req,res) => {
  res.type("text/css").sendFile("app.css", { root: publicDir });
});

app.get("/app.js",(_req,res) => {
  res.type("application/javascript").sendFile("app.js", { root: publicDir });
});

for (const file of FLAGSHIP_IMAGE_ASSETS) {
  app.get("/assets/" + file, (_req, res) => {
    res.type("image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(`assets/${file}`, { root: publicDir });
  });
}

for (const file of TEMPLATE_IMAGE_ASSETS) {
  app.get("/assets/templates/" + file, (_req, res) => {
    res.type("image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(`assets/templates/${file}`, { root: publicDir });
  });
}

for (const file of FLAGSHIP_VIDEO_ASSETS) {
  app.get("/assets/" + file, (_req, res) => {
    res.type("video/mp4");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(`assets/${file}`, { root: publicDir });
  });
}


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

app.get("/healthz", (_req,res) => {
  res.json({ok:true,product:"GLOW Web",version:HOST_ADAPTER_REVISION,contract_id:HOST_CONTRACT_ID,mode:"CHATGPT_WORK_LOOP"});
});

app.get("/readyz", async (_req,res) => {
  if(gatewayProfile!=='DEVELOPMENT'&&(authMode!=='oauth'||!config.combinedRuntimeModule)){
    res.status(503).json({ok:false,product:'GLOW Web',code:'CANONICAL_OAUTH_RUNTIME_NOT_CONFIGURED'});return;
  }
  const readiness = await checkProtectedReadiness(config);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    product: "GLOW Web",
    version: HOST_ADAPTER_REVISION,
    contract_id: HOST_CONTRACT_ID,
    public_host: "running",
    protected_factory: readiness.ok ? "reachable_authenticated" : "unavailable",
    code: readiness.code,
    evidence_admission_transport:"CANONICAL_OAUTH_MCP_IN_PROCESS",
    authority:"DEDICATED_SCOPE_AND_RBAC_CHECKED_PER_REQUEST",
    quality_acceptance:false
  });
});

app.all("/mcp-v2",authV2,(req,res)=>void node(req,res,req.body));

if (domainTopology.basePath) {
  const bp = domainTopology.basePath;
  app.get(bp, (_req, res) => {
    sendPublicHtmlShell(res, "index.html");
  });
  app.get(`${bp}/app`, (_req, res) => {
    sendPublicHtmlShell(res, "index.html");
  });
  registerPublicTemplateAndPlatformRoutes(bp);
  app.get(`${bp}/workspace`, (_req, res) => {
    sendPublicHtmlShell(res, "workspace.html");
  });
  app.get(`${bp}/workspace.css`, (_req, res) => {
    res.type("text/css; charset=utf-8").sendFile("workspace.css", { root: publicDir });
  });
  app.get(`${bp}/workspace.js`, (_req, res) => {
    res.type("application/javascript; charset=utf-8").sendFile("workspace.js", { root: publicDir });
  });
  app.get(`${bp}/app.css`, (_req, res) => {
    res.type("text/css").sendFile("app.css", { root: publicDir });
  });
  app.get(`${bp}/app.js`, (_req, res) => {
    res.type("application/javascript").sendFile("app.js", { root: publicDir });
  });
  for (const file of FLAGSHIP_IMAGE_ASSETS) {
    app.get(`${bp}/assets/${file}`, (_req, res) => {
      res.type("image/webp");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(`assets/${file}`, { root: publicDir });
    });
  }
  for (const file of TEMPLATE_IMAGE_ASSETS) {
    app.get(`${bp}/assets/templates/${file}`, (_req, res) => {
      res.type("image/webp");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(`assets/templates/${file}`, { root: publicDir });
    });
  }
  for (const file of FLAGSHIP_VIDEO_ASSETS) {
    app.get(`${bp}/assets/${file}`, (_req, res) => {
      res.type("video/mp4");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(`assets/${file}`, { root: publicDir });
    });
  }
  app.get(`${bp}/api/public/profile`, (_req, res) => {
    res.json({
      product: "GLOW Web",
      version: HOST_ADAPTER_REVISION,
      contract_id: HOST_CONTRACT_ID,
      status_label: "Public Experience candidate",
      surfaces: ["WEB_WORKSPACE", "MCP_OAUTH", "PUBLIC_RESULTS"],
      canonical_ai_resource: "/mcp-v2",
      mounted_ai_resource: domainTopology.mountedRoutes.mcpPath,
      deployment_topology: domainTopology.topologyMode,
      base_path: bp,
      private_factory_exposed: false,
      claim_limit: "CANDIDATE_NOT_HOSTINGER_VERIFIED"
    });
  });
  app.get(`${bp}/healthz`, (_req, res) => {
    res.json({ ok: true, product: "GLOW Web", version: HOST_ADAPTER_REVISION, contract_id: HOST_CONTRACT_ID, mode: "CHATGPT_WORK_LOOP", deployment_topology: domainTopology.topologyMode, base_path: bp });
  });
  app.get(`${bp}/readyz`, async (_req, res) => {
    if (gatewayProfile !== "DEVELOPMENT" && (authMode !== "oauth" || !config.combinedRuntimeModule)) {
      res.status(503).json({ ok: false, product: "GLOW Web", code: "CANONICAL_OAUTH_RUNTIME_NOT_CONFIGURED" });
      return;
    }
    const readiness = await checkProtectedReadiness(config);
    res.status(readiness.ok ? 200 : 503).json({
      ok: readiness.ok,
      product: "GLOW Web",
      version: HOST_ADAPTER_REVISION,
      contract_id: HOST_CONTRACT_ID,
      public_host: "running",
      protected_factory: readiness.ok ? "reachable_authenticated" : "unavailable",
      code: readiness.code,
      deployment_topology: domainTopology.topologyMode,
      base_path: bp,
      evidence_admission_transport: "CANONICAL_OAUTH_MCP_IN_PROCESS",
      authority: "DEDICATED_SCOPE_AND_RBAC_CHECKED_PER_REQUEST",
      quality_acceptance: false
    });
  });
  app.all(`${bp}/mcp-v2`, authV2, (req, res) => void node(req, res, req.body));
}

// Hostinger imports its entrypoint; startup cannot depend on argv/main identity.
// Only the explicitly isolated test fixture suppresses the network listener.
if(process.env.NODE_ENV!=='test'||process.env.GLOW_HOST_INPROCESS_TEST!=='1'){
 app.listen(config.port,()=>{
  console.error(`GLOW Web public host listening on :${config.port}`);
});

}
