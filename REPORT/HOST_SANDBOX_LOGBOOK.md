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
