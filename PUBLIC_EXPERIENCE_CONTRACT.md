# GLOW Web — Public Experience Contract

**State:** `SANDBOX_CANDIDATE / NOT_RELEASED`
**Scope:** customer-facing experience and safe connection to the protected service.

GLOW-WEB-HOST owns public showcase pages, website-intake drafts, customer-safe workspace previews, authentication/transport and declassified results. The protected Factory remains the single authority for project processing, decisions, specialist resources, quality evidence and approval. A UI cannot grant approval or invent progress.

## Source routes (not evidence of deployment)

- `/` — public showcase and project introduction
- `/app` — backward-compatible alias of the public showcase (**not** the actual workspace)
- `/workspace` — candidate customer workspace, in Host `sandbox` only until separately released
- `/api/public/profile` — public Host profile; not private mission state
- `/healthz` — host process health
- `/readyz` — protected service connectivity/readiness when available
- `/mcp-v2` — authenticated ChatGPT/MCP integration route; **not** a website submission API

**Current direct-website limitation:** the workspace builds a customer-authorized copyable draft. It does not create a project directly in the protected service, perform stage transitions, or present verified project progress. Connection readiness never means a specific project has been accepted or released.

## Change and disclosure requirements

- `adapters/chatgpt/` and `adapters/web/` are two source ownership lanes, not new Git branches.
- Shared OAuth, gateway and declassification modules require regression in **both** channels.
- User-facing progress must use authorized, ordinary customer language and may not reveal restricted internal stages, capability routing, or evaluation material.
- Private implementation and credentials do not belong in public Git. Release needs exact source identity, current tests, Founder authority and separately evidenced review.

`PAGE_EXISTS != SERVICE_INTEGRATED != RELEASED != FIELD_VERIFIED`
