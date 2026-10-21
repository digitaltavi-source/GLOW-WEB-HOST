import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
test('workspace served on separate customer web routes while canonical MCP stays unchanged',()=>{
 const server=read('src/server.ts');
 for(const path of ['/workspace','/workspace.css','/workspace.js'])assert.ok(server.includes('app.get("'+path+'"'));
 assert.match(server,/app\.all\("\/mcp-v2",authV2,\(req,res\)=>void node\(req,res,req\.body\)\)/);
 assert.equal((server.match(/app\.all\("\/mcp-v2"/g)||[]).length,1);
 assert.match(server,/server\.registerTool\('glow_register_factory_artifact_file'/);
});
test('workspace is Vietnamese UTF-8, accessible, and does not claim phantom mission submission',()=>{
 const html=read('public/workspace.html'),js=read('public/workspace.js'),css=read('public/workspace.css');
 assert.match(html,/<html lang="vi">/);assert.match(html,/<meta charset="utf-8">/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(html,/Không gian dự án/);assert.match(html,/chưa tự tạo dự án/);
 assert.match(js,/DRAFT_ONLY_NOT_SUBMITTED/);assert.doesNotMatch(js,/fetch\(['"]\/api\/operator\/admission/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/Segoe UI/);
 for(const s of [html,css,js])assert.doesNotMatch(s,/\bH[123]\b|KIT[_ -]?[ABC]|CAP\.WEB\./u);
});
