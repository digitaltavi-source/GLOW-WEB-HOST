# GLOW Web Host

Status: `CANDIDATE / DEV_FALSIFICATION_PASS / NOT FULLY FIELD VERIFIED`

GLOW-WEB-HOST is the **public experience, trust surface and AI gateway** for the protected GLOW Web Factory.

```text
PUBLIC USER / CLIENT / PARTNER / REVIEWER
  -> GLOW Web public experience
  -> Trust / capability / quality surfaces
  -> mission workspace and declassified result surfaces
  -> ChatGPT / Claude / Gemini / compatible AI host when reasoning is needed
  -> OAuth + MCP (/mcp-v2)
  -> protected Factory boundary
  -> private GLOW-WEB-FACTORY
```

## Public Host responsibilities

GLOW-WEB-HOST owns only the public boundary:
- customer-facing showcase and mission workspace;
- declassified status/result surfaces;
- public Trust Center and professional capability/quality explanation;
- AI handoff capsule;
- MCP/OAuth transport;
- public schemas, health/readiness and deployment metadata;
- explicit declassification before information reaches a public surface.

It does **not** own Factory Control, Process semantics, KIT/Capability implementation, private evidence, qualification authority, private runtime state or proprietary production methods.

## Three public modes

1. **EXPERIENCE** — help a customer understand GLOW and start a website mission.
2. **OPERATE** — provide the bounded workspace, AI handoff, OAuth and MCP transport needed to work with the protected Factory.
3. **TRUST** — let recruiters, partners, enterprise customers and technical reviewers evaluate architecture discipline, capability coverage, security boundaries, quality controls, release discipline and selected declassified evidence without exposing protected Factory IP.

See `PUBLIC_EXPERIENCE_CONTRACT.md`, `PUBLIC_TRUST_CENTER_CONTRACT.md` and `SECURITY_BOUNDARY.md`.

## Security boundary

`PUBLIC HOST != PROTECTED FACTORY`

`WEB WORKSPACE != FACTORY AUTHORITY`

`PUBLIC PROOF != PRIVATE IMPLEMENTATION`

`MODEL_SESSION_PRIVATE != PUBLIC_DECLASSIFIED`

Protected Factory internals, proprietary methods, KIT/Capability implementation, private evidence, credentials, private prompts and private runtime state must not be copied into this repository.

## Repository and release discipline

- `main` is the canonical public Host release source.
- `sandbox` is the public Host engineering/test branch.
- runtime/component promotion must bind an exact reviewed commit SHA; a branch name alone is not release evidence.
- the private Factory may assemble an exact Host commit, but long-lived production identity should converge on an accepted `main` Host commit after verification.
- documentation-only sandbox work does not by itself rebind the deployed Factory assembly.

Canonical deployment target: `digitaltavi-source/GLOW-WEB-HOST@main`.

Claim boundary: `PUBLIC_UI_EXISTS != FACTORY_INTEGRATED != HOSTINGER_VERIFIED != AI_HOST_REPRODUCED != FIELD_VERIFIED`.
