import {EventEmitter} from 'node:events';
import type {ClientRequest,IncomingMessage} from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAuthorizedFile,isGlobalIpAddress,MAX_AUTHORIZED_FILE_BYTES,type HttpsRequestLike} from '../src/file-input.js';

const file={download_url:'https://files.example.test/object',file_id:'file-1',file_name:'artifact.html',mime_type:'text/html'};
const resp=(body:Uint8Array|string,status=200,headers:Record<string,string>={})=>new Response(body as BodyInit,{status,headers});

test('authorized file NORMAL returns exact bytes and safe metadata',async()=>{
 const out=await fetchAuthorizedFile(file,{fetchImpl:async(_url,init)=>{
  assert.equal(init?.redirect,'error');
  return resp('actual-bytes',200,{'content-length':'12'});
 }});
 assert.equal(out.bytes.toString(),'actual-bytes');assert.equal(out.file_id,'file-1');assert.equal(out.file_name,'artifact.html');
 assert.equal('download_url' in out,false);
});

test('authorized file FAILURE rejects declared and streamed oversize',async()=>{
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>resp('x',200,{'content-length':String(MAX_AUTHORIZED_FILE_BYTES+1)})}),/FILE_TOO_LARGE/);
 const chunk=new Uint8Array(1024*1024);let sent=0;
 const stream=new ReadableStream<Uint8Array>({pull(c){if(sent++<9)c.enqueue(chunk);else c.close();}});
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>new Response(stream,{status:200})}),/FILE_TOO_LARGE/);
});

test('authorized file ADVERSARIAL rejects non-https, credentials, local hostnames, trailing dots, decimal/hex IPv4, and private/non-global IPv4/IPv6 CIDRs',async()=>{
 const blockedUrls=[
  'http://files.example.test/a',
  'https://u:p@files.example.test/a',
  'https://localhost/a',
  'https://localhost./a',
  'https://api.localhost./a',
  'https://printer.local/a',
  'https://metadata.internal/a',
  'https://0.0.0.0/a',
  'https://10.0.0.5/a',
  'https://100.64.0.1/a',
  'https://127.0.0.1/a',
  'https://127.0.0.1./a',
  'https://2130706433/a',
  'https://0x7f000001/a',
  'https://169.254.169.254/latest/meta-data',
  'https://172.16.2.3/a',
  'https://192.0.0.1/a',
  'https://192.0.2.1/a',
  'https://192.168.1.3/a',
  'https://198.18.0.1/a',
  'https://198.51.100.1/a',
  'https://203.0.113.1/a',
  'https://224.0.0.1/a',
  'https://240.0.0.1/a',
  'https://[::]/a',
  'https://[::1]/a',
  'https://[::127.0.0.1]/a',
  'https://[::ffff:127.0.0.1]/a',
  'https://[::ffff:169.254.169.254]/a',
  'https://[64:ff9b::1]/a',
  'https://[64:ff9b:1::1]/a',
  'https://[100::1]/a',
  'https://[2001::1]/a',
  'https://[2001:db8::1]/a',
  'https://[2002:7f00:0001::1]/a',
  'https://[2002:a9fe:a9fe::1]/a',
  'https://[fc00::1]/a',
  'https://[fd12:3456::1]/a',
  'https://[fe80::1]/a',
  'https://[ff02::1]/a'
 ];
 for(const download_url of blockedUrls){
  await assert.rejects(()=>fetchAuthorizedFile({...file,download_url},{fetchImpl:async()=>resp('never')}),/HTTPS_REQUIRED|CREDENTIALS_FORBIDDEN|PRIVATE_HOST_FORBIDDEN/,download_url);
 }
 assert.equal(isGlobalIpAddress('93.184.216.34'),true);
 assert.equal(isGlobalIpAddress('::ffff:93.184.216.34'),true);
 assert.equal(isGlobalIpAddress('2606:2800:220:1:248:1893:25c8:1946'),true);
 assert.equal(isGlobalIpAddress('::ffff:100.64.0.1'),false);
});

test('authorized file blocks every HTTP redirect immediately and has no automatic retry',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://files.example.test/next'}});}}),/FILE_DOWNLOAD_REDIRECT_FORBIDDEN/);
 assert.equal(calls,1);
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>{calls++;return new Response(null,{status:307,headers:{location:'http://127.0.0.1/secret'}});}}),/FILE_DOWNLOAD_REDIRECT_FORBIDDEN/);
 assert.equal(calls,2);
});

test('authorized file DNS-rebinding defense rejects mixed public+private DNS answers and pins HTTPS socket lookup with Node 22/24 opts.all safety',async()=>{
 let socketCalled=false;
 await assert.rejects(
  ()=>fetchAuthorizedFile(file,{
   lookupImpl:async()=>[{address:'93.184.216.34',family:4},{address:'127.0.0.1',family:4}],
   httpsRequestImpl:(()=>{socketCalled=true;throw Error('must-not-connect');}) as unknown as HttpsRequestLike
  }),
  /FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN/
 );
 assert.equal(socketCalled,false);

 let capturedHost='';
 let capturedServername:string|undefined;
 let capturedAgent:unknown=undefined;
 let allLookupOut:unknown=null;
 let singleLookupOut:unknown=null;
 const mockHttpsRequest=((options:Record<string,unknown>,onResponse:(res:IncomingMessage)=>void)=>{
  assert.equal(options.agent,false);
  capturedAgent=options.agent;
  capturedHost=String(options.hostname);
  capturedServername=options.servername as string|undefined;
  const lookup=options.lookup as (h:string,o:unknown,cb:(...a:unknown[])=>void)=>void;
  lookup('files.example.test',{all:true},(err,records)=>{assert.equal(err,null);allLookupOut=records;});
  lookup('files.example.test',{all:false},(err,addr,fam)=>{assert.equal(err,null);singleLookupOut={addr,fam};});
  const reqEmitter=new EventEmitter() as ClientRequest;
  reqEmitter.destroy=(()=>reqEmitter) as ClientRequest['destroy'];
  reqEmitter.end=(()=>{
   const resEmitter=new EventEmitter() as IncomingMessage;
   resEmitter.statusCode=200;
   resEmitter.headers={'content-length':'12'};
   resEmitter.destroy=(()=>resEmitter) as IncomingMessage['destroy'];
   onResponse(resEmitter);
   resEmitter.emit('data',Buffer.from('pinned-bytes'));
   resEmitter.emit('end');
   return reqEmitter;
  }) as ClientRequest['end'];
  return reqEmitter;
 }) as unknown as HttpsRequestLike;

 const pinnedOut=await fetchAuthorizedFile(
  {...file,download_url:'https://files.example.test./object'},
  {
   lookupImpl:async h=>{assert.equal(h,'files.example.test');return [{address:'93.184.216.34',family:4}];},
   httpsRequestImpl:mockHttpsRequest
  }
 );
 assert.equal(pinnedOut.bytes.toString(),'pinned-bytes');
 assert.equal(capturedAgent,false);
 assert.equal(capturedHost,'files.example.test');
 assert.equal(capturedServername,'files.example.test');
 assert.deepEqual(allLookupOut,[{address:'93.184.216.34',family:4}]);
 assert.deepEqual(singleLookupOut,{addr:'93.184.216.34',fam:4});
});

test('authorized file RECOVERY succeeds on later explicit caller retry after prior failure',async()=>{
 let first=0;
 await assert.rejects(()=>fetchAuthorizedFile(file,{fetchImpl:async()=>{first++;throw Error('network');}}),/FILE_DOWNLOAD_FAILED/);assert.equal(first,1);
 const out=await fetchAuthorizedFile(file,{fetchImpl:async()=>resp('recovered')});assert.equal(out.bytes.toString(),'recovered');
});
