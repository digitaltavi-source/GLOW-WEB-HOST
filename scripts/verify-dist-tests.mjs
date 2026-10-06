import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceDir=fileURLToPath(new URL("../tests/",import.meta.url));
const distDir=fileURLToPath(new URL("../dist/tests/",import.meta.url));
if(!existsSync(distDir)) throw new Error("PUBLIC_DIST_TEST_DIR_MISSING");
const expected=readdirSync(sourceDir).filter(name=>name.endsWith(".test.ts")).map(name=>name.replace(/\.ts$/,".js")).sort();
const actual=readdirSync(distDir).filter(name=>name.endsWith(".test.js")).sort();
const missing=expected.filter(name=>!actual.includes(name));
const extra=actual.filter(name=>!expected.includes(name));
if(missing.length||extra.length){throw new Error("PUBLIC_DIST_TEST_PARITY_MISMATCH:"+JSON.stringify({missing,extra}));}
console.log("PUBLIC_DIST_TEST_PARITY=PASS");
console.log("PUBLIC_SOURCE_TEST_FILE_COUNT="+expected.length);