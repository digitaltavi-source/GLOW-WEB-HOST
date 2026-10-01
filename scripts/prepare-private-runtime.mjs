import { mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const enabled=(process.env.GLOW_PROTECTED_INPROCESS ?? "").trim()==="1";
if(!enabled){
  console.log("GLOW private runtime fetch skipped: GLOW_PROTECTED_INPROCESS!=1");
  process.exit(0);
}

const owner=(process.env.GLOW_PRIVATE_REPO_OWNER ?? "digitaltavi-source").trim();
const repo=(process.env.GLOW_PRIVATE_REPO_NAME ?? "GLOW-WEB-FACTORY").trim();
const sha=(process.env.GLOW_PRIVATE_FACTORY_SHA ?? "").trim();
const token=(process.env.GLOW_PRIVATE_REPO_TOKEN ?? "").trim();
const localSource=(process.env.GLOW_PRIVATE_RUNTIME_SOURCE_DIR ?? "").trim();
const target=resolve(process.env.GLOW_PRIVATE_RUNTIME_ROOT ?? ".glow-private-runtime");

if(!sha) throw new Error("GLOW_PRIVATE_FACTORY_SHA_REQUIRED");

const exactFiles=[
  "host-integration/node-private-host/bridge.mjs",
  "host-integration/node-private-host/python_bridge.py",
  "factory/control-plane/FACTORY_CONTROL_RUNTIME.py",
  "factory/control-plane/NEXT_FACTORY_CONTROL_RUNTIME.py",
  "factory/capability-system/control-plane/CONTROL_PLANE_RUNTIME.py",
  "factory/integration/NEXT_FACTORY_CAPABILITY_BROKER.py",
  "factory/capability-system/registry/CAPABILITY_REGISTRY.json",
  "factory/capability-system/registry/SHARED_ENGINEERING_CAPABILITY_REGISTRY.json",
  "factory/capability-system/registry/SEMANTIC_CAPABILITY_REGISTRY.json",
  "factory/capability-system/registry/DEMO_CAPABILITY_PROFILE.json",
  "factory/capability-system/factory-integration/PROCESS_STAGE_CAPABILITY_BINDINGS.json",
  "factory/capability-dependencies/engineering/GLOW_ENGINEERING_RND_SKILL_V1.0.0.md"
];
const contractPrefix="factory/capability-system/capabilities/";
const contractSuffix="/CONTRACT.json";

function sha256(buf){return createHash("sha256").update(buf).digest("hex")}
async function ensureParent(path){await mkdir(dirname(path),{recursive:true})}

await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});

const manifest=[];

if(localSource){
  const src=resolve(localSource);
  const { readdir }=await import("node:fs/promises");
  async function walk(dir){
    const out=[];
    for(const ent of await readdir(dir,{withFileTypes:true})){
      const p=join(dir,ent.name);
      if(ent.isDirectory()) out.push(...await walk(p));
      else out.push(p);
    }
    return out;
  }
  const all=await walk(src);
  const rels=all.map(p=>relative(src,p).replaceAll("\\","/"));
  const selected=rels.filter(p=>exactFiles.includes(p)||(p.startsWith(contractPrefix)&&p.endsWith(contractSuffix)));
  for(const rel of selected){
    const dst=join(target,...rel.split("/"));
    await ensureParent(dst);
    await copyFile(join(src,...rel.split("/")),dst);
    const { readFile }=await import("node:fs/promises");
    const buf=await readFile(dst);
    manifest.push({path:rel,sha256:sha256(buf),bytes:buf.length});
  }
}else{
  if(!token) throw new Error("GLOW_PRIVATE_REPO_TOKEN_REQUIRED");
  const headers={
    "accept":"application/vnd.github+json",
    "authorization":`Bearer ${token}`,
    "x-github-api-version":"2022-11-28",
    "user-agent":"glow-web-host-build"
  };
  async function gh(url){
    const r=await fetch(url,{headers});
    if(!r.ok) throw new Error(`GITHUB_PRIVATE_FETCH_${r.status}`);
    return r.json();
  }
  const commit=await gh(`https://api.github.com/repos/${owner}/${repo}/git/commits/${sha}`);
  if(commit.sha!==sha) throw new Error("PRIVATE_COMMIT_IDENTITY_MISMATCH");
  const tree=await gh(`https://api.github.com/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
  if(tree.truncated) throw new Error("PRIVATE_TREE_TRUNCATED");
  const blobs=new Map(tree.tree.filter(x=>x.type==="blob").map(x=>[x.path,x]));
  const selected=[...exactFiles,...[...blobs.keys()].filter(p=>p.startsWith(contractPrefix)&&p.endsWith(contractSuffix))];
  for(const rel of [...new Set(selected)].sort()){
    const meta=blobs.get(rel);
    if(!meta?.url) throw new Error(`PRIVATE_RUNTIME_FILE_MISSING:${rel}`);
    const blob=await gh(meta.url);
    if(blob.encoding!=="base64") throw new Error(`PRIVATE_RUNTIME_ENCODING_INVALID:${rel}`);
    const buf=Buffer.from(blob.content.replace(/\n/g,""),"base64");
    if(meta.sha && blob.sha!==meta.sha) throw new Error(`PRIVATE_RUNTIME_BLOB_IDENTITY_MISMATCH:${rel}`);
    const dst=join(target,...rel.split("/"));
    await ensureParent(dst);
    await writeFile(dst,buf);
    manifest.push({path:rel,sha256:sha256(buf),bytes:buf.length});
  }
}

for(const required of exactFiles){
  if(!manifest.some(x=>x.path===required)) throw new Error(`PRIVATE_RUNTIME_REQUIRED_FILE_MISSING:${required}`);
}
const contracts=manifest.filter(x=>x.path.startsWith(contractPrefix)&&x.path.endsWith(contractSuffix));
if(contracts.length!==12) throw new Error(`PRIVATE_RUNTIME_CONTRACT_COUNT_INVALID:${contracts.length}`);

manifest.sort((a,b)=>a.path.localeCompare(b.path));
const binding={
  schema:"GLOW_WEB_PRIVATE_RUNTIME_BINDING_V1",
  source_repository:`${owner}/${repo}`,
  source_commit:sha,
  file_count:manifest.length,
  capability_contract_count:contracts.length,
  files:manifest
};
await writeFile(join(target,"PRIVATE_RUNTIME_BINDING.json"),JSON.stringify(binding,null,2)+"\n");
console.log(`GLOW private runtime prepared from ${owner}/${repo}@${sha}; files=${manifest.length}`);
