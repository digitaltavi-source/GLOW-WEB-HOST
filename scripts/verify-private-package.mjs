import {readFileSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
const within=(root,p)=>{const r=relative(root,p);return r!==''&&r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r)};
function fail(code){throw Error('PRIVATE_PACKAGE_'+code)}
export function verifyPrivatePackage({packageRoot,manifestPath}){
 if(!packageRoot||!manifestPath)fail('LOCATION_REQUIRED');
 const root=resolve(packageRoot),manifest=resolve(manifestPath);
 if(!existsSync(root)||!lstatSync(root).isDirectory()||lstatSync(root).isSymbolicLink())fail('ROOT_INVALID');
 if(within(process.cwd(),root))fail('ROOT_INSIDE_PUBLIC_REPOSITORY');
 if(!existsSync(manifest)||lstatSync(manifest).isSymbolicLink())fail('MANIFEST_INVALID');
 if(within(process.cwd(),manifest))fail('MANIFEST_INSIDE_PUBLIC_REPOSITORY');
 let m;try{m=JSON.parse(readFileSync(manifest,'utf8'))}catch{fail('MANIFEST_JSON_INVALID')}
 if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).sort().join(',')!=='component_commit,component_id,files,schema')fail('MANIFEST_SHAPE_INVALID');
 if(m.schema!=='GLOW_PRIVATE_PACKAGE_DELIVERY_V1'||m.component_id!=='GLOW_WEB_FACTORY_PRIVATE_RUNTIME'||!(/^[a-f0-9]{40}$/.test(m.component_commit)))fail('IDENTITY_INVALID');
 if(!Array.isArray(m.files)||!m.files.length||m.files.length>300)fail('FILE_COUNT_INVALID');
 const seen=new Set();let total=0;
 for(const item of m.files){
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).sort().join(',')!=='path,sha256,size')fail('FILE_ENTRY_INVALID');
  const p=item.path;
  if(typeof p!=='string'||!p||p.includes('\\')||p.includes('//')||p.startsWith('/')||p.split('/').some(s=>!s||s==='.'||s==='..')||!/^[-\w/]+\.(?:py|json|mjs|js)$/.test(p))fail('FILE_PATH_INVALID');
  if(seen.has(p))fail('DUPLICATE_FILE');seen.add(p);
  if(/(^|\/)(?:\.env|\.git|\.runtime|node_modules|\.glow-node-state)(?:\/|$)|(?:secret|token|credential|private-key)/i.test(p))fail('FORBIDDEN_FILE');
  if(!(/^[a-f0-9]{64}$/.test(item.sha256))||!Number.isSafeInteger(item.size)||item.size<0||item.size>8388608)fail('FILE_METADATA_INVALID');
  const candidate=resolve(root,p);
  if(!within(root,candidate)||!existsSync(candidate))fail('FILE_NOT_FOUND');
  let current=root;
  for(const segment of p.split('/')){current=resolve(current,segment);if(lstatSync(current).isSymbolicLink())fail('SYMLINK_FORBIDDEN')}
  if(!lstatSync(candidate).isFile()||!within(realpathSync(root),realpathSync(candidate)))fail('FILE_TYPE_INVALID');
  const bytes=readFileSync(candidate);total+=bytes.length;
  if(bytes.length!==item.size||digest(bytes)!==item.sha256)fail('FILE_DIGEST_MISMATCH');
 }
 if(total>67108864)fail('TOTAL_BYTES_EXCEEDED');
 return {status:'VERIFIED_PACKAGE_BYTES_ONLY',component_id:m.component_id,component_commit:m.component_commit,files_verified:seen.size,total_bytes:total,qualification:'NOT_ASSESSED'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(verifyPrivatePackage({packageRoot:process.argv[2],manifestPath:process.argv[3]})))}
 catch(e){console.error(e.message);process.exitCode=1}
}
