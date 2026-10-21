import {createHash} from 'node:crypto';
import type {AcceptanceAuth} from './phase-acceptance.js';

export function connectionDiagnostics(auth:(AcceptanceAuth & {clientId?:string})|undefined,now=Date.now()/1000){
 const verified=auth?.extra?.authentication==='JWT_VERIFIED';
 const valid=verified&&Number.isInteger(auth?.expiresAt)&&auth!.expiresAt!>now;
 const scopePresent=(scope:string)=>valid&&Boolean(auth?.scopes.includes(scope));
 const permissionPresent=(key:string)=>valid&&auth?.extra?.[key]===true;
 const actions=[
  {scope:'web.accept',permission:'operator_acceptance_granted'},
  {scope:'web.evidence.admit',permission:'operator_evidence_admission_granted'}
 ].map(({scope,permission})=>{
  const token_has_scope=scopePresent(scope),token_has_rbac_permission=permissionPresent(permission);
  const eligible=valid&&scopePresent('web.run')&&token_has_scope&&token_has_rbac_permission;
  return {scope,token_has_scope,token_has_rbac_permission,eligible,
   next_check:!valid?'VERIFY_FRESH_OAUTH_TOKEN':!scopePresent('web.run')||!token_has_scope?'COMPARE_AUTHORIZE_REQUEST_SCOPE_AND_ACTUAL_CLIENT_GRANT':!token_has_rbac_permission?'CHECK_ACTUAL_LOGIN_USER_RBAC':'READY_FOR_EXACT_BOUND_ACTION'};
 });
 return {diagnostic_scope:'CURRENT_TOOL_REQUEST_TOKEN',global_connection_authority_claimed:false,
  verified_oauth:verified,unexpired:valid,web_run_scope:scopePresent('web.run'),
  oauth_client_fingerprint:verified&&typeof auth?.extra?.verified_oauth_client_id==='string'&&auth.extra.verified_oauth_client_id?createHash('sha256').update(auth.extra.verified_oauth_client_id).digest('hex'):null,
  actions,automatic_retry_recommended:false,
  identity_checks:verified?'SIGNATURE_ISSUER_AUDIENCE_VERIFIED_BY_RESOURCE_SERVER':'OAUTH_IDENTITY_NOT_VERIFIED',
  note:'Auth0 grants do not prove requested or token scopes. Compare this request client with the configured client; repeated login without changed request or grant is not a repair.'};
}
