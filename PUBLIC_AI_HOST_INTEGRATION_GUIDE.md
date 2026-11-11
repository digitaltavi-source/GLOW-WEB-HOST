# GLOW Web — PUBLIC AI HOST INTEGRATION GUIDE

Status: PUBLIC-SAFE / DECLASSIFIED

## 1. Purpose

This guide documents only the public host/integration shell.
It intentionally excludes protected Factory implementation, private prompts, private capability logic, private evidence, credentials and runtime state.

## 2. Public architecture

AI Host
 -> OAuth
 -> Remote MCP endpoint
 -> Public GLOW Host
 -> Protected Factory boundary

The protected Factory is not a public content surface.

## 3. One temporary domain from two GitHub sources

Recommended split:

PUBLIC GitHub source:
- public Node host
- OAuth Protected Resource Metadata pointing to the external Authorization Server
- MCP endpoint
- public request/response schemas
- health/readiness endpoints
- public documentation

PRIVATE GitHub source:
- protected runtime package/artifact
- Factory state/control
- private evidence
- private implementation

Recommended deployment composition:

PRIVATE REPO
 -> build exact private runtime package
 -> publish through a private package/artifact channel

PUBLIC REPO
 -> Hostinger deployment source
 -> bind exact private package during build
 -> one Node process
 -> one public HTTP listener
 -> import protected runtime in-process

The public repository must not contain protected Factory internals or secrets.

## 4. Why one listener

Managed hosting may permit only one effective Node HTTP listener per application.

Do not expose a second private listener just to imitate conceptual separation.

Keep public/private separation through:
- repository ownership
- package boundaries
- runtime module boundaries
- auth
- state isolation
- response allowlists
- exposure classes

Co-location does not merge authority.

## 5. Public endpoints

A public deployment may expose:
- /healthz
- /readyz
- /.well-known/oauth-protected-resource/*
- local /.well-known/oauth-authorization-server intentionally returns 404 when authorization is owned by the external provider
- /mcp-v2 (or declared MCP version)

Protected source, state and evidence must not be public routes.

## 6. Declassification

MODEL_SESSION_PRIVATE != PUBLIC DELIVERY

Only explicitly whitelisted public fields may cross the protected boundary.

Unknown or extra fields fail closed.

## 7. AI host portability

A valid MCP endpoint does not prove compatibility with every AI host.

Each target host must separately establish:
- authorization
- tool discovery
- tool invocation
- write-action support
- user confirmation behavior
- private-session handling
- state continuity
- failure/retry behavior
- revoke/disconnect behavior

FORMAT_PORTABLE != RUNTIME_COMPATIBLE != BEHAVIOR_REPRODUCED

## 8. Verification

Do not stop at build success.

Verify:
1. public health
2. protected readiness
3. OAuth discovery
4. unauthenticated MCP challenge
5. authenticated tool scan
6. disposable action/mission
7. failure behavior
8. adversarial declassification
9. recovery
10. public delivery boundary

BUILD PASS != DEPLOYMENT VERIFIED != AI HOST INTEGRATED != FIELD VERIFIED
