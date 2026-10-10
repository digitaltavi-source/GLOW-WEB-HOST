import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {hostFixture,fetchHttpHandler} from './http-fixture.js';
test('real OAuth MCP preparation: step-up before backend, reject scope-only privilege, recover without acceptance',async()=>{
 const {publicKey,privateKey}=await generateKeyPair('RS256');
 const jwk={...await exportJWK(publicKey),kid:'preflight-test',alg:'RS256'};
 let backendCalls=0;
 const issuer='https://issuer.test/',audience='http://127.0.0.1:3100/mcp-v2';
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=input instanceof Request?input.url:String(input);
  if(url==='https://issuer.test/jwks')return new Response(JSON.stringify({keys:[jwk]}),{headers:{'content-type':'application/json'}});
  if(url==='https://backend.fixture/v1/web-missions'){
   backendCalls++;
   return new Response(JSON.stringify({request_id:'readonly-probe',status:'failed',exposure:'PUBLIC_DECLASSIFIED',result:null,public_evidence:[],errors:[{code:'H1_CONTRACT_MISSING_UNKNOWNS',message:'H1_CONTRACT_MISSING_UNKNOWNS',retryable:false}]}),{headers:{'content-type':'application/json'}});
  }
  return previousFetch(input,init);
 };
 try{
 await hostFixture({GLOW_AUTH_MODE:'oauth',GLOW_OAUTH_ISSUER:issuer,GLOW_OAUTH_AUDIENCE:audience,GLOW_OAUTH_JWKS_URL:'https://issuer.test/jwks',GLOW_OAUTH_REQUIRED_SCOPES:'web.run'},async({app,handler})=>{
  try{
  const sign=(scope:string,permissions:string[])=>new SignJWT({scope,permissions})
    .setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject('test-operator').setIssuer(issuer)
    .setAudience(audience).setExpirationTime('5m').sign(privateKey);
  const rpc=async(token:string,method:string,params:unknown)=>{
    const response=await fetchHttpHandler(app,audience,{method:'POST',headers:{authorization:'Bearer '+token,
      'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':'2025-11-25'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
    assert.equal(response.status,200);const raw=await response.text();
    return JSON.parse(raw.startsWith('data:')||raw.startsWith('event:')?raw.split('\n').find(line=>line.startsWith('data:'))!.slice(5):raw);
  };
  const narrow=await sign('web.run',['web.accept']);
  const listed=await rpc(narrow,'tools/list',{});
  assert.deepEqual(listed.result.tools.find((tool:{name:string})=>tool.name==='glow_prepare_phase_acceptance')._meta.securitySchemes,
    [{type:'oauth2',scopes:['web.run','web.accept']}]);
  const params={name:'glow_prepare_phase_acceptance',arguments:{mission_id:'NM-000000000000',phase:'H1',expected_state_version:1,payload:{}}};
  const missing=await rpc(narrow,'tools/call',params);
  assert.equal(missing.result.isError,true);
  assert.match(missing.result._meta['mcp/www_authenticate'][0],/scope="web.run web.accept"/);
  assert.equal(backendCalls,0);
  const scopeOnly=await rpc(await sign('web.run web.accept',[]),'tools/call',params);
  assert.match(scopeOnly.result.content[0].text,/OPERATOR_RBAC_PERMISSION_REQUIRED/);
  assert.equal(scopeOnly.result._meta?.['mcp/www_authenticate'],undefined);
  assert.equal(backendCalls,0);
  const recovered=await rpc(await sign('web.run web.accept',['web.accept']),'tools/call',params);
  assert.equal(recovered.result.structuredContent.errors[0].code,'H1_CONTRACT_MISSING_UNKNOWNS');
  assert.equal(backendCalls,1);
  const profile=await rpc(narrow,'tools/call',{name:'glow_public_profile',arguments:{}});
  assert.equal(profile.result.structuredContent.current_connection_phase_acceptance.eligible,false);
   const routes=await rpc(narrow,'tools/list',{});
   const names=routes.result.tools.map((tool:{name:string})=>tool.name);
   assert.ok(names.includes('glow_register_factory_artifact'));
   assert.ok(!names.includes('glow_recover_blocked_factory_stage'));
   assert.ok(!names.includes('glow_approve_factory_stage'));
  }finally{await handler.close();}
 });
 }finally{globalThis.fetch=previousFetch;}
});
