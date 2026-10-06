# GLOW Web — PUBLIC AI HOST INTEGRATION GUIDE

Status: PUBLIC-SAFE / DECLASSIFIED / PUBLIC WORKING-BRANCH CANDIDATE / NOT MAIN / NOT LIVE

## 1. Purpose

This guide documents only the public host/integration shell and the reusable connection contract around a protected GLOW Factory.
It intentionally excludes protected Factory implementation, private prompts, private capability logic, private evidence, credentials and runtime state.

The public integration layer is reusable across GLOW Child Factories only where the same public protocol/auth/transport contract is applicable. Private Factory semantics remain factory-specific.

## 2. Canonical connection formula

```text
USER
 -> GPT / AI HOST
 -> STABLE PUBLIC HTTPS URL
 -> HOSTINGER PUBLIC LISTENER
 -> OAuth / MCP / public tool contract
 -> PUBLIC GLOW HOST
 -> declassification + protected backend boundary
 -> PRIVATE FACTORY RUNTIME (in-process for current GLOW Web topology)
 -> FACTORY CONTROL
 -> PROCESS PLANE <-> CAPABILITY PLANE
```

Hard separations:

`PUBLIC_HOST != PROTECTED_FACTORY`

`COLOCATION != AUTHORITY_MERGE`

`ONE_DOMAIN != ONE_SECURITY_BOUNDARY`

`MODEL_SESSION_PRIVATE != PUBLIC_DELIVERY`

`PLUGIN_CONNECTION_IDENTITY != FACTORY_RUNTIME_VERSION`

The AI host connects to a stable public protocol surface. It does not need private runtime SHA, Kit version, Capability package version, database schema version or private runtime layout.

## 3. Public/private repository responsibilities

PUBLIC GitHub component (`GLOW-WEB-HOST`):
- public Node host;
- OAuth discovery/consent and MCP transport;
- public request/tool contracts;
- health/readiness endpoints;
- public experience/assets;
- public-safe integration documentation;
- declassified egress boundary.

PRIVATE GitHub component (`GLOW-WEB-FACTORY`):
- Factory Control and Process semantics;
- Capability semantics and specialist dependencies;
- protected runtime/state;
- private evidence and qualification state;
- exact assembly/runtime binding;
- release-control evidence for the combined candidate.

The public repository must not contain protected Factory internals or secrets.

## 4. Current GLOW Web deployment topology

The current GLOW Web implementation uses the private Factory repository as the **combined assembly carrier**.

```text
GLOW-WEB-FACTORY
 -> bind exact GLOW-WEB-HOST commit SHA
 -> bind exact private Factory runtime SHA/fileset
 -> assemble public Host + protected runtime
 -> one Hostinger Node process
 -> one public HTTP listener
 -> protected runtime imported in-process
```

Current assembly/topology truth is owned by the private Factory assembly contracts, not by this public guide.

This current implementation preserves the same conceptual split as a public-repo deployment-source model, but build/deployment-carrier ownership is different.

### Alternative reference pattern — not current GLOW Web topology

A deployment may instead use:

```text
PRIVATE REPO
 -> build exact protected package/artifact

PUBLIC REPO
 -> act as hosting deployment source
 -> bind exact protected package
 -> one process/listener
```

That is an **alternative reference pattern**, not the current GLOW Web deployment carrier. Do not switch between the two models implicitly. A topology-owner change is material and requires explicit architecture decision, invalidation analysis and re-verification.

## 5. Stable URL and version-upgrade law

Preferred operating abstraction:

```text
GPT / AI HOST
 -> stable public HTTPS origin
 -> stable OAuth/MCP contract
 -> stable public tool contract
```

When internal/public component versions change:

```text
CHANGE GITHUB SOURCE
 -> freeze exact public SHA
 -> freeze exact private SHA
 -> build exact component lock/assembly
 -> run mandatory regression
 -> accept candidate under release authority
 -> redeploy Hostinger under deployment authority
 -> verify exact live artifact + OAuth/MCP + critical Factory journey
```

If the public URL, authorization protocol and compatible public tool contract remain unchanged, the GPT/AI host does not need to know the internal Factory version.

A breaking public protocol/tool-contract change is different: it requires compatibility assessment and may require host/plugin reconnect or reconfiguration.

`INTERNAL_VERSION_CHANGE != AUTOMATIC_PLUGIN_RECONFIGURATION`

`BREAKING_PUBLIC_CONTRACT_CHANGE -> HOST_COMPATIBILITY_REASSESSMENT`

## 6. Why one listener

Managed hosting may permit only one effective Node HTTP listener per application.

Do not expose a second private listener merely to imitate conceptual separation.

Keep public/private separation through:
- repository/component ownership;
- package/runtime-module boundaries;
- authentication and authorization;
- state isolation;
- response allowlists/declassification;
- exposure classes;
- exact component identity and release controls.

## 7. Public endpoints

The canonical AI resource for the current candidate is:

`/mcp-v2`

Compatible MCP paths may include:
- `/mcp`
- `/mcp-v2`
- `/mcp-v3`

A public deployment may also expose:
- `/healthz`
- `/readyz`
- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource/*`
- `/oauth/consent`

`/v1/web-missions` is the protected backend contract endpoint used behind the public host boundary; it is not the canonical GPT/AI MCP resource.

Protected source, state and evidence must not be public routes.

## 8. Declassification

`MODEL_SESSION_PRIVATE != PUBLIC DELIVERY`

Only explicitly whitelisted public fields may cross the protected boundary.

Unknown or extra fields fail closed.

Public transport/adapter code must not reconstruct Factory Process or Capability semantics and must not promote evidence, approval, Canon or release state.

## 9. Cross-Factory reuse boundary

Reusable connection-plane responsibilities may include:
- stable URL strategy;
- OAuth/MCP transport;
- authentication/authorization;
- public request/response envelope;
- declassification;
- health/readiness shell;
- retry/idempotency transport rules where semantics permit;
- observability/release verification shell;
- GPT/AI-host adapter lifecycle.

Factory-specific responsibilities remain private and must not be generalized blindly:
- Process/gate semantics;
- Kit/work-order semantics;
- Capability registry/hard-admission rules;
- domain intelligence;
- persistent domain state;
- acceptance/assurance semantics;
- final delivery contract.

`CONNECTION_PLANE_CAN_BE_STANDARDIZED`

`PRIVATE_FACTORY_SEMANTICS_REMAIN_FACTORY_SPECIFIC`

## 10. AI host portability

A valid MCP endpoint does not prove compatibility with every AI host.

Each target host must separately establish as applicable:
- authorization;
- tool discovery;
- tool invocation;
- write-action support;
- user confirmation behavior;
- private-session handling;
- state continuity;
- failure/retry behavior;
- revoke/disconnect behavior.

`FORMAT_PORTABLE != RUNTIME_COMPATIBLE != BEHAVIOR_REPRODUCED`

## 11. Verification

Do not stop at build success.

Verify:
1. exact published public component identity;
2. exact combined/deployed artifact identity;
3. public health;
4. protected readiness;
5. OAuth discovery;
6. unauthenticated MCP challenge;
7. authenticated tool scan;
8. disposable action/mission;
9. failure and timeout-after-effect behavior;
10. adversarial declassification;
11. recovery/reconnect;
12. one critical end-to-end Factory journey;
13. public delivery boundary.

`BUILD PASS != DEPLOYMENT VERIFIED != AI HOST INTEGRATED != FIELD VERIFIED`

## 12. Current publication boundary

This guide is published only on a public working branch candidate. It is not current `main`, does not prove Hostinger deployment, and does not alter release or field-verification state.

Promotion to public `main` requires separate release authority after exact public-component regression, private assembly rebind and mandatory release-matrix acceptance.
