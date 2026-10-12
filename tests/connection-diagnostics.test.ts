import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionDiagnostics} from '../src/connection-diagnostics.js';
const token={clientId:'fixture-client',scopes:['web.run'],expiresAt:2000,extra:{authentication:'JWT_VERIFIED',verified_oauth_client_id:'fixture-client',sub:'private-subject',iss:'https://issuer.test/',operator_acceptance_granted:true,operator_evidence_admission_granted:true}};
test('grants present but absent requested scopes produce actionable diagnosis without credentials',()=>{
 const out=connectionDiagnostics(token,1000);
 assert.equal(out.actions.every(a=>a.token_has_rbac_permission&&!a.token_has_scope&&!a.eligible),true);
 assert.equal(out.actions.every(a=>a.next_check==='COMPARE_AUTHORIZE_REQUEST_SCOPE_AND_ACTUAL_CLIENT_GRANT'),true);
 const text=JSON.stringify(out);assert.equal(text.includes('private-subject'),false);assert.equal(text.includes('fixture-client'),false);assert.equal(text.includes('https://issuer.test/'),false);
 assert.equal(out.oauth_client_fingerprint?.length,64);
});
test('requested scopes never substitute for RBAC',()=>{
 const out=connectionDiagnostics({...token,scopes:['web.run','web.accept','web.evidence.admit'],extra:{...token.extra,operator_acceptance_granted:false,operator_evidence_admission_granted:false}},1000);
 assert.equal(out.actions.every(a=>!a.eligible&&a.next_check==='CHECK_ACTUAL_LOGIN_USER_RBAC'),true);
});
test('fresh full authorized token recovers; expired or unverified identity cannot grant eligibility',()=>{
 const full={...token,scopes:['web.run','web.accept','web.evidence.admit']};
 assert.equal(connectionDiagnostics(full,1000).actions.every(a=>a.eligible),true);
 assert.equal(connectionDiagnostics(full,2000).actions.some(a=>a.eligible),false);
 const forged={...full,extra:{...full.extra,authentication:'STATIC_BEARER'}};
 assert.equal(connectionDiagnostics(forged,1000).actions.some(a=>a.eligible),false);
 assert.equal(connectionDiagnostics(undefined,1000).oauth_client_fingerprint,null);
 assert.equal(connectionDiagnostics({...token,clientId:'private-subject',extra:{...token.extra,verified_oauth_client_id:''}},1000).oauth_client_fingerprint,null);
});
