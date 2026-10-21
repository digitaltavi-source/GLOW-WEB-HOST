# GLOW Web Host — Engineering logbook (sandbox only)

## 2026-10-21 — Two-channel isolation and staging preflight

**Authority:** Founder-directed implementation; ChatGPT is the Builder, Codex is the Founder-directed independent auditor. No auditor verdict is claimed.

**Source baseline:** Host `main@d63cbdf017d5e47cb50b77f0c85fe2198bffdbb3`; Host `sandbox@ad136026c509871258dc08c6872311e831c3bd85` before work. Private Factory `main@dc10bb41384880cb6677648936bf44c3014bd222`. No change to either main, private Factory sandbox/backup, live mission, MCP plugin or Hostinger.

**Actual implementation:**
- `aa52388070ca4bbfe1b7ce4d45338a2f96a0b533`: reconciled 10 exact verified file blobs from current Host main into Host sandbox (OAuth, MCP, file admission, connection diagnostics and related tests), preserving prior sandbox-only adapter/public-language work.
- `1df477ffbc5325016452e708f89189005c35683b`: added Host-owned isolated private package SHA-256/path/symlink preflight in `scripts/verify-private-package.mjs`, seven-case regression source `tests/private-package.test.mjs`, and public staging contract `staging/README.md`. The verifier does not unpack protected Factory code into public source or invoke runtime, and does not prove Git provenance or qualification.
- Earlier `ad136026c509871258dc08c6872311e831c3bd85` separated public documentation for ChatGPT/MCP lane and website lane, redacted public operator step labels, and authored non-executed disclosure test.

**Test evidence:** A locally authored antecedent verifier with equivalent acceptance/rejection rules was executed under Node.js 22.16.0 via `node --test`: **7/7 pass, exit 0**. Its bytes were NOT identical to the final GitHub implementation; therefore **exact committed source is NOT YET EXECUTED**. Neither TypeScript full Host suite nor actual combined live Factory/GPT/web routes have been run in this session. This is developer evidence only, never independent acceptance.

**Audit counterevidence / unresolved:** Existing Factory main still contains Host export clones (58; 35 exact duplicate, 15 drifted, 8 missing in Host main), coupled assembly scripts (22) and mixed private gateway/bridge (16). Do not copy protected admission code to public or delete Factory files without frozen consumer/import/build/custody proof. Existing Host main has transport changes beyond sandbox; critical 10 files refreshed but full branch diff reconciliation remains open. There are historical branches in Host besides main/sandbox; no cleanup without value audit. Default public UI/operator still needs professional redesign and verified Vietnamese font rendering; no actual deployed change.

**Four-path assurance:** NORMAL external matched package check modeled locally; FAILURE digest mismatch; ADVERSARIAL traversal/symlink/credential path/duplicate identity rejected; RECOVERY external runtime rebind/rollback and exact source provenance NOT_RUN. Protect one semantic owner and redact internal operations from public.

**Outcome:** `HOST_SANDBOX_IMPLEMENTED / STATIC_SHA_READBACK_VERIFIED / EXACT_COMMIT_REGRESSION_NOT_RUN / NO_RELEASE`.

**Next:** Run exact GitHub code tests + full npm Host suite, test safe private runtime package custody and two-lane API/MCP in isolation, review branch drift, then stage true public UI under Host with correct Vietnamese font and declassified progress language. Founder independently directs Codex audit before promotion. Do not infer direct hosting write permission.

## 2026-10-21 — Customer workspace source implemented, not deployed

**Builder execution:** Host sandbox commit `f506ae97a6f7b0436678f9655d74152acc29b1ac` introduced `/workspace`, `/workspace.css`, `/workspace.js`, Vietnamese UI, responsive layout, keyboard focus, reduced-motion styles, an intake draft and genuine read-only `/api/public/profile` + `/readyz` connectivity check. It also changes the home-page CTA to the workspace and adds `tests/workspace-route.test.ts` (test authored, NOT_EXECUTED). GitHub blob readback verified source identities: HTML `0b100da8a689c7691a324ed3a3c115588bf127dd`, CSS `8c0e520d3df6c86d1f069a42e34da679938a7b61`, JS `299c1be48207ad02f9be6ce90702dd42d08cf2ca`, server `b22f1b41db1a4c0ee85cf9b79652c3caa897d7a7`.

**Actual limits and blockers:** The form is DRAFT_ONLY_NOT_SUBMITTED and opens the separately authenticated ChatGPT channel only after explicit customer action; does not create protected mission or emulate private stages. `/workspace` is **not live**; Host main and production unchanged. Direct web project submission, web identity authentication, full Node/TypeScript regression, visual screenshot/browser review and independent audit NOT_RUN. The Host build still requires exact package/dependency environment. Accessibility/fonts are source reviewed only, not field verified. No static/green success is product quality qualification.

**Four paths:** NORMAL draft validated and read-only status designed (source only); FAILURE disconnected backend reports unavailable; ADVERSARIAL no secret/full process payload in page and no client-side state mutation; RECOVERY clear status retry. These cases have NOT_RUN browser/route integration proof. **Disposition:** KEEP_HOST_SANDBOX_CANDIDATE, NO_RELEASE. **Next:** exact-source build/test including new stage preflight and workspace route, browser Vietnamese font/mobile check, two-channel OAuth/MCP regression, private-package interface/source ownership reconciliation. Founder directs Codex independent acceptance.

## 2026-10-21 — Plugin-safe Workspace regression / staging falsification

**Change authority:** Founder instructed to proceed without affecting currently working GPT plugin. Builder updated only GLOW-WEB-HOST sandbox; did not change Host main, deployed Hostinger, plugin configuration, private Factory or live missions.

**Source baseline:** Host sandbox before patch `25708c77c19c1a1f5998c12aace2573d6dd6eba2`, patch commit `42431f4bb5d8ac49c00ce9f0ffdb3347a16460dc`. Three edited files only: `scripts/verify-private-package.mjs` Git blob `7232ec67d7d072070b94243e8609698a80a94f2e`, `tests/private-package.test.mjs` Git blob `d2a82ef9875378e9c2f6498721c59fd001f9e05a`, `tests/workspace-route.test.ts` Git blob `0b6d77953c0873b438fe4997c640886a034dcfcc`. All three compared byte-for-byte to isolated local source with Git blob identity prior to push.

**Red/green evidence:** Original staging verifier and original tracked 7 tests were recreated; two source Git blobs MATCH, original 7/7 tests PASS with Node 22.16.0. Additional adversarial test with `packageRoot=process.cwd()` reproduced original unsafe acceptance `NEGATIVE_TEST_UNEXPECTED_ACCEPT VERIFIED_PACKAGE_BYTES_ONLY`: an external manifest could identify the Host checkout root as an external private package. Root cause: `within(root,p)` excludes equality, and first guard checked only strict descendants. Bounded repair uses `insideOrEqual(realpathSync(process.cwd()),realpathSync(packageRoot))` and same for manifest. Updated exact Git-equivalent code and tests ran 8/8 PASS, exit 0, Node 22.16.0. The replayed malformed test source initially had a transcription-only syntax error; source SHA mismatch identified before assigning blame, and true Git source was reconstructed to exact SHA. This is not a Factory defect.

**Plugin fence:** Workspace route tests now resolve original source relative to `process.cwd()`, compatible with `dist/tests/*.test.js` execution, and assert canonical `app.all("/mcp-v2",authV2,(req,res)=>void node(req,res,req.body))` plus `glow_register_factory_artifact_file` tool registration and route singularity. New assertions authored/static reviewed but full TypeScript/Host integration suite **NOT_RUN** due absent complete Host checkout and installed npm dependency tree in this local container. Direct route-invariant source review verifies dedicated `/workspace` routes and separate original protected MCP registration. This is no live plugin verification.

**Four paths:** NORMAL exact package check pass; FAILURE missing/mismatched bytes test; ADVERSARIAL symlink/traversal/credential/duplicate/checkout-root test; RECOVERY does not apply to a non-mutating verifier; live package deployment rollback NOT_RUN. No independent audit claim. No user data or model-session-private payload copied.

**Disposition:** `DEV_REGRESSION_8_PASS / MCP_ROUTE_STATIC_FENCE / FULL_HOST_REGRESSION_BLOCKED / NO_RELEASE`. Next: obtain exact complete Host sandbox checkout/dependency environment and execute whole Node suite + safe website/MCP fixture route tests, then qualified browser visual QA before any main/live change.

## 2026-10-21 — Branch hygiene and connector ownership audit

**Authority:** Founder requested investigation and professional organization, not deletion or production promotion. BUILDER SELF_REVIEW / ENGINEERING R&D / NOT INDEPENDENT AUDIT.

**Current source:** Host main `d63cbdf017d5e47cb50b77f0c85fe2198bffdbb3`, Host sandbox prior `7f2c023a5768bdeb936584cb8aa5d339692372c7`; Factory main `dc10bb41384880cb6677648936bf44c3014bd222`. Factory sandbox has changed independently, so do not treat historical sandbox SHA as immutable. No changes to Factory, Host main, Hostinger or plugin.

**Direct branch and PR inspection:** Host holds 5 branches: main/sandbox plus `canonical-host-clean-v1` (PR#5 merged 2026-10-14), `promotion/file-backed-artifact-admission-20261013` (PR#4 merged 2026-10-13), and `repair/mcp-oauth-cleanroom-20261011` (PR#2 OPEN, cannot delete). Factory holds 6 branches: main/backup/sandbox plus `promotion/file-backed-host-rebind-20261013` (PR#28 merged), `promotion/file-backed-host-seal-20261013` (PR#29 merged), and `repair/oauth-host-identity-20261011` (PR#25 OPEN, cannot delete). All 6 extra branch heads **diverge** from current main, so `MERGED_PR != SAFE_BRANCH_DELETE`; 4 merged PR lines require exact unmerged-commit/value checks before Founder-approved cleanup. Both open repair PRs have nontrivial unresolved work. Host GitHub rulesets list empty; Factory ruleset read returned HTTP403 plan restriction. Neither branch governance nor historical merge records constitute technical write protection.

**Host code/layout findings:** Shared MCP/OAuth/backend/acceptance files inspected at exact current Git blobs. Host sandbox server adds only three `/workspace` static routes relative to current Host main; removing that addition yields identical `src/server.ts` bytes. Existing `/mcp-v2` route remains singular. Stale public experience contract described `/app` as workspace though code maps `/app` to showcase. Existing public operator guide included restricted internal stage vocabulary and low-level payload instructions; not necessary in a public guide.

**Actual narrow changes — Host sandbox commit `247a910973ad490c47aa1df7dfb25fa7e6ff759a`:** added `adapters/CONNECTOR_OWNERSHIP.json` declaring separate website and ChatGPT lanes, shared trust file owner with frozen Git blobs, staging owner and no added permanent branches. Corrected `PUBLIC_EXPERIENCE_CONTRACT.md` to reflect `/app` showcase alias and `/workspace` unreleased draft. Replaced public `OPERATOR_GATEWAY.md` with a declassified security outline (historical Git still retains previous details), updated `REPOSITORY_LAYOUT.md`, authored `tests/connector-ownership.test.ts` to check source identities and independent routes. NO operational MCP, auth, Factory or provider changes.

**Verification:** GH commit and file readback only; new TypeScript suite is **NOT_RUN**. C07 independent testing, live end-to-end plugin, package builds, UI screenshot, release/branch cleanup all NOT_RUN. No green claim from static artifact production.

**Four paths:** normal two lanes/stable source owner; failure stale route/profile and unqualified test; adversarial stage leakage/branch deletion with open PR/shared auth drift; recovery preserve PR heads and exact SHA until approved equivalent/replay. Real executable four-path integration NOT_RUN.

**Disposition:** `MANDATORY_FIX / REPOSITORY_BOUNDARY_CONTROL_CANDIDATE / NO_BRANCH_DELETION / NO_LIVE_CHANGE`. Next gate: execute full Host test suite and source disclosure/regression checks at exact sandbox SHA, then separately verify all branch unique commits/consumers and safely dispose of obsolete refs only with Founder authorization.
