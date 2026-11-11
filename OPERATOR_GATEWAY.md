# GLOW Web — Restricted operator boundary (public outline)

**Status:** public-safe operational boundary, not a configuration runbook or an authorization receipt.

Some project decisions and evidence-handling actions require a separately authenticated, narrowly scoped operator session. Public website users and ChatGPT tools cannot grant those permissions simply by presenting a role label, email address or project identifier.

The operator channel is separate from the customer web pages and the canonical MCP route. Privileged requests must be authorized by the protected service, bound to the exact project, actor, intended action and current version, and rechecked before changing state.

**Fail closed:** if identity, permission, backend integrity or project ownership cannot be verified, report a bounded unavailable or unauthorized result. Never simulate privileged success locally. Do not copy privileged packets, credentials or restricted evidence into a public page, example, log or repository file.

Configuration values, protected approval payloads and internal operating procedures belong in a separately access-controlled deployment runbook, **not in this public repository**. Historical commits may retain earlier documentation; replacing this active copy does not erase public Git history.

No live operator configuration or route is changed by this document. This file is not a deployment, qualification or independent audit claim.
