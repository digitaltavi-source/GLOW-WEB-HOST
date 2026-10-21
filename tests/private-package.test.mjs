import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyPrivatePackage} from '../scripts/verify-private-package.mjs';
function setup(){
 const dir=mkdtempSync(join(tmpdir(),'glow-host-'));const root=join(dir,'runtime'),manifest=join(dir,'manifest.json');
 mkdirSync(root);mkdirSync(join(root,'adapter'));const file=join(root,'adapter/entry.mjs'),data=Buffer.from('export const safe=true;');writeFileSync(file,data);
 const value={schema:'GLOW_PRIVATE_PACKAGE_DELIVERY_V1',component_id:'GLOW_WEB_FACTORY_PRIVATE_RUNTIME',component_commit:'a'.repeat(40),files:[{path:'adapter/entry.mjs',size:data.length,sha256:createHash('sha256').update(data).digest('hex')}]};
 const save=()=>writeFileSync(manifest,JSON.stringify(value));save();
 return {dir,root,manifest,file,value,save,close:()=>rmSync(dir,{recursive:true,force:true})};
}
function caseRun(name,mutate,expected){
 test(name,()=>{const f=setup();try{mutate(f);assert.throws(()=>verifyPrivatePackage({packageRoot:f.root,manifestPath:f.manifest}),new RegExp(expected))}finally{f.close()}});
}
test('exact external bytes are verified without public source export',()=>{const f=setup();try{const r=verifyPrivatePackage({packageRoot:f.root,manifestPath:f.manifest});assert.equal(r.files_verified,1);assert.equal(r.qualification,'NOT_ASSESSED')}finally{f.close()}});
caseRun('tampered payload fails digest',f=>writeFileSync(f.file,'tampered'),'FILE_DIGEST_MISMATCH');
caseRun('parent traversal fails',f=>{f.value.files[0].path='../data.json';f.save()},'FILE_PATH_INVALID');
caseRun('symlink fails',f=>{rmSync(f.file);symlinkSync(f.manifest,f.file)},'SYMLINK_FORBIDDEN');
caseRun('credential path fails',f=>{f.value.files[0].path='adapter/token.json';f.save()},'FORBIDDEN_FILE');
caseRun('unbound branch name fails',f=>{f.value.component_commit='sandbox';f.save()},'IDENTITY_INVALID');
caseRun('duplicate entry fails',f=>{f.value.files.push({...f.value.files[0]});f.save()},'DUPLICATE_FILE');
