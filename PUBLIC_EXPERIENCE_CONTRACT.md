# GLOW Web Public Experience Contract
Status: CANDIDATE / DEV_FALSIFICATION_REQUIRED

## Role
GLOW-WEB-HOST is the public experience, workspace and AI gateway for the protected GLOW Web Factory.

Owns:
- public landing/showcase;
- mission intake draft UI;
- public mission/result display;
- AI-provider handoff UI;
- MCP/OAuth transport;
- public schemas and declassification;
- health/readiness surfaces.

Does not own Factory Control, Process semantics, KIT internals, Capability internals, private evidence, qualification authority or protected runtime state.

## Interaction law
STRUCTURED_PUBLIC_ACTION -> WEB UI
CONVERSATIONAL_REASONING -> AI HOST
PUBLIC RESULT -> WEB RESULT CENTER
PRIVATE FACTORY STATE -> NEVER RENDERED DIRECTLY

## Public routes
/ = showcase
/app = workspace
/api/public/profile = declassified runtime profile
/healthz = public process health
/readyz = protected Factory readiness
/mcp-v2 = canonical AI-host protocol route

## Claim boundary
UI_EXISTS != FACTORY_INTEGRATED != HOSTINGER_VERIFIED != AI_HOST_REPRODUCED
