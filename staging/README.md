# Host-owned private runtime staging verifier

This is an **isolated preflight** for an externally provisioned private package. It does not clone, publish, assemble, import or execute protected Factory code.

Run `node scripts/verify-private-package.mjs <external-package-dir> <external-manifest.json>` from the Host checkout. The package directory and manifest must be **outside the public repository**. No private bytes or file lists are printed. Check the exact private source SHA by a separate trusted custody check: the manifest's claimed 40-character commit is **metadata and not cryptographic provenance**. This verifier checks only SHA-256 content integrity of listed files, safe paths and symlink boundaries.

Both GPT/MCP and web adapters use the same versioned protected service contract; neither may silently implement specialist decisions or take release authority. Do not add private runtime files to Git or `dist/`.

Tests for the verifier: `node --test tests/private-package.test.mjs`. It intentionally remains separate from the TypeScript build chain until full regression and integration reconciliation are completed. Promotion to main/deployment requires Founder authorization and independent evidence.
