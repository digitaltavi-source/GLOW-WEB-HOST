# Host/Factory boundary audit — 2026-10-21

**Class:** BUILDER SELF_REVIEW / ENGINEERING R&D / META-FACTORY AUDITOR METHOD; no independent acceptance.
**Founder scope:** private Factory owns internal process, capability, governance, runtime semantics and restricted evidence; public Host owns customer UI, GPT/MCP transport, direct web channel, safe staging and deployment, with public disclosure minimization. No production/main mutation authorized by this audit. No new Factory branch.

## Exact inspected identities

- Private Factory main: `dc10bb41384880cb6677648936bf44c3014bd222`; private Factory sandbox inspected: `2169d406db83d81d3633b82243e4bfc2825c04b3`.
- Public Host main: `d63cbdf017d5e47cb50b77f0c85fe2198bffdbb3`; Host sandbox initial: `f752c7ffab914e2691e7fddd1be45d5584949acb`; narrowly edited Host sandbox: `3a6d9f46676e932edd05850ba160f3adfe80235b`.
- Public Host has existing `main`, `sandbox` and three historical/temporary branches: `canonical-host-clean-v1`, `promotion/file-backed-artifact-admission-20261013`, `repair/mcp-oauth-cleanroom-20261011`. None deleted or repurposed. Branch names do not prove active usage.

## Source classification and custody

1. **Exact duplicate public export**: `host-export/GLOW-WEB-HOST/` within Factory main contains 58 file objects; compared with Host main: **35 exact Git blob matches**, **15 differing**, **8 absent in Host main**. It is NOT safe to copy all or select the older Factory export wholesale, because Host main has newer fixes and some missing documents are already in Host sandbox. Mark `MIGRATE_BY_PROVENANCE_AND_CONSUMER_PARITY`, not deleted.
2. **Assembly/deployment**: `combined-staging/` has 22 files on Factory main (23 on sandbox), covering component locks, public Host checkout, native private runtime assembly, Hostinger smoke/field verification and build tools. Destination owner should be Host release/staging, but **existing scripts assume `process.cwd()` is the private Factory checkout** and read private `factory/` files and locks. Need new Host-owned assembler that pulls a restricted exact private package at release time with secret-free, verified identity and private runtime never committed to public Git. Merely moving files breaks these paths or exposes private code.
3. **Mixed bridge**: `host-integration/node-private-host/` has 16 files on Factory main, with Node provider glue, Pyodide, Python bridge and admission/authorization logic. Authorization, replay control, private runtime execution and internal review modules must remain in the protected package pending semantic extraction; public Host may own only generic transport adapters. **No direct folder move or public mirror.**
4. **Protected service**: Protected service internals, disclosure policy and runtime guards retain private ownership. Only reviewed public request/response schemas can be exported. Publication allowlist and denylist have precedence over convenience.
5. **Factory runtime**: Protected process and specialist implementations and Private processing-stage internals remain protected. Public interface must display ordinary user-oriented milestone labels without stage names or capability IDs. Host may not self-approve, grade or promote project state.
6. **Other main-vs-sandbox drift**: Host sandbox initially differed from Host main, including OAuth/server/evidence admission. Do not merge or overwrite these files without three-way reconciliation against current main and real MCP/web regressions.

## Channel boundaries, existing sandbox used

- **GPT connector lane**: `adapters/chatgpt/`, MCP `/mcp-v2`, OAuth/scope/RBAC, tool responses with strict exposure classes. Current selected GLOW WEBSITE plugin remains unchanged. 
- **Direct website lane**: `adapters/web/`, `public/`, customer-friendly mission presentation and declassified web API. No raw process/capability/quality rubric leaks.
- **Shared trust boundary**: exact backend contract, token validation, safe exposure/declassification, error and replay policy owned once, exercised by both channels. Two adapter lanes are **not two permanent Git branches**: a single Node process releases both at one exact reviewed Host commit. The existing Git `main` (release) and `sandbox` (engineering) suffice; do not create gratuitous permanent branches.
- Host sandbox code commit `3a6d9f46676e932edd05850ba160f3adfe80235b`: replaced stale ChatGPT adapter overview with public-safe contract, added website adapter ownership guide, removed internal stage names from operator-facing labels, clarified lane/branch rule, authored a regression test.
- **Tests:** `tests/public-disclosure-boundary.test.ts` is test SOURCE, **NOT EXECUTED**. Host full regression, live/browser font and connection compatibility, source redaction scanner, private build projection, golden customer acceptance all NOT_RUN. No field quality or independent audit claim.

## Security/adversarial blockers

- Fake progress: UI must display only user-authorized server-provided statuses; no local simulation.
- Information leakage: internal stage IDs, raw capability selection, private criteria, Factory state or `MODEL_SESSION_PRIVATE` may not be rendered on public pages or written into public logs.
- Boundary abuse: web or GPT API parameter/role label cannot grant Process/Human Release authority; explicit OAuth scopes and server decisions remain mandatory.
- Stale deployment: same-domain public UI may be older than sandbox/main, require exact provider build/release artifact identity plus `main` hash before claim.
- Cross-route regression: any change in shared auth/transport must prove normal, failure, adversarial and recovery paths in both GPT and direct web channels.
- Public Host repo must never include a protected runtime copy, even if combined release artifact embeds protected code at a managed deployment destination behind access control. **Public Git source != private deployment artifact.**

## Engineering disposition and next gate

**MANDATORY_FIX / PARTIAL_IMPLEMENTATION / NO_RELEASE.**
Positive: two publicly safe channel documentation seams and operator display wording changed on Host sandbox; public/private source tree verified.
Unresolved: exact safe extraction of assembly scripts, private bridge relocation, removal of legacy Factory mirrors, Host regression, renderer/font QA, protected provider release. Their absence is not automatic evidence of production failure, but they block claimed closure.

**Change ordering:**
1. freeze current main/sandbox/deployment identities, classify every duplicated file plus import, build and release consumers (including private-side references);
2. rebase/reconcile Host sandbox against current Host main without overwriting OAuth/MCP fixes;
3. implement Host-owned assembler/deployment using immutable private-package ingestion and source-control-safe manifests, negative tests for private source leaks;
4. move only public-safe adapters and customer UI to Host and keep private enforcement semantics private;
5. run both-channel full tests and live browser Vietnamese typography/accessibility/responsive tests;
6. Founder-directed separate auditor reviews source-diff, positive and negative receipts and rollback before any approved main promotion or decommissioning old Factory files.

**Four paths:** NORMAL correct login/intake/declassified status; FAILURE protected runtime unavailable; ADVERSARIAL forged identity/internal data/leaked logs; RECOVERY exact component pin restoration and retry without duplicate stage transitions. Test execution remains **NOT_RUN** for this Host candidate.

**Claim ceiling:** `SOURCE_INSPECTED + HOST_SANDBOX_CODE_COMMITTED; NO_FULL_REGRESSION; NOT_PRODUCTION_READY; NO_INDEPENDENT_QUALIFICATION`.

**Falsifier:** exact current Host build/runtime/source and negative integration suite could show the interface and transport are not yet compatible. Keep the candidate blocked until reproduced.
