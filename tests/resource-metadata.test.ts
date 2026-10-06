import test from "node:test";
import assert from "node:assert/strict";
import { buildProtectedResourceMetadata } from "../src/resource-metadata.js";

test("NORMAL: protected resource advertises exact external Auth0 issuer",()=>{
  const out=buildProtectedResourceMetadata({
    resource:"https://web.example/mcp-v2",
    authMode:"oauth",
    oauthIssuer:"https://tenant.us.auth0.com/",
    scopes:["web.run"]
  });
  assert.deepEqual(out,{
    resource:"https://web.example/mcp-v2",
    scopes_supported:["web.run"],
    authorization_servers:["https://tenant.us.auth0.com"]
  });
});

test("FAILURE: OAuth resource metadata rejects missing authorization-server issuer",()=>{
  assert.throws(()=>buildProtectedResourceMetadata({
    resource:"https://web.example/mcp-v2",
    authMode:"oauth",
    oauthIssuer:"",
    scopes:["web.run"]
  }),/OAUTH_ISSUER_REQUIRED_FOR_RESOURCE_METADATA/);
});

test("ADVERSARIAL: OAuth resource metadata rejects insecure issuer substitution",()=>{
  assert.throws(()=>buildProtectedResourceMetadata({
    resource:"https://web.example/mcp-v2",
    authMode:"oauth",
    oauthIssuer:"http://attacker.invalid",
    scopes:["web.run"]
  }),/OAUTH_ISSUER_HTTPS_REQUIRED/);
});

test("RECOVERY: a failed issuer attempt does not poison the next valid metadata build",()=>{
  assert.throws(()=>buildProtectedResourceMetadata({resource:"https://web.example/mcp-v2",authMode:"oauth",oauthIssuer:"",scopes:["web.run"]}));
  const out=buildProtectedResourceMetadata({resource:"https://web.example/mcp-v2",authMode:"oauth",oauthIssuer:"https://tenant.us.auth0.com/",scopes:["web.run"]});
  assert.equal(out.authorization_servers?.[0],"https://tenant.us.auth0.com");
});
