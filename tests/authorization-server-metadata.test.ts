import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicAuthorizationServerMetadata } from "../src/authorization-server-metadata.js";

function fakeFetch(metadata:Record<string,unknown>,status=200):typeof fetch {
  return (async (input:RequestInfo|URL)=>{
    assert.match(String(input),/\.well-known\/openid-configuration$/);
    return new Response(JSON.stringify(metadata),{status,headers:{"content-type":"application/json"}});
  }) as typeof fetch;
}

test("NORMAL: Auth0 authoritative discovery paths are preserved", async()=>{
  const issuer="https://tenant.us.auth0.com";
  const out=await buildPublicAuthorizationServerMetadata({
    publicIssuer:"https://web.example",
    oauthIssuer:issuer+"/",
    fetchImpl:fakeFetch({
      issuer:issuer+"/",
      authorization_endpoint:issuer+"/authorize",
      token_endpoint:issuer+"/oauth/token",
      registration_endpoint:issuer+"/oidc/register",
      scopes_supported:["openid","profile","email"],
      response_types_supported:["code"],
      grant_types_supported:["authorization_code","refresh_token"],
      token_endpoint_auth_methods_supported:["none","client_secret_post"],
      code_challenge_methods_supported:["S256"]
    })
  });
  assert.equal(out.issuer,"https://web.example");
  assert.equal(out.authorization_endpoint,issuer+"/authorize");
  assert.equal(out.token_endpoint,issuer+"/oauth/token");
  assert.equal(out.registration_endpoint,issuer+"/oidc/register");
});

test("NORMAL: Supabase authoritative discovery paths are preserved", async()=>{
  const issuer="https://project.supabase.co/auth/v1";
  const out=await buildPublicAuthorizationServerMetadata({
    publicIssuer:"https://education.example",
    oauthIssuer:issuer,
    fetchImpl:fakeFetch({
      issuer,
      authorization_endpoint:issuer+"/oauth/authorize",
      token_endpoint:issuer+"/oauth/token",
      registration_endpoint:issuer+"/oauth/clients/register",
      code_challenge_methods_supported:["S256"]
    })
  });
  assert.equal(out.authorization_endpoint,issuer+"/oauth/authorize");
  assert.equal(out.registration_endpoint,issuer+"/oauth/clients/register");
});

test("FAILURE: provider discovery HTTP failure is explicit", async()=>{
  await assert.rejects(
    ()=>buildPublicAuthorizationServerMetadata({
      publicIssuer:"https://web.example",
      oauthIssuer:"https://tenant.us.auth0.com/",
      fetchImpl:fakeFetch({},503)
    }),
    /OAUTH_PROVIDER_DISCOVERY_HTTP_503/
  );
});

test("ADVERSARIAL: discovered issuer substitution is rejected", async()=>{
  await assert.rejects(
    ()=>buildPublicAuthorizationServerMetadata({
      publicIssuer:"https://web.example",
      oauthIssuer:"https://tenant.us.auth0.com/",
      fetchImpl:fakeFetch({
        issuer:"https://attacker.example/",
        authorization_endpoint:"https://attacker.example/authorize",
        token_endpoint:"https://attacker.example/token"
      })
    }),
    /OAUTH_PROVIDER_ISSUER_MISMATCH/
  );
});
