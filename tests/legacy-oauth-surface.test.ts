import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

async function freePort(){
  const server=createServer();
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const address=server.address();
  if(!address || typeof address==="string") throw new Error("TEST_PORT_RESOLUTION_FAILED");
  const port=address.port;
  server.close();
  await once(server,"close");
  return port;
}

async function waitForHealth(base:string){
  const deadline=Date.now()+8000;
  while(Date.now()<deadline){
    try { const r=await fetch(base+"/healthz"); if(r.status===200) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error("TEST_SERVER_START_TIMEOUT");
}

test("ADVERSARIAL/RECOVERY: legacy local OAuth consent/config surfaces stay absent", async()=>{
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,["dist/src/server.js"],{
    env:{
      ...process.env,
      PORT:String(port),
      GLOW_ALLOWED_HOSTS:"localhost,127.0.0.1",
      GLOW_PUBLIC_MCP_URL:base+"/mcp-v2",
      GLOW_PROTECTED_SERVICE_URL:"https://example.invalid",
      GLOW_PROTECTED_SERVICE_TOKEN:"test-protected-service-token-32chars",
      GLOW_AUTH_MODE:"oauth",
      GLOW_OAUTH_ISSUER:"https://issuer.example/",
      GLOW_OAUTH_AUDIENCE:base+"/mcp-v2",
      GLOW_OAUTH_JWKS_URL:"https://issuer.example/.well-known/jwks.json",
      GLOW_OAUTH_REQUIRED_SCOPES:"web.run"
    },
    stdio:"ignore"
  });
  try {
    await waitForHealth(base);
    for(const route of ["/oauth-config.js","/oauth-client.js","/oauth/consent"]){
      const response=await fetch(base+route,{redirect:"manual"});
      assert.equal(response.status,404,`${route} must remain absent; external AS owns authorization UX`);
    }
  } finally {
    if(child.exitCode===null){
      child.kill();
      await Promise.race([once(child,"exit"),new Promise(resolve=>setTimeout(resolve,3000))]);
    }
  }
});
