import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createJwtVerifier} from '../src/oauth.js';
import {evidenceAdmissionActor,evidenceAdmissionStatus,evidenceAdmissionChallenge,createEvidenceAdmissionExecutor,AdmissionHttpSchema} from '../src/evidence-admission.js';
import {phaseAcceptanceActor} from '../src/phase-acceptance.js';
import type {WebRequestType,WebResponseType} from '../src/contracts.js';
const auth={scopes:['web.run','web.evidence.admit'],expiresAt:Math.floor(Date.now()/1000)+300,extra:{authentication:'JWT_VERIFIED',sub:'owner',iss:'https://issuer.test/',operator_evidence_admission_granted:true}};
const args={mission_id:'NM-c4ca97029aa2',expected_state_version:2,phase_work_id:'NPW-test',work_contract_revision:2,data_base64:Buffer.from('actual test fixture bytes').toString('base64')};
const plan={state_version:2,blueprint_revision:1,phase_work_id:'NPW-test',work_contract_revision:2,h1_payload_sha256:'1'.repeat(64),baseline_capability_ids:['CAP.WEB.ART_DIRECTION']};
const response=(payload:unknown):WebResponseType=>({request_id:'test',status:'accepted',exposure:'MODEL_SESSION_PRIVATE',result:{payload},public_evidence:[],errors:[]});
function fixture(work:WebResponseType=response({phase:'H2',state_version:2,preproduction_capability_plan:plan})){
 const writes:Array<{subject:string;request:WebRequestType;actor:unknown}>=[],reads:string[]=[];
 const execute=createEvidenceAdmissionExecutor(async subject=>{reads.push(subject);return work;},async(subject,request,actor)=>{writes.push({subject,request,actor});return response({artifact_sha256:'2'.repeat(64)});});
 return {execute,writes,reads};
}
test('dedicated evidence authority does not grant phase acceptance',()=>{
 const actor=evidenceAdmissionActor(auth);assert.deepEqual(actor.authority_scopes,['ADMIT_ARTIFACT','ADMIT_EVIDENCE']);
 assert.throws(()=>phaseAcceptanceActor(auth),/ACCEPTANCE_SCOPE_REQUIRED/);
 assert.throws(()=>evidenceAdmissionActor({...auth,scopes:['web.run','web.accept']}),/ADMISSION_SCOPE_REQUIRED/);
});
test('identity, RBAC and expiry are independently mandatory',()=>{
 assert.throws(()=>evidenceAdmissionActor({...auth,extra:{...auth.extra,authentication:'STATIC'}}),/IDENTITY_REQUIRED/);
 assert.throws(()=>evidenceAdmissionActor({...auth,extra:{...auth.extra,operator_evidence_admission_granted:false,role:'HUMAN'}}),/RBAC_REQUIRED/);
 assert.throws(()=>evidenceAdmissionActor({...auth,expiresAt:1}),/EXPIRED/);
 assert.equal(evidenceAdmissionStatus(auth).eligible,true);
 assert.equal('actor_id' in evidenceAdmissionStatus(auth),false);
 assert.match(evidenceAdmissionChallenge('EVIDENCE_ADMISSION_SCOPE_REQUIRED','https://glow.test/metadata')!['mcp/www_authenticate'][0]!,/web.evidence.admit/);
 for(const [code,error] of [['EVIDENCE_ADMISSION_SCOPE_REQUIRED','insufficient_scope'],['EVIDENCE_AUTHORITY_EXPIRED','invalid_token']]){
  const challenge=evidenceAdmissionChallenge(code!,'https://glow.test/metadata')!['mcp/www_authenticate'][0]!;
  assert.ok(challenge.includes('error="'+error+'"'));assert.match(challenge,/error_description="[^"]+"/);assert.match(challenge,/resource_metadata="https:\/\/glow.test\/metadata"/);assert.match(challenge,/scope="web.run web.evidence.admit"/);
 }
 assert.equal(evidenceAdmissionChallenge('EVIDENCE_ADMISSION_RBAC_REQUIRED','https://glow.test/metadata'),null);
});
test('artifact uses authenticated owner and server-owned scoped actor only',async()=>{
 const f=fixture();await f.execute(auth,{action:'register_artifact',args});
 assert.deepEqual(f.reads,['owner']);assert.equal(f.writes[0]!.subject,'owner');
 assert.equal(f.writes[0]!.request.operation,'next_factory_control');
 assert.deepEqual(f.writes[0]!.request.input,{action:'register_artifact',args:{mission_id:args.mission_id,data_base64:args.data_base64}});
 assert.deepEqual((f.writes[0]!.actor as {authority_scopes:string[]}).authority_scopes,['ADMIT_ARTIFACT','ADMIT_EVIDENCE']);
});
test('ungranted caller, spoofed subject, actor and approval action never write',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.execute({...auth,scopes:['web.run']},{action:'register_artifact',args}),/SCOPE_REQUIRED/);
 await assert.rejects(()=>f.execute(auth,{subject:'victim',action:'register_artifact',args}));
 await assert.rejects(()=>f.execute(auth,{action:'register_artifact',args:{...args,actor_id:'HUMAN'}}));
 await assert.rejects(()=>f.execute(auth,{action:'submit_phase',args}));
 assert.equal(f.writes.length,0);
});
test('owner lookup errors and stale state/work/revision never write',async()=>{
 const denied:WebResponseType={...response(null),status:'failed',result:null,errors:[{code:'MISSION_NOT_FOUND',message:'MISSION_NOT_FOUND',retryable:false}]};
 const inaccessible=fixture(denied);assert.equal((await inaccessible.execute(auth,{action:'register_artifact',args})).status,'failed');assert.equal(inaccessible.writes.length,0);
 for(const patch of [{expected_state_version:3},{phase_work_id:'wrong'},{work_contract_revision:1}]){
 const f=fixture();await assert.rejects(()=>f.execute(auth,{action:'register_artifact',args:{...args,...patch}}));assert.equal(f.writes.length,0);
 }
});
test('malformed bytes rejected before backend admission',async()=>{
 for(const data_base64 of ['!!!!','YQ=','YW Jj','']){
 const f=fixture();await assert.rejects(()=>f.execute(auth,{action:'register_artifact',args:{...args,data_base64}}));assert.equal(f.writes.length,0);
 }
});
test('capability evidence binds exact H1/work/state/revision/result artifact',async()=>{
 const {data_base64,...common}=args;
 const evidence={...common,kind:'CAPABILITY' as const,artifact_sha256:'2'.repeat(64),evidence_sha256:'3'.repeat(64),reviewed_result:{artifact_sha256:'2'.repeat(64)},bindings:{phase:'H2' as const,phase_work_id:plan.phase_work_id,capability_id:plan.baseline_capability_ids[0]!,h1_payload_sha256:plan.h1_payload_sha256,state_version:2,blueprint_revision:1}};
 const f=fixture();await f.execute(auth,{action:'register_evidence',args:evidence});assert.equal(f.writes.length,1);
 for(const bindings of [{...evidence.bindings,h1_payload_sha256:'4'.repeat(64)},{...evidence.bindings,capability_id:'not-in-baseline'},{...evidence.bindings,state_version:3},{...evidence.bindings,phase_work_id:'other'}]){
 const denied=fixture();await assert.rejects(()=>denied.execute(auth,{action:'register_evidence',args:{...evidence,bindings}}));assert.equal(denied.writes.length,0);
 }
 const mismatch=fixture();await assert.rejects(()=>mismatch.execute(auth,{action:'register_evidence',args:{...evidence,reviewed_result:{artifact_sha256:'5'.repeat(64)}}}),/ARTIFACT_MISMATCH/);
});
test('assurance input is bounded H2; release/deployment and extra claims rejected',()=>{
 const {data_base64,...common}=args;
 const value={action:'register_evidence',args:{...common,kind:'ASSURANCE',artifact_sha256:'2'.repeat(64),evidence_sha256:'3'.repeat(64),bindings:{phase:'H2',state_version:2,blueprint_revision:1,h1_identity:'h1-identity',h1_payload_sha256:plan.h1_payload_sha256,design_contract_sha256:'4'.repeat(64)}}};
 assert.equal(AdmissionHttpSchema.safeParse(value).success,true);
 assert.equal(AdmissionHttpSchema.safeParse({...value,args:{...value.args,kind:'DEPLOYMENT'}}).success,false);
 assert.equal(AdmissionHttpSchema.safeParse({...value,args:{...value.args,bindings:{...value.args.bindings,authority_receipt:{approved:true}}}}).success,false);
});
test('signed JWT permission cannot be substituted with web.accept or role labels',async t=>{
 const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'admission-test',alg:'RS256'};
 const verifier=createJwtVerifier({issuer:'https://issuer.test/',audience:'https://glow.test/mcp-v2',jwksUrl:'https://jwks.fixture/keys'},async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'content-type':'application/json'}}));
 const sign=(permissions:string[])=>new SignJWT({scope:'web.run web.evidence.admit',permissions,role:'operator'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject('owner').setIssuer('https://issuer.test/').setAudience('https://glow.test/mcp-v2').setExpirationTime('5m').sign(privateKey);
 const denied=await verifier.verifyAccessToken(await sign(['web.accept']));assert.throws(()=>evidenceAdmissionActor(denied),/RBAC_REQUIRED/);
 const granted=await verifier.verifyAccessToken(await sign(['web.evidence.admit']));assert.equal(evidenceAdmissionActor(granted).actor_id,'https://issuer.test/#owner');
});
