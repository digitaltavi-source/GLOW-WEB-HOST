import {createHash} from 'node:crypto';

export const PHASE_ACCEPTANCE_SCOPE='web.accept';
export const PHASE_ACCEPTANCE_MISSION_PATTERN=/^NM-[a-f0-9]{12}$/;
export function toolOAuthMetadata(scopes:string[]){
  const securitySchemes=[{type:'oauth2' as const,scopes:[...new Set(scopes)]}];
  // SDK v2 preserves _meta in tools/list; unknown top-level config keys may drop.
  return {securitySchemes,_meta:{securitySchemes}};
}
export function phaseAcceptanceAuthChallenge(code:string,metadataUrl:string){
  if(!['OPERATOR_ACCEPTANCE_SCOPE_REQUIRED','OPERATOR_AUTHORITY_EXPIRED'].includes(code))return null;
  const resource=new URL(metadataUrl).toString();
  const error=code==='OPERATOR_AUTHORITY_EXPIRED'?'invalid_token':'insufficient_scope';
  return { 'mcp/www_authenticate':[`Bearer resource_metadata="${resource}", error="${error}", error_description="GLOW Web phase acceptance requires web.accept authorization", scope="web.run web.accept"`] };
}
export type AcceptanceAuth={scopes:string[];expiresAt?:number;extra?:Record<string,unknown>};
export function phaseAcceptanceAuthorityStatus(auth:AcceptanceAuth|undefined,now=Date.now()/1000){
  let code='ELIGIBLE_FOR_SCOPED_PHASE_ACCEPTANCE';
  try{phaseAcceptanceActor(auth,now);}catch(error){code=error instanceof Error?error.message:'OPERATOR_AUTHORITY_INVALID';}
  const verified=auth?.extra?.authentication==='JWT_VERIFIED';
  return {
    diagnostic_scope:'CURRENT_TOOL_REQUEST_TOKEN' as const,
    global_connection_authority_claimed:false,
    verified_oauth:verified,
    token_has_acceptance_scope:verified&&Boolean(auth?.scopes.includes(PHASE_ACCEPTANCE_SCOPE)),
    token_has_rbac_permission:verified&&auth?.extra?.operator_acceptance_granted===true,
    eligible:code==='ELIGIBLE_FOR_SCOPED_PHASE_ACCEPTANCE',
    code
  };
}
export function phaseAcceptanceActor(auth:AcceptanceAuth|undefined,now=Date.now()/1000){
  if(!auth||auth.extra?.authentication!=='JWT_VERIFIED'||typeof auth.extra.sub!=='string'||!auth.extra.sub||typeof auth.extra.iss!=='string'||!auth.extra.iss)throw Error('OPERATOR_OAUTH_IDENTITY_REQUIRED');
  if(!auth.scopes.includes('web.run')||!auth.scopes.includes(PHASE_ACCEPTANCE_SCOPE))throw Error('OPERATOR_ACCEPTANCE_SCOPE_REQUIRED');
  if(auth.extra.operator_acceptance_granted!==true)throw Error('OPERATOR_RBAC_PERMISSION_REQUIRED');
  if(!Number.isInteger(auth.expiresAt)||auth.expiresAt!<=now)throw Error('OPERATOR_AUTHORITY_EXPIRED');
  return {actor_id:auth.extra.iss+'#'+auth.extra.sub,channel:'PRIVATE_OPERATOR' as const,expires_at:auth.expiresAt!,authority_source:auth.extra.iss,authority_scopes:['APPROVE_H1','APPROVE_H2','APPROVE_H3']};
}
export function validateAcceptanceBytes(payloadJson:string,payloadSha256:string){
  if(Buffer.byteLength(payloadJson,'utf8')>1024*1024)throw Error('ACCEPTANCE_PAYLOAD_LIMIT');
  if(!/^[0-9a-f]{64}$/.test(payloadSha256)||createHash('sha256').update(payloadJson,'utf8').digest('hex')!==payloadSha256)throw Error('ACCEPTANCE_PAYLOAD_HASH_MISMATCH');
  const payload:unknown=JSON.parse(payloadJson);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('ACCEPTANCE_PAYLOAD_OBJECT_REQUIRED');
  if('authority_receipt' in payload)throw Error('ACCEPTANCE_CALLER_RECEIPT_FORBIDDEN');
}
