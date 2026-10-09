# GLOW Web Host — Repository Layout

This repository is the **public experience, trust and transport component** for the protected GLOW Web Factory. It is intentionally separate from the private Factory repository.

## Stable top-level structure

```text
GLOW-WEB-HOST/
├── README.md
├── SECURITY_BOUNDARY.md
├── PUBLIC_EXPERIENCE_CONTRACT.md
├── PUBLIC_TRUST_CENTER_CONTRACT.md
├── PUBLIC_EXPORT_MANIFEST.json
├── PUBLIC_HOST_CONTRACT_EXPORT.json
├── PUBLIC_AI_HOST_INTEGRATION_GUIDE.md
├── OPERATOR_GATEWAY.md
├── HOSTINGER_PUBLIC_NODE_DEPLOYMENT_PROFILE_v0.1.0.json
├── REPOSITORY_LAYOUT.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
├── public/
├── adapters/
├── contracts/
├── tests/
└── scripts/
```

## Why selected documents remain at root

Several public contracts and deployment documents remain top-level by design because current export/deployment contracts reference their exact paths. Moving them only for cosmetic organization would become a runtime/build-contract refactor and is outside repository-hygiene scope.

The rule is:

`PATH_STABILITY > COSMETIC_RENAMING`

until an evidence-backed migration explicitly updates all consumers and regression proves parity.

## Directory ownership

- `public/` — declassified customer/recruiter/partner-facing web experience.
- `src/` — public Host implementation: HTTP/MCP/OAuth/declassification and bounded gateway behavior.
- `contracts/` — public schemas and versioned Host/Factory interaction contracts.
- `adapters/` — public-safe integration adapters only.
- `tests/` — Host behavior and contract regressions.
- `scripts/` — build/release verification helpers for this public component.

## Root-document ownership

- `README.md` — entry point and current public role.
- `SECURITY_BOUNDARY.md` — public/private trust boundary.
- `PUBLIC_EXPERIENCE_CONTRACT.md` — customer/workspace experience ownership.
- `PUBLIC_TRUST_CENTER_CONTRACT.md` — recruiter/partner/reviewer trust surface.
- `PUBLIC_EXPORT_MANIFEST.json` — exact public export allow/deny policy.
- `PUBLIC_HOST_CONTRACT_EXPORT.json` — public Host contract export.
- `PUBLIC_AI_HOST_INTEGRATION_GUIDE.md` — AI-host connection guidance.
- `OPERATOR_GATEWAY.md` — bounded operator-channel documentation.
- `HOSTINGER_PUBLIC_NODE_DEPLOYMENT_PROFILE_v0.1.0.json` — public Node deployment profile.

## What must never be copied here

- private Factory source;
- Factory Control internals;
- KIT or Capability implementation;
- proprietary production methods;
- private evidence or qualification material;
- credentials, tokens or private runtime state;
- confidential prompts or internal evaluation rules.

See `SECURITY_BOUNDARY.md` and `PUBLIC_EXPORT_MANIFEST.json` for the enforceable boundary.

## Branch discipline

- `main` — canonical public release line.
- `sandbox` — public Host candidate/development line.

A Factory assembly may pin an exact immutable Host SHA. Branch names do not replace exact component identity.

## Hygiene rule

Do not introduce one-off logs, private handoffs, Factory evidence dumps, temporary patches or duplicate preservation trees at repository root. Keep this repo public-product oriented and move experimental material to `sandbox`-only bounded locations when required.

Current documentation normalization is structure-only. It does not change `src/**`, `public/**`, adapters, OAuth/MCP behavior, package dependencies, Hostinger settings or the currently pinned Host component used by the private Factory assembly.

`PUBLIC HOST != PROTECTED FACTORY`
