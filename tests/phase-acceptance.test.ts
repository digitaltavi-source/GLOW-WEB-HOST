import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {phaseAcceptanceActor,phaseAcceptanceAuthChallenge,validateAcceptanceBytes} from '../src/phase-acceptance.js';
import {createServer} from 'node:http';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createJwtVerifier} from '../src/oauth.js';
const auth={scopes:['web.run','web.accept'],expiresAt:200,extra:{sub:'operator-1',iss:'https://issuer.test/',authentication:'JWT_VERIFIED',operator_acceptance_granted:true}};
test('acceptance identity is verified issuer/subject with bounded expiry',()=>{
  assert.equal(phaseAcceptanceActor(auth,100).actor_id,'https://issuer.test/#operator-1');
  assert.equal(phaseAcceptanceActor(auth,100).expires_at,200);
});
test('role labels and general web scope cannot grant acceptance',()=>{
  assert.throws(()=>phaseAcceptanceActor({...auth,scopes:['web.run'],extra:{...auth.extra,role:'operator'}},100),/SCOPE_REQUIRED/);
  assert.throws(()=>phaseAcceptanceActor({...auth,extra:{sub:'operator-1',iss:'https://issuer.test/',role:'HUMAN'}},100),/IDENTITY_REQUIRED/);
});
test('expired and missing expiry credentials fail before execution',()=>{
  assert.throws(()=>phaseAcceptanceActor(auth,200),/EXPIRED/);
  assert.throws(()=>phaseAcceptanceActor({...auth,expiresAt:undefined},100),/EXPIRED/);
});
test('requested scope without administrator RBAC grant cannot escalate',()=>{
  assert.throws(()=>phaseAcceptanceActor({...auth,extra:{...auth.extra,operator_acceptance_granted:false}},100),/RBAC_PERMISSION_REQUIRED/);
});
test('missing scope triggers OAuth step-up but missing RBAC does not loop login',()=>{
  const metadata='https://glow.test/.well-known/oauth-protected-resource/mcp-v2';
  const challenge=phaseAcceptanceAuthChallenge('OPERATOR_ACCEPTANCE_SCOPE_REQUIRED',metadata);
  assert.match(challenge!['mcp/www_authenticate'][0]!,/error="insufficient_scope"/);
  assert.match(challenge!['mcp/www_authenticate'][0]!,/scope="web.run web.accept"/);
  assert.equal(phaseAcceptanceAuthChallenge('OPERATOR_RBAC_PERMISSION_REQUIRED',metadata),null);
});
test('exact payload bytes are bound, including whitespace and Unicode',()=>{
  const raw='{"mission_truth":{"business_outcome":"Khách hàng thật"}}';
  const hash=createHash('sha256').update(raw).digest('hex');
  validateAcceptanceBytes(raw,hash);
  assert.throws(()=>validateAcceptanceBytes(raw+' ',hash),/HASH_MISMATCH/);
  assert.throws(()=>validateAcceptanceBytes(raw.replace('thật','giả'),hash),/HASH_MISMATCH/);
});
test('caller-provided authority receipts cannot be laundered',()=>{
  const raw='{"authority_receipt":{"actor_type":"HUMAN"}}';
  assert.throws(()=>validateAcceptanceBytes(raw,createHash('sha256').update(raw).digest('hex')),/CALLER_RECEIPT_FORBIDDEN/);
});
test('signed OAuth permissions confer authority; scope or role alone cannot',async t=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'acceptance-test',alg:'RS256'};
  const http=createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({keys:[jwk]}));});
  await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>((resolve,reject)=>http.close(err=>err?reject(err):resolve())));
  const address=http.address();if(!address||typeof address==='string')throw Error('TEST_LISTENER_REQUIRED');
  const issuer='https://issuer.test/',audience='https://glow.test/mcp-v2';
  const verifier=createJwtVerifier({issuer,audience,jwksUrl:`http://127.0.0.1:${address.port}/jwks`});
  const sign=(permissions:string[])=>new SignJWT({scope:'web.run web.accept',permissions,role:'operator'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject('operator-1').setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const ordinary=await verifier.verifyAccessToken(await sign([]));
  assert.throws(()=>phaseAcceptanceActor(ordinary),/RBAC_PERMISSION_REQUIRED/);
  const operator=await verifier.verifyAccessToken(await sign(['web.accept']));
  assert.equal(phaseAcceptanceActor(operator).actor_id,issuer+'#operator-1');
  const wrong=new SignJWT({scope:'web.run web.accept',permissions:['web.accept']}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject('operator-1').setIssuer('https://wrong.test/').setAudience(audience).setExpirationTime('5m');
  await assert.rejects(()=>wrong.sign(privateKey).then(token=>verifier.verifyAccessToken(token)));
});
