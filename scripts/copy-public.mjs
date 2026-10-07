import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const src=resolve("public");
const dst=resolve("dist/public");
await mkdir(dst,{recursive:true});
await cp(src,dst,{recursive:true,force:true});
await mkdir(resolve('dist/contracts'),{recursive:true});
await cp(resolve('contracts/next-phase-contract.json'),resolve('dist/contracts/next-phase-contract.json'));
