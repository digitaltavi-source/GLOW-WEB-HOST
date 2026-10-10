import test from 'node:test';
import assert from 'node:assert/strict';
import {hostFixture,fetchHttpHandler} from './http-fixture.js';
test('legacy local OAuth and noncanonical MCP surfaces stay absent',async()=>{
 await hostFixture({GLOW_AUTH_MODE:'oauth',GLOW_OAUTH_ISSUER:'https://issuer.example/',GLOW_OAUTH_AUDIENCE:'http://127.0.0.1:3100/mcp-v2',GLOW_OAUTH_JWKS_URL:'https://issuer.example/jwks',GLOW_OAUTH_REQUIRED_SCOPES:'web.run'},async({app,handler})=>{
  try{
   assert.equal((await fetchHttpHandler(app,'http://127.0.0.1:3100/healthz')).status,200);
   for(const route of ['/oauth-config.js','/oauth-client.js','/oauth/consent','/mcp','/mcp-v3','/api/operator/admission','/operator']){
    assert.equal((await fetchHttpHandler(app,'http://127.0.0.1:3100'+route,{method:route.startsWith('/mcp')?'POST':'GET'})).status,404,route);
   }
  }finally{await handler.close();}
 });
});
