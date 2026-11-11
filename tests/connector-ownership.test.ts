import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const get=(p:string)=>readFileSync(resolve(process.cwd(),p));
const source=(p:string)=>get(p).toString('utf8');
const lock=JSON.parse(source('adapters/CONNECTOR_OWNERSHIP.json'));

test('one source owner for each public connection; private implementation stays out',()=>{
 assert.equal(lock.schema,'GLOW_WEB_HOST_CONNECTOR_OWNERSHIP_V1');
 assert.equal(lock.channels.chatgpt_mcp.public_endpoint,'/mcp-v2');
 assert.ok(lock.channels.direct_website.public_endpoints.includes('/workspace'));
 assert.equal(lock.boundary.web_direct_submission,'NOT_IMPLEMENTED');
 assert.equal(lock.branch_policy.release,'main');assert.equal(lock.branch_policy.engineering,'sandbox');
 const grouped=Object.values(lock.channels).flatMap((v:any)=>[...(v.docs||[]),...(v.files||[]),...(v.ui||[])]);
 assert.equal(new Set(grouped).size,grouped.length,'a file must not have two competing owners');
 for(const p of grouped)assert.ok(existsSync(resolve(process.cwd(),p)),p);
});

test('shared gateway code retains frozen main Git blobs until separately reviewed',()=>{
 for(const [p,expected] of Object.entries(lock.shared_source_frozen_git_blobs) as [string,string][]){
  const bytes=get(p);
  const actual=createHash('sha1').update(Buffer.from('blob '+bytes.byteLength+'\0')).update(bytes).digest('hex');
  assert.equal(actual,expected,'shared module changed without two-lane requalification: '+p);
 }
});

test('MCP auth and file registration survive unrelated web workspace additions',()=>{
 const server=source('src/server.ts');
 assert.equal((server.match(/app\.all\(\"\/mcp-v2\",authV2,\(req,res\)=>void node\(req,res,req\.body\)\);/g)||[]).length,1);
 assert.match(server,/server\.registerTool\('glow_register_factory_artifact_file'/);
 for(const route of ['/workspace','/workspace.css','/workspace.js'])
   assert.ok(server.includes('app.get(\"'+route+'\"'),'missing isolated web route '+route);
});

test('published public contract describes current routing without invented readiness',()=>{
 const c=source('PUBLIC_EXPERIENCE_CONTRACT.md');
 assert.match(c,/\/app\x60 — backward-compatible alias/);
 assert.match(c,/\/workspace\x60 — candidate customer workspace/);
 assert.match(c,/workspace builds a customer-authorized copyable draft/);
 const op=source('OPERATOR_GATEWAY.md');
 assert.doesNotMatch(op,/\bH[123]\b|KIT[_ -]?[ABC]|CAP\.WEB\./u);
});

test('workflow checks release+engineering branches only',()=>{
 const wf=source('.github/workflows/validate-public-host.yml');
 assert.match(wf,/branches:\s*\[main, sandbox\]/);
});
