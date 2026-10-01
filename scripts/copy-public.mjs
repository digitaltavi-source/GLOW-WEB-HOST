import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const src=resolve("public");
const dst=resolve("dist/public");
await mkdir(dst,{recursive:true});
await cp(src,dst,{recursive:true,force:true});
