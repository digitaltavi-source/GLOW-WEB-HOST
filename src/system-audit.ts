import {randomUUID} from 'node:crypto';
import * as z from 'zod/v4';
import {evidenceAdmissionActor} from './evidence-admission.js';
import type {AcceptanceAuth} from './phase-acceptance.js';
import type {WebRequestType,WebResponseType} from './contracts.js';

const Text=(max:number)=>z.string().trim().min(1).max(max);
const Finding=z.object({
 finding_id:Text(80),title:Text(300),
 area:z.enum(['AUTH_OAUTH','PROCESS','CAPABILITY','EVIDENCE','QUALITY','BUILD_DEPLOY','PERSISTENCE','OBSERVABILITY','UX_PRODUCT','SECURITY','GOVERNANCE']),
 severity:z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
 confidence:z.enum(['OBSERVED','HYPOTHESIS']),
 expected_behavior:Text(4000),observed_behavior:Text(4000),
 reproduction_steps:z.array(Text(2000)).min(1).max(20),
 evidence:z.array(z.object({kind:z.enum(['LOG','SOURCE','TEST','OBSERVATION']),location:Text(2000),observed:Text(4000)}).strict()).min(1).max(20),
 root_cause_hypothesis:Text(4000).optional(),
 recommended_repairs:z.array(Text(2000)).min(1).max(20),
 retest_criteria:z.array(Text(2000)).min(1).max(20)
}).strict();
const Binding=z.object({mission_id:z.string().regex(/^NM-[a-f0-9]{12}$/),expected_state_version:z.number().int().min(1)}).strict();
export const SystemAuditSchema=z.object({
 submission_id:z.string().uuid(),
 scope:z.enum(['FACTORY','MISSION']),
 mission_binding:Binding.optional(),
 target:z.object({component:Text(300),source_commit:z.string().regex(/^[0-9a-f]{40}$/),runtime_version:Text(128)}).strict(),
 method:Text(2000),coverage:z.array(Text(300)).min(1).max(50),
 limitations:z.array(Text(2000)).min(1).max(50),
 findings:z.array(Finding).max(100)
}).strict().superRefine((v,ctx)=>{
 if((v.scope==='MISSION')!==!!v.mission_binding)ctx.addIssue({code:'custom',message:'AUDIT_SCOPE_BINDING_MISMATCH'});
 if(new Set(v.findings.map(f=>f.finding_id)).size!==v.findings.length)ctx.addIssue({code:'custom',message:'AUDIT_DUPLICATE_FINDING_ID'});
 if(Buffer.byteLength(JSON.stringify(v),'utf8')>1024*1024)ctx.addIssue({code:'custom',message:'AUDIT_REPORT_SIZE_LIMIT'});
});
export const GetSystemAuditSchema=z.object({audit_id:z.string().regex(/^SA-[0-9a-f]{32}$/)}).strict();
type Write=(subject:string,request:WebRequestType,actor:ReturnType<typeof evidenceAdmissionActor>)=>Promise<WebResponseType>;
export function createSystemAuditExecutor(write:Write){
 let inFlight=0;
 return async(auth:AcceptanceAuth|undefined,raw:unknown):Promise<WebResponseType>=>{
  const identity=evidenceAdmissionActor(auth);
  const report=SystemAuditSchema.parse(raw);
  if(inFlight>=4)throw Error('SYSTEM_AUDIT_BACKPRESSURE');
  inFlight++;
  try{
   evidenceAdmissionActor(auth);
   const actor={...identity,authority_scopes:['ADMIT_SYSTEM_AUDIT']};
   const request:WebRequestType={request_id:randomUUID(),operation:'next_factory_control',role:'unspecified',locale:'vi-VN',input:{action:'register_system_audit',args:report}};
   return await write(String(auth!.extra!.sub),request,actor);
  }finally{inFlight--;}
 };
}
