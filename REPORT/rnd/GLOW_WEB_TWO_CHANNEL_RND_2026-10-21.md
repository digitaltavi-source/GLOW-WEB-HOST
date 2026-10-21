# GLOW Web — International-grade two-channel experience R&D (21/10/2026)

**Record:** GLOW-HOST-RND-TWO-CHANNEL-20261021-R1. **Status:** RESEARCH_SUPPORTED_ARCHITECTURE_CANDIDATE / NOT_CANON / NO_RELEASE. **Class:** BUILDER_RND + SOURCE_INSPECTION + SELF_REVIEW, not independent qualification. **Target:** GLOW-WEB-HOST `sandbox@affba9689139e8e41edca9d4c9ae05b79313eb12`, current `main@d63cbdf017d5e47cb50b77f0c85fe2198bffdbb3`. Private Factory remains untouched.

## Decision and problem framing

**Job:** a user can choose website or ChatGPT on ONE public domain and work on the SAME protected project through authorized, independently authenticated interfaces. Every displayed status must come from an authorized, declassified server result. Host owns user experience and transport, not Factory decisions, specialist methods, private evidence or release authority.

**Frozen constraints:** `/mcp-v2` and live plugin remain unchanged; no new permanent Git branch; Host `main`, Hostinger and Factory private are no-write zones for this R&D; protected code never enters public Git. The established Factory process/capability separation cannot be refactored by Host research. Current governing candidate standard 16 is NOT_ACTIVE_CANON; references inform analysis but grant no architecture-change authority.

**Inspected Git evidence:** Existing Host sandbox has `/workspace` with a copyable draft, but NO `/api/web/*` create/status mutation API and no browser user-session authorization flow. `src/server.ts` differs from current Host main by an insertion of precisely three workspace-related GET routes (384 characters); otherwise source matches. `src/oauth.ts`, `src/backend.ts`, `src/mcp-app.ts` are identical Git blobs to Host main; `/mcp-v2` appears once and uses `authV2`. This is STATIC source evidence, not HTTP/regression/Hostinger evidence. A naive string-cut comparison falsely flagged a difference until a prefix/suffix diff showed the insertion-only structure; evaluator false-positive preserved. Existing server continues to expose public profile and readiness only; readyness is not project acceptance. Users currently must continue actual work in connected ChatGPT.

## Research — primary authoritative and practitioner sources (external, NOT project authority)

| Source and version | Applicable essence | Exact candidate implication | Caution/falsifier |
|---|---|---|---|
| IETF RFC 10017, Aug 2026, browser OAuth BCP (https://www.rfc-editor.org/rfc/rfc10017.html), and RFC 9700 OAuth Security BCP (https://www.rfc-editor.org/rfc/rfc9700.html) | BFF keeps OAuth/tokens server-side, browser receives secure session cookie; use authorization-code protections | Introduce website-only same-origin BFF routes with OIDC code+PKCE where applicable; secure, HttpOnly, SameSite cookie, server-side subject binding; leave MCP OAuth path intact | BFF increases server cost and CSRF/proxy risk; validate hostname allowlist, CSRF, logout, rate limit and session expiry before use |
| OWASP ASVS 5.0 (https://asvs.owasp.org/), OWASP Session Management (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Inspect authentication, authorization, session, CSRF, output boundaries as testable controls | Server-trusted owner association, no self-claimed actor/role; forbid browser secret storage; deny cross-account project reads | `HttpOnly` alone does NOT stop CSRF or injected browser requests |
| Stripe idempotent API (https://docs.stripe.com/api/idempotent_requests) | Identical retry key and request must not create a second object; mismatched payload rejected | Stable request_id/idempotency key bound to subject + payload hash + operation + mission; reconcile unknown outcome before retry | A random UUID alone, or storing dedup only in a restarted web process, is insufficient |
| GOV.UK Design System (https://design-system.service.gov.uk/patterns/check-answers/ ; https://design-system.service.gov.uk/patterns/confirmation-pages/) | Explain next action; review before sending; confirmation only after accepted operation | Draft → Review → Submit → actual issued project receipt; provide clear error/return journey and confirmation reference | Do not label a copyable draft or HTTP 202 as completed project |
| Atlassian Design (https://atlassian.design/components/progress-bar/usage) | Use determinate progress only when real percentage is known | Display simple, server-issued customer-safe milestones; use indeterminate processing status otherwise | Never infer percent from hidden Factory stage count |
| W3C WCAG 2.2 (https://www.w3.org/TR/WCAG22/) | Testable accessibility criteria across keyboard, touch, focus, forms and authentication | Target AA with manual keyboard/screen-reader and automated audits, Vietnamese fonts and input-method tests | Source CSS presence is not accessibility conformance |
| Google Core Web Vitals (https://web.dev/articles/vitals) | LCP ≤2.5s; INP ≤200ms; CLS ≤0.1 at p75, mobile/desktop separately | RUM and realistic-device performance gates for the workspace | Lighthouse lab green is not p75 production evidence |
| Hostinger Managed Node limits (https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/) | 120-second request limit, no always-running background workers on this hosting class | Keep API response bounded; long work requires an approved durable executor/status contract, not held-open HTTP or browser timer | Verify customer's actual plan and support before selecting scheduler/worker provider; same domain need not imply same executor machine |
| OpenTelemetry context propagation/security (https://opentelemetry.io/docs/concepts/context-propagation/ ; https://opentelemetry.io/docs/security/) | Correlate cross-service events but protect sensitive telemetry | Pseudonymous request/trace IDs, route/error-class latency, redacted audit trail, retention policy | Never log raw prompts, tokens, restricted payloads, protected URLs or ownership claims |
| NIST SSDF SP 800-218 (https://csrc.nist.gov/pubs/sp/800/218/final) and SLSA Source 1.2 (https://slsa.dev/spec/v1.2/source-requirements) | Change integrity, provenance and verified secure build practice | Exact SHA-bound CI, dependency review, artifact hash and deployment readback; branch restrictions wherever platform permits | `CI PASS != RELEASE APPROVED`; no SLSA level claim without attestations/evidence |

## Competing hypotheses and destructive decision

**A — Same-domain BFF beside unchanged MCP (preferred, conditional).** Website: `/workspace` → proposed `/api/web/v1/*` → browser-specific cookie/BFF authorization and a declassified adapter → existing protected service. ChatGPT: unchanged `/mcp-v2` → its own OAuth → same protected service. PRO: avoids browser tokens, preserves domain, allows independent interface UX and common protected project truth. CON: session/CSRF persistence, two identity representations and hosting CPU constraints. **SELECT AS CANDIDATE ONLY**, after contract and isolated auth proofs.

**B — Direct browser-to-private API bearer tokens.** Faster to prototype, but exposes tokens/CORS/provider boundaries and complicates user-to-project mapping. **REJECT** for current confidentiality/safety target unless counterevidence proves equivalent safeguards and explicit governance approves.

**C — Second web domain / duplicate protected processing in Host.** Would create split identity, mutable state and implementation ownership; violates current intent and raises cost. **REJECT** as default. An isolated *non-public* execution backend may later be justified by measured durable-work needs; it is not an extra customer-facing domain.

**D — Reuse ChatGPT session/token for website.** Fails independent identity/session and provider trust boundary. **REJECT**. Cross-channel account linking, if required, must use a separate short-lived, one-time, explicitly consented and server-verified identity binding. Never infer equivalence from email text.

## Concrete candidate interaction contract (NOT YET IMPLEMENTED)

Public-safe read-only: `GET /api/web/v1/session` (authenticated session state or 401), `GET /api/web/v1/projects/:id` (only owner-authorized declassified DTO), `GET /api/web/v1/projects/:id/results` (only release-permitted customer payload).

State-changing: `POST /api/web/v1/projects` requires CSRF/origin checks, subject-to-account binding, bounded schema, stable idempotency key and server authoritative admission; return `202 accepted` only with canonical accepted receipt; on uncertain network effect reconcile prior request before retry. Do NOT reuse generic MCP work-package tools as browser APIs. More privileged mutations (approval, publication) require separate authorization and exact server-issued preview binding and must not exist as open generic `action` endpoints.

Customer DTO whitelist: `project_id` (opaque user-safe), `title`, `status_label` (user language from authorized server mapping), `available_actions` (authorization-filtered), `updated_at`, `user_message`, `result_links` (only approved). Suppress unknown fields, internal states, proprietary process routing, private evidence and specialist names. The schema is a DESIGN CANDIDATE, not proof these fields are available from the current backend.

No browser-side token storage, Factory source, direct service credential, web-to-MCP bearer reuse or client-invented status. No implicit acceptance because the form rendered or the network replied HTTP 200.

## Minimum rollout gates (each must produce actual raw results)

0. **Freeze source / preserve plugin:** exact Host `main`+sandbox source, route scan, versioned auth/MCP fixtures and current-known-good connection; all must remain unchanged during web-only trials.
1. **Identity gate:** isolated website BFF login/session/logout/refresh; sessions bound to project owner; CSRF, token leakage, invalid issuer/audience, replay/cross-tenant tests. Any defect BLOCK.
2. **Read-only vertical slice:** authenticated declassified project listing/status, 401/403/404 and backend 503 cases; server-only field allowlist and zero internal disclosure.
3. **Create-once gate:** approved isolated project-create adapter with persisted idempotency and timeout reconciliation; test duplicate clicks, payload mismatch, restart, ambiguous retry and race.
4. **Human task UX gate:** Vietnamese UTF-8 typography, keyboard screen-reader traversal, responsive 320/390/768/1440, review+confirm, truthful pending/degraded/error states, each visible control functional with evidence.
5. **Two-lane regression:** real API fixture + preserved MCP/OAuth routes and required tools, normal/failure/adversarial/recovery; no live plugin writes. Full `npm ci && npm test` + dependency audit and browser tests against exact candidate SHA.
6. **Release authority:** Founder decides after independent review; only then main promotion/Hostinger deployment, exact hash readback and rollback simulation. No unqualified 5-Star claim.
7. **Field value:** observe real user outcomes, time to first accepted project, completion without assistance, recoverability and corrections, with privacy-safe metrics and evidence before claiming professional field success.

**Blockers:** current Host has no authorized browser session service or verified direct web mission adapter, no evidence of durable job state for web executor, no full Node/TypeScript and browser run for this candidate, no independent qualification, no live field verification. Do not code privileged web API or move private Factory semantics into Host until upstream contract/identity owner is resolved.

## Four-path falsification and acceptance test matrix

See `REPORT/rnd/TWO_CHANNEL_ACCEPTANCE_CASES_2026-10-21.json` for 22 frozen *proposed* cases. Test source exists only as requirements; all cases remain `NOT_RUN` unless independently executed against an exact candidate and raw logs preserved. Always test normal, failure, adversarial and recovery. A 200/202 response alone is not a PASS without observed durable effect.

## Seven Golden Mindsets contribution receipt

1. **First principles:** one domain and two customer interfaces are not the same as two process engines; minimized to a browser BFF beside existing MCP.
2. **Context:** public Host and private Factory, live release authority vs sandbox experimentation, exact source SHA.
3. **Systems:** unique semantic owner for state/authorization; declassified read model is per-channel; no copied private runtime.
4. **Event-driven:** API timeout != no side effect, idempotent request + authoritative reconciliation, progress server-issued.
5. **OODA:** define observed user task outcomes, not file counts or fake green statuses.
6. **Phoenix:** false-identity, token theft, CSRF, duplicate action, stale state, backend outage, recovery test design.
7. **Critical thinking:** reject unnecessary second domain, browser bearer architecture and blind copying of vendor patterns. A failed naive text-diff check was traced to the checker, not falsely labeled a product defect.

**Skill composition receipt:** Context/authority, deep R&D, architecture, contract/invariant, security, runtime/provider integration, verification planning, evidence/claim audit, state and repository stewardship ACTIVATED by source+case+decision evidence. Product code implementation NOT_MATERIAL at this gate: current task is pre-build R&D and frozen requirements before an authorized web-auth contract exists. Incident root-cause route used only for evaluator false-positive; no current live incident diagnosed. This does not claim hard-admitted specialist invocation or independent status.

## 5-Star qualification mapping — target only

1. **Business fitness:** real customer completes job and understands chosen channel, no duplication of project records.
2. **Professional competence:** expert review of actual website deliverable, not just UI design attractiveness.
3. **Operational trust:** security/identity/authorization/CSRF/replay/observability/recovery evidence.
4. **Reproducibility:** clean exact-SHA build, same journeys on isolated condition and cross-browser tests.
5. **Field value:** real users complete intended tasks with measurable fewer corrections/time saved and safe recovery.

No pillar is marked PASS without applicable evidence. **Disposition:** `MANDATORY_FIX / RESEARCH_COMPLETE_FOR_CANDIDATE_SELECTION / BUILD_AUTHORITY_NOT_EXTENDED / NOT_QUALIFIED`. Next material gate: validate website-specific OIDC BFF session and account-to-project authorization contract in isolated Host sandbox while preserving `/mcp-v2` byte and route identity. If this gate fails, do not initiate public project creation.
