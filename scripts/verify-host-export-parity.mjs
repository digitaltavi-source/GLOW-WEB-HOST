import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IGNORED_PREFIXES = ["REPORT/", ".git/", "node_modules/", "dist/"];
const SELF_MANIFEST = "HOST_EXPORT_PARITY_MANIFEST.json";

export function gitBlobSha1(bytes) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.byteLength}\0`, "ascii"))
    .update(bytes)
    .digest("hex");
}

export function collectCanonicalHostBlobs(rootDir) {
  const out = {};
  function walk(current) {
    for (const entry of readdirSync(current).sort()) {
      const full = path.join(current, entry);
      const rel = path.relative(rootDir, full).split(path.sep).join("/");
      if (rel === SELF_MANIFEST || IGNORED_PREFIXES.some(p => rel === p.slice(0, -1) || rel.startsWith(p))) {
        continue;
      }
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        out[rel] = gitBlobSha1(readFileSync(full));
      }
    }
  }
  walk(rootDir);
  return out;
}

export function verifyHostExportParity(rootDir) {
  const manifestPath = path.join(rootDir, SELF_MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error("HOST_EXPORT_PARITY_MANIFEST_MISSING");
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== "GLOW_WEB_HOST_EXPORT_PARITY_V1" || typeof manifest.files !== "object" || !manifest.files) {
    throw new Error("HOST_EXPORT_PARITY_MANIFEST_INVALID");
  }
  const actual = collectCanonicalHostBlobs(rootDir);
  const expected = manifest.files;
  const missing = Object.keys(expected).filter(k => !(k in actual));
  const unexpected = Object.keys(actual).filter(k => !(k in expected));
  const mismatched = Object.keys(expected)
    .filter(k => k in actual && actual[k] !== expected[k])
    .map(k => ({ path: k, expected: expected[k], actual: actual[k] }));
  if (missing.length || unexpected.length || mismatched.length) {
    throw new Error(
      "HOST_EXPORT_PARITY_DRIFT:" + JSON.stringify({ missing, unexpected, mismatched })
    );
  }
  return {
    status: "PASS",
    verified_file_count: Object.keys(expected).length
  };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath)) {
  const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(scriptPath), "..");
  const res = verifyHostExportParity(targetRoot);
  console.log(`HOST_EXPORT_PARITY=${res.status}`);
  console.log(`HOST_EXPORT_VERIFIED_FILES=${res.verified_file_count}`);
}
