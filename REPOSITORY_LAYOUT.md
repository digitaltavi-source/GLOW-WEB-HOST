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

## Branch and channel discipline

- `main` — single public release source for the shared web listener; no automatic direct edits.
- `sandbox` — existing Host-only development, integration, testing and documentation branch.
- `adapters/chatgpt/` plus MCP/OAuth-bound `src/` modules — ChatGPT connection ownership lane.
- `adapters/web/` plus public UI and declassified web API modules — direct website connection ownership lane.
- Shared identity, security and backend connectors require two-lane regression; neither lane may duplicate protected project semantics.
- **Zero extra Git branches:** `main` and `sandbox` are the ONLY permitted branches in `GLOW-WEB-HOST`. All edits and tests happen on `sandbox` first; `promotion/*`, `repair/*`, `security/*` and ad-hoc work branches are forbidden.

A Factory assembly may pin an exact immutable Host SHA. Branch names do not replace exact component identity.

## Auditable connector ownership

See `adapters/CONNECTOR_OWNERSHIP.json` for the active candidate mapping of the two public channels, their shared trust layer, immutable source hashes and staging ownership. `tests/connector-ownership.test.ts` checks the mapping through the standard `npm test` suite.

- Keep the authenticated ChatGPT/MCP lane isolated from `public/` browser UI changes.
- `/app` is a showcase compatibility alias; the unreleased customer workspace is `/workspace`.
- Do not relocate root export, operator or deployment contracts until exact dependent references and release regression have been checked. A path move is not a cosmetic cleanup.
- Zero extra branches: historical promotion/repair branches have been audited, immutably preserved in bounded `sandbox` archives, and deleted.

## Hygiene rule

Do not introduce one-off logs, private handoffs, Factory evidence dumps, temporary patches or duplicate preservation trees at repository root. Keep this repo public-product oriented and move experimental material to `sandbox`-only bounded locations when required.

Current documentation normalization is structure-only. It does not change `src/**`, `public/**`, adapters, OAuth/MCP behavior, package dependencies, Hostinger settings or the currently pinned Host component used by the private Factory assembly.

`PUBLIC HOST != PROTECTED FACTORY`
