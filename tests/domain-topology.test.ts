import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { resolveHostDomainTopology } from "../src/domain-topology.js";
import { createJwtVerifier } from "../src/oauth.js";
import { hostFixture, fetchHttpHandler } from "./http-fixture.js";

test("STANDALONE_DOMAIN resolves Web-dedicated origin, root callback, RFC 8707 resource and isolated preview", () => {
  const topo = resolveHostDomainTopology({
    GLOW_DEPLOYMENT_TOPOLOGY: "STANDALONE_DOMAIN",
    GLOW_PUBLIC_ORIGIN: "https://web.glow.example",
    GLOW_PUBLIC_MCP_URL: "https://web.glow.example/mcp-v2",
    GLOW_PREVIEW_ORIGIN: "https://preview.glow-sandbox.example"
  } as NodeJS.ProcessEnv);

  assert.equal(topo.topologyMode, "STANDALONE_DOMAIN");
  assert.equal(topo.publicOrigin, "https://web.glow.example");
  assert.equal(topo.basePath, "");
  assert.equal(topo.mountedRoutes.mcpPath, "/mcp-v2");
  assert.equal(topo.mcpResourceUrl, "https://web.glow.example/mcp-v2");
  assert.equal(topo.protectedResourceMetadataPath, "/.well-known/oauth-protected-resource/mcp-v2");
  assert.equal(topo.oauthCallbackUrl, "https://web.glow.example/auth/google/callback");
  assert.equal(topo.previewOrigin, "https://preview.glow-sandbox.example");
});

test("SHARED_ECOSYSTEM_GATEWAY resolves shared origin, /web base_path, unified SSO callback and factory-scoped RFC 8707 resource", () => {
  const topo = resolveHostDomainTopology({
    GLOW_DEPLOYMENT_TOPOLOGY: "SHARED_ECOSYSTEM_GATEWAY",
    GLOW_PUBLIC_ORIGIN: "https://glow.example",
    GLOW_BASE_PATH: "/web",
    GLOW_PREVIEW_ORIGIN: "https://preview.glow-sandbox.example"
  } as NodeJS.ProcessEnv);

  assert.equal(topo.topologyMode, "SHARED_ECOSYSTEM_GATEWAY");
  assert.equal(topo.publicOrigin, "https://glow.example");
  assert.equal(topo.basePath, "/web");
  assert.equal(topo.standaloneRoutes.mcpPath, "/mcp-v2");
  assert.equal(topo.mountedRoutes.workspacePath, "/web/workspace");
  assert.equal(topo.mountedRoutes.mcpPath, "/web/mcp-v2");
  assert.equal(topo.mcpResourceUrl, "https://glow.example/web/mcp-v2");
  assert.equal(topo.protectedResourceMetadataPath, "/.well-known/oauth-protected-resource/web/mcp-v2");
  assert.equal(topo.oauthCallbackUrl, "https://glow.example/auth/google/callback");
  assert.equal(topo.previewOrigin, "https://preview.glow-sandbox.example");
});

test("ADVERSARIAL: rejects non-HTTPS public origin, path-traversal base_path, and non-isolated preview origin", () => {
  assert.throws(
    () => resolveHostDomainTopology({ GLOW_PUBLIC_ORIGIN: "http://glow.example" } as NodeJS.ProcessEnv),
    /HTTPS_REQUIRED/
  );
  assert.throws(
    () => resolveHostDomainTopology({ GLOW_DEPLOYMENT_TOPOLOGY: "SHARED_ECOSYSTEM_GATEWAY", GLOW_PUBLIC_ORIGIN: "https://glow.example", GLOW_BASE_PATH: "/../admin" } as NodeJS.ProcessEnv),
    /CONFIG_BASE_PATH_INVALID/
  );
  assert.throws(
    () => resolveHostDomainTopology({ GLOW_PUBLIC_ORIGIN: "https://glow.example", GLOW_PREVIEW_ORIGIN: "https://glow.example" } as NodeJS.ProcessEnv),
    /PREVIEW_ORIGIN_MUST_ISOLATE_FROM_MAIN_ORIGIN/
  );
  assert.throws(
    () => resolveHostDomainTopology({ GLOW_PUBLIC_ORIGIN: "https://glow.example", GLOW_PUBLIC_MCP_URL: "https://other.example/mcp-v2" } as NodeJS.ProcessEnv),
    /CONFIG_MCP_RESOURCE_ORIGIN_MISMATCH/
  );
});

test("RFC 8707 shared-domain audience isolation rejects Video Factory token on Web Host MCP verifier", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "shared-gateway-key", alg: "RS256" };
  const webTopo = resolveHostDomainTopology({
    GLOW_DEPLOYMENT_TOPOLOGY: "SHARED_ECOSYSTEM_GATEWAY",
    GLOW_PUBLIC_ORIGIN: "https://glow.example",
    GLOW_BASE_PATH: "/web"
  } as NodeJS.ProcessEnv);

  const webVerifier = createJwtVerifier(
    {
      issuer: "https://glow.example",
      audience: webTopo.mcpResourceUrl,
      jwksUrl: "https://glow.example/.well-known/jwks.json"
    },
    async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } })
  );

  const videoScopedToken = await new SignJWT({ scope: "video.run web.run" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setSubject("customer-123")
    .setIssuer("https://glow.example")
    .setAudience("https://glow.example/video/mcp-v2")
    .setExpirationTime("5m")
    .sign(privateKey);

  await assert.rejects(() => webVerifier.verifyAccessToken(videoScopedToken), /token verification failed/);

  const webScopedToken = await new SignJWT({ scope: "web.run" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setSubject("customer-123")
    .setIssuer("https://glow.example")
    .setAudience(webTopo.mcpResourceUrl)
    .setExpirationTime("5m")
    .sign(privateKey);

  const verified = await webVerifier.verifyAccessToken(webScopedToken);
  assert.equal(verified.extra?.["sub"], "customer-123");
});

test("Shared single-domain gateway HTTP mount serves /web/* while preserving standalone /mcp-v2 and /workspace", async () => {
  await hostFixture(
    {
      GLOW_DEPLOYMENT_TOPOLOGY: "SHARED_ECOSYSTEM_GATEWAY",
      GLOW_PUBLIC_ORIGIN: "http://127.0.0.1:3100",
      GLOW_BASE_PATH: "/web",
      GLOW_PUBLIC_MCP_URL: "http://127.0.0.1:3100/web/mcp-v2",
      GLOW_AUTH_MODE: "oauth",
      GLOW_OAUTH_ISSUER: "https://glow.example",
      GLOW_OAUTH_AUDIENCE: "http://127.0.0.1:3100/web/mcp-v2",
      GLOW_OAUTH_JWKS_URL: "https://glow.example/.well-known/jwks.json",
      GLOW_OAUTH_REQUIRED_SCOPES: "web.run"
    },
    async ({ app, handler }) => {
      try {
        const mountedProfileRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/web/api/public/profile");
        assert.equal(mountedProfileRes.status, 200);
        const mountedProfile = (await mountedProfileRes.json()) as Record<string, unknown>;
        assert.equal(mountedProfile.deployment_topology, "SHARED_ECOSYSTEM_GATEWAY");
        assert.equal(mountedProfile.base_path, "/web");
        assert.equal(mountedProfile.mounted_ai_resource, "/web/mcp-v2");
        assert.equal(mountedProfile.canonical_ai_resource, "/mcp-v2");

        assert.equal((await fetchHttpHandler(app, "http://127.0.0.1:3100/web/workspace")).status, 200);
        assert.equal((await fetchHttpHandler(app, "http://127.0.0.1:3100/workspace")).status, 200);
        assert.equal((await fetchHttpHandler(app, "http://127.0.0.1:3100/web/healthz")).status, 200);
        assert.equal((await fetchHttpHandler(app, "http://127.0.0.1:3100/healthz")).status, 200);

        const metaRes = await fetchHttpHandler(app, "http://127.0.0.1:3100/.well-known/oauth-protected-resource/web/mcp-v2");
        assert.equal(metaRes.status, 200);
        const meta = (await metaRes.json()) as Record<string, unknown>;
        assert.equal(meta.resource, "http://127.0.0.1:3100/web/mcp-v2");

        const mountedMcpChallenge = await fetchHttpHandler(app, "http://127.0.0.1:3100/web/mcp-v2", { method: "POST" });
        assert.equal(mountedMcpChallenge.status, 401);
        const standaloneMcpChallenge = await fetchHttpHandler(app, "http://127.0.0.1:3100/mcp-v2", { method: "POST" });
        assert.equal(standaloneMcpChallenge.status, 401);
      } finally {
        await handler.close();
      }
    }
  );
});
