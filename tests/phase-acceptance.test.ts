import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PHASE_ACCEPTANCE_MISSION_PATTERN,toolOAuthMetadata,phaseAcceptanceActor,phaseAcceptanceAuthChallenge,phaseAcceptanceAuthorityStatus,validateAcceptanceBytes} from '../src/phase-acceptance.js';
import {McpServer,createMcpHandler} from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import {createServer} from 'node:http';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createJwtVerifier} from '../src/oauth.js';
const auth={scopes:['web.run','web.accept'],expiresAt:200,extra:{sub:'operator-1',iss:'https://issuer.test/',authentication:'JWT_VERIFIED',operator_acceptance_granted:true}};
test('published mission schema accepts real IDs in full-match connector validators',()=>{
  const schema=z.toJSONSchema(z.string().regex(PHASE_ACCEPTANCE_MISSION_PATTERN));
  if(typeof schema.pattern!=='string')throw Error('EXPORTED_PATTERN_REQUIRED');
  const consumer=new RegExp('^(?:'+schema.pattern+')$');
  assert.equal(consumer.test('NM-c4ca97029aa2'),true);
  assert.equal(consumer.test('NM-000000000000'),true);
  assert.equal(consumer.test('NM-'),false);
  assert.equal(consumer.test('NM-c4ca97029aa2-suffix'),false);
});
test('acceptance identity is verified issuer/subject with bounded expiry',()=>{
  assert.equal(phaseAcceptanceActor(auth,100).actor_id,'https://issuer.test/#operator-1');
  assert.equal(phaseAcceptanceActor(auth,100).expires_at,200);
});
test('read-only connection diagnostics distinguish scope, permission and expiry without secrets',()=>{
  assert.equal(phaseAcceptanceAuthorityStatus(auth,100).eligible,true);
  const narrow=phaseAcceptanceAuthorityStatus({...auth,scopes:['web.run']},100);
  assert.equal(narrow.token_has_rbac_permission,true);
  assert.equal(narrow.token_has_acceptance_scope,false);
  assert.equal(narrow.code,'OPERATOR_ACCEPTANCE_SCOPE_REQUIRED');
  assert.equal(phaseAcceptanceAuthorityStatus({...auth,extra:{...auth.extra,operator_acceptance_granted:false}},100).code,'OPERATOR_RBAC_PERMISSION_REQUIRED');
  assert.equal(phaseAcceptanceAuthorityStatus(auth,200).eligible,false);
  assert.equal('actor_id' in narrow,false);
  assert.equal('token' in narrow,false);
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
  assert.match(challenge!['mcp/www_authenticate'][0]!,/error_description=/);
  assert.equal(phaseAcceptanceAuthChallenge('OPERATOR_RBAC_PERMISSION_REQUIRED',metadata),null);
});
test('actual SDK tools/list preserves separate read and acceptance scope metadata',async t=>{
  const handler=createMcpHandler(()=>{
    const server=new McpServer({name:'scope-wire-test',version:'1'});
    server.registerTool('prepare',{inputSchema:z.object({}),...toolOAuthMetadata(['web.run'])},async()=>({content:[]}));
    server.registerTool('accept',{inputSchema:z.object({}),...toolOAuthMetadata(['web.run','web.accept'])},async()=>({content:[]}));
    return server;
  });
  t.after(()=>handler.close());
  const response=await handler.fetch(new Request('https://glow.test/mcp',{
    method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':'2025-11-25'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})
  }));
  assert.equal(response.status,200);
  const raw=await response.text();
  const packet=JSON.parse(raw.startsWith('data:')||raw.startsWith('event:')?raw.split('\n').find(line=>line.startsWith('data:'))!.slice(5):raw);
  const tools=packet.result.tools as Array<{name:string;_meta:{securitySchemes:Array<{type:string;scopes:string[]}>}}>;
  assert.deepEqual(tools.find(tool=>tool.name==='accept')!._meta.securitySchemes,[{type:'oauth2',scopes:['web.run','web.accept']}]);
  assert.deepEqual(tools.find(tool=>tool.name==='prepare')!._meta.securitySchemes,[{type:'oauth2',scopes:['web.run']}]);
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
