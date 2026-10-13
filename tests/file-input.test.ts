import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAuthorizedFile,MAX_AUTHORIZED_FILE_BYTES} from '../src/file-input.js';

const file={download_url:'https://files.example.test/object',file_id:'file-1',file_name:'artifact.html',mime_type:'text/html'};
const resp=(body:Uint8Array|string,status=200,headers:Record<string,string>={})=>new Response(body as BodyInit,{status,headers});

test('authorized file NORMAL returns exact bytes and safe metadata',async()=>{
 const out=await fetchAuthorizedFile(file,{fetchImpl:async()=>resp('actual-bytes',200,{'content-length':'12'})});
 assert.equal(out.bytes.toString(),'actual-bytes');assert.equal(out.file_id,'file-1');assert.equal(out.file_name,'artifact.html');
 assert.equal('download_url' in out,false);
});

test('authorized file FAILURE rejects declared and streamed oversize',async()=>{
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>resp('x',200,{'content-length':String(MAX_AUTHORIZED_FILE_BYTES+1)})}),/FILE_TOO_LARGE/);
 const chunk=new Uint8Array(1024*1024);let sent=0;
 const stream=new ReadableStream<Uint8Array>({pull(c){if(sent++<9)c.enqueue(chunk);else c.close();}});
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>new Response(stream,{status:200})}),/FILE_TOO_LARGE/);
});

test('authorized file ADVERSARIAL rejects non-https, credentials and private literals',async()=>{
 for(const download_url of ['http://files.example.test/a','https://u:p@files.example.test/a','https://127.0.0.1/a','https://10.0.0.5/a','https://192.168.1.3/a','https://172.16.2.3/a']){
  await assert.rejects(()=>fetchAuthorizedFile({...file,download_url},{fetchImpl:async()=>resp('never')}));
 }
});

test('authorized file validates every redirect and has no automatic retry',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/secret'}});}}),/HTTPS_REQUIRED|PRIVATE_HOST/);
 assert.equal(calls,1);
});

test('authorized file RECOVERY succeeds on later explicit caller retry after prior failure',async()=>{
 let first=0;
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>{first++;throw Error('network');}}),/FILE_DOWNLOAD_FAILED/);assert.equal(first,1);
 const out=await fetchAuthorizedFile(file,{fetchImpl:async()=>resp('recovered')});assert.equal(out.bytes.toString(),'recovered');
});
