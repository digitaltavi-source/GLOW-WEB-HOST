import test from 'node:test';
import assert from 'node:assert/strict';
import {SystemAuditSchema,createSystemAuditExecutor} from '../src/system-audit.js';
import {phaseAcceptanceActor} from '../src/phase-acceptance.js';
import type {WebResponseType} from '../src/contracts.js';
const auth={scopes:['web.run','web.evidence.admit'],expiresAt:Math.floor(Date.now()/1000)+300,extra:{authentication:'JWT_VERIFIED',sub:'owner',iss:'https://issuer/',operator_evidence_admission_granted:true}};
const report={submission_id:'c63b0e38-8e9e-4bde-aa2e-8ca39eb432a2',scope:'FACTORY',target:{component:'Factory',source_commit:'a'.repeat(40),runtime_version:'test'},method:'Inspection',coverage:['OAuth'],limitations:['Fixtures only'],findings:[]};
const response:WebResponseType={request_id:'test',status:'accepted',exposure:'MODEL_SESSION_PRIVATE',result:{payload:{audit_id:'SA-'+'a'.repeat(32)}},public_evidence:[],errors:[]};
test('audit transport derives identity and grants only report admission',async()=>{
 let calls=0;
 const run=createSystemAuditExecutor(async(subject,request,actor)=>{
  calls++;assert.equal(subject,'owner');assert.equal(actor.actor_id,'https://issuer/#owner');
  assert.deepEqual(actor.authority_scopes,['ADMIT_SYSTEM_AUDIT']);
  assert.equal(request.input.action,'register_system_audit');
  assert.equal('mission_id' in (request.input.args as Record<string,unknown>),false);
  return response;
 });
 assert.equal(await run(auth,report),response);assert.equal(calls,1);
 assert.throws(()=>phaseAcceptanceActor(auth),/ACCEPTANCE_SCOPE_REQUIRED/);
});
test('missing scope, RBAC and expiry never reach backend',async()=>{
 let calls=0;const run=createSystemAuditExecutor(async()=>{calls++;return response;});
 for(const a of [{...auth,scopes:['web.run']},{...auth,extra:{...auth.extra,operator_evidence_admission_granted:false}},{...auth,expiresAt:1}]){
  await assert.rejects(run(a,report));
 }
 assert.equal(calls,0);
});
test('phase-independent report supports Factory and exact mission binding',()=>{
 assert.ok(SystemAuditSchema.safeParse(report).success);
 assert.ok(SystemAuditSchema.safeParse({...report,scope:'MISSION',mission_binding:{mission_id:'NM-c4ca97029aa2',expected_state_version:2}}).success);
 assert.equal(SystemAuditSchema.safeParse({...report,scope:'MISSION'}).success,false);
 assert.equal(SystemAuditSchema.safeParse({...report,actor_id:'HUMAN'}).success,false);
 assert.equal(SystemAuditSchema.safeParse({...report,mission_binding:{mission_id:'NM-c4ca97029aa2',expected_state_version:2}}).success,false);
});
test('backend failure releases admission concurrency reservation',async()=>{
 let calls=0;const run=createSystemAuditExecutor(async()=>{calls++;throw Error('fixture failure');});
 for(let i=0;i<5;i++)await assert.rejects(run(auth,report),/fixture failure/);
 assert.equal(calls,5);
});
