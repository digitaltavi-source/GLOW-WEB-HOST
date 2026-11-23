import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeSync,
} from "node:fs";
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
      const st = lstatSync(full);
      if (st.isSymbolicLink() || (!st.isDirectory() && !st.isFile())) {
        throw new Error(`PARITY_SYMLINK_FORBIDDEN:${rel}`);
      }
      if (st.isDirectory()) {
        walk(full);
      } else {
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
  const manifestSt = lstatSync(manifestPath);
  if (manifestSt.isSymbolicLink() || !manifestSt.isFile()) {
    throw new Error(`PARITY_SYMLINK_FORBIDDEN:${SELF_MANIFEST}`);
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

export function writeHostExportParityManifest(rootDir) {
  const files = collectCanonicalHostBlobs(rootDir);
  const sortedFiles = {};
  for (const key of Object.keys(files).sort()) {
    sortedFiles[key] = files[key];
  }
  const payload = {
    schema: "GLOW_WEB_HOST_EXPORT_PARITY_V1",
    canonical_repository: "digitaltavi-source/GLOW-WEB-HOST",
    factory_mirror_path: "host-export/GLOW-WEB-HOST",
    file_count: Object.keys(sortedFiles).length,
    files: sortedFiles,
  };
  const serialized = `${JSON.stringify(payload, null, 2).replace(/\r\n/g, "\n")}\n`;
  const manifestPath = path.join(rootDir, SELF_MANIFEST);
  const tmpPath = path.join(rootDir, `${SELF_MANIFEST}.partial.${process.pid}.${Date.now()}`);
  const fd = openSync(tmpPath, "wx", 0o644);
  try {
    writeSync(fd, Buffer.from(serialized, "utf8"));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmpPath, manifestPath);
  return {
    status: "PASS",
    verified_file_count: payload.file_count,
  };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath)) {
  const rawArgs = process.argv.slice(2);
  const writeMode = rawArgs.includes("--write");
  const positional = rawArgs.filter((arg) => arg !== "--write");
  const targetRoot = positional[0] ? path.resolve(positional[0]) : path.resolve(path.dirname(scriptPath), "..");
  if (writeMode) {
    const written = writeHostExportParityManifest(targetRoot);
    console.log(`HOST_EXPORT_PARITY_WRITE=${written.status}`);
    console.log(`HOST_EXPORT_VERIFIED_FILES=${written.verified_file_count}`);
  } else {
    const res = verifyHostExportParity(targetRoot);
    console.log(`HOST_EXPORT_PARITY=${res.status}`);
    console.log(`HOST_EXPORT_VERIFIED_FILES=${res.verified_file_count}`);
  }
}
