# GLOW Web Host — Repository Layout & Release Boundary

Date: 2026-10-09
Status: `SANDBOX_CANDIDATE / DOCUMENTATION_ONLY / NO_RUNTIME_CHANGE`

## Branch roles
- `main`: canonical accepted public Host release source.
- `sandbox`: engineering, contract, transport and public-experience candidate work.

## Source layout
- `public/` — public website/workspace assets.
- `src/` — public host transport/runtime implementation only.
- `adapters/` — public-safe adapters; no protected Factory implementation.
- `contracts/` — public schemas/contracts.
- `tests/` — public Host tests and boundary checks.
- root public documentation — role, security, deployment and integration contracts.

## Non-negotiable boundary

The public repository must remain reconstructable without becoming a mirror of the private Factory. Protected Factory code and evidence are referenced by explicit contracts/immutable package identity at assembly time, never copied into this source tree merely for convenience.

## Current normalization scope

This candidate only clarifies Host responsibility and adds the Trust Center contract. It does not modify `src/**`, `public/**`, adapters, OAuth behavior, MCP behavior, package dependencies, Hostinger settings or the currently pinned Host component SHA used by the private Factory assembly.

Preservation anchor before this documentation change: `sandbox@d87309dbaab784fc35c152b245c38d56a8ab9d4a`.

## Promotion gate

Before public Host `sandbox` can be promoted to `main`:
1. verify exact diff and source identity;
2. run current Host regression/security/declassification checks;
3. prove no protected Factory content leaked into public source;
4. bind the accepted exact Host SHA in the Factory assembly;
5. rerun affected combined assembly/runtime verification;
6. promote/deploy only under separate release authority.

Claim ceiling: `PUBLIC_HOST_LAYOUT_CANDIDATE / NO_RUNTIME_CHANGE / NOT_PROMOTED / NOT_DEPLOYED`.
