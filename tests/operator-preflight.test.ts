import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer as httpServer} from 'node:http';
import {createServer as netServer} from 'node:net';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';

test('real OAuth MCP preparation: step-up before backend, reject scope-only privilege, recover without acceptance',async t=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'preflight-test',alg:'RS256'};
  let backendCalls=0;
  const stub=httpServer((req,res)=>{
    res.setHeader('content-type','application/json');
    if(req.url==='/jwks'){res.end(JSON.stringify({keys:[jwk]}));return;}
    backendCalls++;
    res.end(JSON.stringify({request_id:'readonly-probe',status:'failed',exposure:'PUBLIC_DECLASSIFIED',result:null,public_evidence:[],errors:[{code:'H1_CONTRACT_MISSING_UNKNOWNS',message:'H1_CONTRACT_MISSING_UNKNOWNS',retryable:false}]}));
  });
  stub.listen(0,'127.0.0.1'); await once(stub,'listening');
  t.after(()=>new Promise<void>(resolve=>stub.close(()=>resolve())));
  const stubAddress=stub.address();if(!stubAddress||typeof stubAddress==='string')throw Error('STUB_PORT_REQUIRED');
  const probe=netServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const address=probe.address();if(!address||typeof address==='string')throw Error('HOST_PORT_REQUIRED');
  const port=address.port;probe.close();await once(probe,'close');
  const base=`http://127.0.0.1:${port}`,issuer='https://issuer.test/',audience=base+'/mcp-v2';
  const child=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,
    PORT:String(port),GLOW_AUTH_MODE:'oauth',GLOW_GATEWAY_PROFILE:'DEVELOPMENT',
    GLOW_ALLOWED_HOSTS:'127.0.0.1,localhost',GLOW_PUBLIC_MCP_URL:audience,
    GLOW_PROTECTED_SERVICE_URL:`http://127.0.0.1:${stubAddress.port}`,GLOW_ALLOW_INSECURE_LOCAL:'1',
    GLOW_PROTECTED_SERVICE_TOKEN:'test-only-backend-token',GLOW_COMBINED_RUNTIME_MODULE:'',
    GLOW_OAUTH_ISSUER:issuer,GLOW_OAUTH_AUDIENCE:audience,
    GLOW_OAUTH_JWKS_URL:`http://127.0.0.1:${stubAddress.port}/jwks`,GLOW_OAUTH_REQUIRED_SCOPES:'web.run',
    GLOW_OPERATOR_TOKEN:'',GLOW_OPERATOR_ACTOR_ID:''},stdio:'ignore'});
  t.after(async()=>{if(child.exitCode===null){child.kill();await once(child,'exit');}});
  const deadline=Date.now()+10000;
  for(;;){try{if((await fetch(base+'/healthz')).ok)break;}catch{}
    if(Date.now()>deadline)throw Error('HOST_START_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,50));}
  const sign=(scope:string,permissions:string[])=>new SignJWT({scope,permissions})
    .setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject('test-operator').setIssuer(issuer)
    .setAudience(audience).setExpirationTime('5m').sign(privateKey);
  const rpc=async(token:string,method:string,params:unknown)=>{
    const response=await fetch(audience,{method:'POST',headers:{authorization:'Bearer '+token,
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
});
