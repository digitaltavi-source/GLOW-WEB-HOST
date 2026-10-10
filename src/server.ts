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
import { callProtectedService, callProtectedOperator, checkProtectedReadiness } from "./backend.js";
import { WebRequest } from "./contracts.js";
import {EVIDENCE_ADMISSION_SCOPE,ArtifactAdmissionSchema,EvidenceAdmissionSchema,evidenceAdmissionStatus,evidenceAdmissionChallenge,createEvidenceAdmissionExecutor} from './evidence-admission.js';
import { classifyWorkResponse } from "./work-response.js";
import { buildProtectedResourceMetadata } from "./resource-metadata.js";
import { createGlowMcpExpressApp } from "./mcp-app.js";
import { NextFactoryControlInputSchema } from "./next-factory-schema.js";
import {PHASE_ACCEPTANCE_SCOPE,PHASE_ACCEPTANCE_MISSION_PATTERN,toolOAuthMetadata,phaseAcceptanceActor,phaseAcceptanceAuthChallenge,phaseAcceptanceAuthorityStatus,validateAcceptanceBytes} from './phase-acceptance.js';

const HOST_ADAPTER_REVISION = "0.3.7-canonical-oauth-admission-candidate";
const HOST_CONTRACT_ID = "GWF_NEXT_FACTORY_ACTIVE_DEMO_CANDIDATE_V2";
const config = loadConfig();
const configuredMcpServerUrl = new URL(process.env.GLOW_PUBLIC_MCP_URL ?? `http://127.0.0.1:${config.port}/mcp`);
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
const buildServer: McpServerFactory = ctx => {
  const server = new McpServer(
    { name: "glow-web", version: HOST_ADAPTER_REVISION },
    {
      instructions:
        "Use GLOW Web only for the user's explicit web mission request. ChatGPT is the reasoning/intelligence host. The backend owns Factory state, validation, approval binding, freeze/admission, evidence and delivery boundaries. The legacy RC4 flow is a frozen A/B baseline retained for controlled post-demo comparison only; it is not a fallback for a Next Factory mission. The Next Factory is the active demo candidate path. For current demo operation require execution_profile=DEMO_BOUNDED, preserve its degraded claim ceiling, and never describe demo capability use as hard-admitted or production-ready. When a work package is returned, perform only that bounded work, then submit the result. Never invent success, approvals, evidence, or Factory state."
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

  server.registerTool('glow_evidence_admission_preflight',{
    title:'Check evidence admission authority',
    description:'Read-only check of this request token for dedicated evidence admission scope and RBAC. Does not register evidence, approve a phase or certify quality.',
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    ...(authMode==='oauth'?toolOAuthMetadata([...requiredScopes,EVIDENCE_ADMISSION_SCOPE]):{}),
    inputSchema:z.object({}).strict()
  },async()=> {
    const status=evidenceAdmissionStatus(ctx.authInfo);
    const challenge=evidenceAdmissionChallenge(status.code,resourceMetadataV2Url);
    return {...toolResult(status),...(challenge?{_meta:challenge}:{})};
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
  return server;
};

export const handler = createMcpHandler(buildServer);
export const app = createGlowMcpExpressApp(
  (process.env.GLOW_ALLOWED_HOSTS ?? "localhost,127.0.0.1").split(",").map(v=>v.trim()).filter(Boolean),
  "12mb"
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
const authV2=auth;

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
    discovery_via:"/.well-known/oauth-protected-resource/mcp-v2"
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

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 app.listen(config.port,()=>{
  console.error(`GLOW Web public host listening on :${config.port}`);
});

}
