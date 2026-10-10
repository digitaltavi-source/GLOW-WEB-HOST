import {randomUUID} from 'node:crypto';
import * as z from 'zod/v4';
import type {AcceptanceAuth} from './phase-acceptance.js';
import type {WebRequestType,WebResponseType} from './contracts.js';

export const EVIDENCE_ADMISSION_SCOPE='web.evidence.admit';
const HASH=z.string().regex(/^[0-9a-f]{64}$/);
const Common={mission_id:z.string().regex(/^NM-[a-f0-9]{12}$/),expected_state_version:z.number().int().min(1),phase_work_id:z.string().min(1).max(128),work_contract_revision:z.number().int().min(1)};
const capabilityBindings=z.object({phase:z.literal('H2'),phase_work_id:z.string().min(1),capability_id:z.string().min(1).max(128),h1_payload_sha256:HASH,state_version:z.number().int().min(1),blueprint_revision:z.number().int().min(1),result_sha256:HASH.optional()}).strict();
const assuranceBindings=z.object({phase:z.literal('H2'),state_version:z.number().int().min(1),blueprint_revision:z.number().int().min(1),h1_identity:z.string().min(1).max(256),h1_payload_sha256:HASH,design_contract_sha256:HASH}).strict();
export const ArtifactAdmissionSchema=z.object({...Common,data_base64:z.string().min(4).max(12*1024*1024)}).strict();
export const CapabilityAdmissionSchema=z.object({...Common,kind:z.literal('CAPABILITY'),artifact_sha256:HASH,evidence_sha256:HASH,reviewed_result:z.record(z.string(),z.unknown()),bindings:capabilityBindings}).strict();
export const AssuranceAdmissionSchema=z.object({...Common,kind:z.literal('ASSURANCE'),artifact_sha256:HASH,evidence_sha256:HASH,bindings:assuranceBindings}).strict();
export const EvidenceAdmissionSchema=z.discriminatedUnion('kind',[CapabilityAdmissionSchema,AssuranceAdmissionSchema]);
export const AdmissionHttpSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('register_artifact'),args:ArtifactAdmissionSchema}).strict(),
 z.object({action:z.literal('register_evidence'),args:EvidenceAdmissionSchema}).strict()
]);
export function evidenceAdmissionActor(auth:AcceptanceAuth|undefined,now=Date.now()/1000){
 if(!auth||auth.extra?.authentication!=='JWT_VERIFIED'||typeof auth.extra.sub!=='string'||!auth.extra.sub||typeof auth.extra.iss!=='string'||!auth.extra.iss)throw Error('EVIDENCE_OAUTH_IDENTITY_REQUIRED');
 if(!auth.scopes.includes('web.run')||!auth.scopes.includes(EVIDENCE_ADMISSION_SCOPE))throw Error('EVIDENCE_ADMISSION_SCOPE_REQUIRED');
 if(auth.extra.operator_evidence_admission_granted!==true)throw Error('EVIDENCE_ADMISSION_RBAC_REQUIRED');
 if(!Number.isInteger(auth.expiresAt)||auth.expiresAt!<=now)throw Error('EVIDENCE_AUTHORITY_EXPIRED');
 return {actor_id:auth.extra.iss+'#'+auth.extra.sub,channel:'PRIVATE_OPERATOR' as const,expires_at:auth.expiresAt!,authority_source:auth.extra.iss,authority_scopes:['ADMIT_ARTIFACT','ADMIT_EVIDENCE']};
}
export function evidenceAdmissionStatus(auth:AcceptanceAuth|undefined){
 let code='ELIGIBLE_FOR_SCOPED_EVIDENCE_ADMISSION';
 try{evidenceAdmissionActor(auth);}catch(error){code=error instanceof Error?error.message:'EVIDENCE_AUTHORITY_INVALID';}
 return {diagnostic_scope:'CURRENT_TOOL_REQUEST_TOKEN',eligible:code==='ELIGIBLE_FOR_SCOPED_EVIDENCE_ADMISSION',code,scope:EVIDENCE_ADMISSION_SCOPE,phase_acceptance_granted:false};
}
export function evidenceAdmissionChallenge(code:string,metadataUrl:string){
 if(!['EVIDENCE_ADMISSION_SCOPE_REQUIRED','EVIDENCE_AUTHORITY_EXPIRED'].includes(code))return null;
 return {'mcp/www_authenticate':[`Bearer resource_metadata="${new URL(metadataUrl)}", error="${code==='EVIDENCE_AUTHORITY_EXPIRED'?'invalid_token':'insufficient_scope'}", scope="web.run ${EVIDENCE_ADMISSION_SCOPE}"`]};
}
type Execute=(subject:string,request:WebRequestType,actor?:ReturnType<typeof evidenceAdmissionActor>)=>Promise<WebResponseType>;
export function createEvidenceAdmissionExecutor(read:Execute,write:Execute){
 let inFlight=0;
 return async(auth:AcceptanceAuth|undefined,raw:unknown):Promise<WebResponseType>=>{
  const actor=evidenceAdmissionActor(auth);
  const input=AdmissionHttpSchema.parse(raw);
  if(inFlight>=4)throw Error('EVIDENCE_ADMISSION_BACKPRESSURE');
  inFlight++;
  try{
   const subject=String(auth!.extra!.sub),mid=input.args.mission_id;
   const request=(action:string,args:Record<string,unknown>):WebRequestType=>({request_id:randomUUID(),operation:'next_factory_control',role:'unspecified',locale:'vi-VN',input:{action,args}});
   const work=await read(subject,request('get_work',{mission_id:mid}));
   if(work.status==='failed'||!work.result) return work;
   const payload=work.result.payload as Record<string,unknown>|undefined;
   const plan=payload?.preproduction_capability_plan as Record<string,unknown>|undefined;
   if(payload?.phase!=='H2'||!plan)throw Error('H2_ADMISSION_WORK_REQUIRED');
   if(payload.state_version!==input.args.expected_state_version)throw Error('STATE_CONFLICT');
   if(plan.phase_work_id!==input.args.phase_work_id)throw Error('WORK_ID_MISMATCH');
   if(plan.work_contract_revision!==input.args.work_contract_revision)throw Error('WORK_CONTRACT_REVISION_MISMATCH');
   if(input.action==='register_evidence'){
    const b=input.args.bindings;
    if(b.state_version!==plan.state_version||b.blueprint_revision!==plan.blueprint_revision||b.h1_payload_sha256!==plan.h1_payload_sha256)throw Error('EVIDENCE_BINDING_MISMATCH');
    if(input.args.kind==='CAPABILITY'){
     if(input.args.bindings.phase_work_id!==plan.phase_work_id||!(plan.baseline_capability_ids as unknown[]).includes(input.args.bindings.capability_id))throw Error('EVIDENCE_BINDING_MISMATCH');
     if(input.args.reviewed_result.artifact_sha256!==input.args.artifact_sha256)throw Error('EVIDENCE_CANDIDATE_ARTIFACT_MISMATCH');
    }
   }else{
    const encoded=input.args.data_base64,bytes=Buffer.from(encoded,'base64');
    if(bytes.length===0||bytes.length>8*1024*1024||bytes.toString('base64')!==encoded)throw Error('ARTIFACT_ENCODING_OR_SIZE_INVALID');
   }
   // Revalidate expiry after the read; no caller-supplied actor, subject, scope or operation survives.
   evidenceAdmissionActor(auth);
   const {expected_state_version,phase_work_id,work_contract_revision,...args}=input.args;
   return await write(subject,request(input.action,args),actor);
  }finally{inFlight--;}
 };
}
