# Auth0 MCP recovery — GLOW Web

This runbook exists to recover the canonical `/mcp-v2` OAuth path without changing Factory mission state.

## Frozen architecture

- Canonical resource/API identifier: the exact public HTTPS MCP URL, e.g. `https://<host>/mcp-v2`.
- Base action scope: `web.run`.
- Evidence step-up scope and permission: `web.evidence.admit`.
- Phase acceptance step-up scope and permission: `web.accept`.
- GLOW Web validates both delegated OAuth scope and the Auth0 `permissions` claim. Scope alone or RBAC alone is insufficient.

## Auth0 tenant requirements

1. The custom API identifier must equal `GLOW_OAUTH_AUDIENCE` and the MCP `resource` value.
2. API permissions must include `web.run`, `web.evidence.admit`, and `web.accept`.
3. API RBAC must be enabled and **Add Permissions in the Access Token** must be enabled.
4. Third-party default API permissions must authorize the scopes required by dynamically registered MCP clients.
5. Tenant **Resource Parameter Compatibility Profile** must be enabled so RFC 8707 `resource` can select the API when the client does not send Auth0's proprietary `audience` parameter.
6. Tenant Dynamic Client Registration security mode must be `strict` for new clients.
7. A client created in legacy/permissive DCR mode cannot be upgraded in place. Revoke/retire it and force the external MCP client to register a new client after strict mode/default API grants are configured.

## Recovery sequence

1. Preserve the existing mission and Factory state; do not reset or self-approve anything.
2. Configure Auth0 tenant/API settings above.
3. Create a fresh ChatGPT/MCP connection so a new strict DCR client is registered. Do not reuse an old permissive client identity.
4. Confirm the protected-resource metadata advertises `web.run`, `web.evidence.admit`, and `web.accept` and points at the correct Auth0 issuer.
5. Call the evidence-admission preflight with the fresh connection. Missing scope must return an MCP `isError` result with `mcp/www_authenticate`; after reauthorization it must return `ELIGIBLE_FOR_SCOPED_EVIDENCE_ADMISSION`.
6. Confirm phase-acceptance preflight can separately obtain `web.accept` when needed.
7. Only then register actual artifact bytes and evidence; reconcile authoritative state before retrying any ambiguous write.

## Clean-room isolation test

Use a newly registered MCP client/connection against the same `/mcp-v2` endpoint. If the new connection receives the dedicated scopes while the old connection does not, the defect is connection/client lineage, not the Factory mission or evidence engine.

## Supabase decision boundary

Do not replace Auth0 with Supabase OAuth Server as a drop-in repair for this contract unless custom delegated scopes equivalent to `web.run`, `web.evidence.admit`, and `web.accept` are supported and verified by the target Supabase runtime. A provider migration must preserve scope/RBAC separation, exact audience/resource binding, PKCE, refresh/revocation behavior, and existing Factory authority semantics.

## Closure criteria

Close the incident only when all are reproduced on the exact deployed runtime:

- stable tool catalog across reconnect;
- fresh client registration and token issuance;
- `web.run` + `web.evidence.admit` preflight PASS;
- `web.accept` step-up available independently;
- RBAC permissions present in access token;
- exact runtime/assembly identity verified;
- actual RC3 artifact admission PASS;
- artifact readback/inspection PASS;
- one GE evidence registration PASS;
- reconnect regression PASS;
- no unresolved material defect in the declared recovery scope.
