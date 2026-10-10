import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {fetchHttpHandler} from './http-fixture.js';
import {authorizeOperator,createOperatorHandler,loadOperatorConfig,type OperatorConfig} from '../src/operator-gateway.js';

const config:OperatorConfig={port:3101,token:'o'.repeat(40),actorId:'release-operator',subjects:['mission-owner'],expiresAt:Math.floor(Date.now()/1000)+1000};
const envelope={request_id:'operator-request',operation:'next_factory_control',role:'operator',locale:'vi-VN',input:{action:'record_human_release_decision',args:{mission_id:'NM-test'}}};
async function request(body:unknown,authorization='Bearer '+config.token,origin?:string){
 let captured:unknown;let status=0;let result='';
 const handler=createOperatorHandler(config,async(subject,raw,actor)=>{captured={subject,raw,actor};return {ok:true};});
 const req=Readable.from([Buffer.from(JSON.stringify(body))]) as unknown as IncomingMessage;
 Object.assign(req,{method:'POST',url:'/next-factory',headers:{authorization,'content-type':'application/json',...(origin?{origin}:{})}});
 const response={destroyed:false,writableEnded:false,writeHead(n:number){status=n;},end(s:string){result=s;response.writableEnded=true;}};
 const res=response as unknown as ServerResponse;
 await handler(req,res);return {status,result,captured};
}
test('operator identity is minted by server config, never client fields',async()=>{
 const r=await request({subject:'mission-owner',request:envelope});assert.equal(r.status,200);
 assert.deepEqual((r.captured as {actor:unknown}).actor,{actor_id:'release-operator',channel:'PRIVATE_OPERATOR',expires_at:config.expiresAt});
 const spoof=await request({subject:'mission-owner',request:envelope,actor_id:'HUMAN'});assert.equal(spoof.status,400);assert.equal(spoof.captured,undefined);
});
test('public test token, origin and expired token cannot authorize',()=>{
 assert.equal(authorizeOperator(config,'Bearer public-test-token',undefined),false);
 assert.equal(authorizeOperator(config,'Bearer '+config.token,'https://untrusted.test'),false);
 assert.equal(authorizeOperator(config,'Bearer '+config.token,undefined,config.expiresAt),false);
});
test('unauthorized caller and other mission subject never reach executor',async()=>{
 const missing=await request({subject:'mission-owner',request:envelope},'');assert.equal(missing.status,401);assert.equal(missing.captured,undefined);
 const other=await request({subject:'victim',request:envelope});assert.equal(other.status,403);assert.equal(other.captured,undefined);
});
test('operator gateway is disabled by default and rejects unbounded policy',()=>{
 assert.equal(loadOperatorConfig({}),null);
 assert.throws(()=>loadOperatorConfig({GLOW_OPERATOR_PORT:'3101'}),/TOKEN_SEPARATION/);
 assert.throws(()=>loadOperatorConfig({GLOW_OPERATOR_PORT:'3101',GLOW_OPERATOR_BEARER_TOKEN:config.token,GLOW_PUBLIC_TEST_BEARER_TOKEN:config.token}),/TOKEN_SEPARATION/);
 assert.throws(()=>loadOperatorConfig({GLOW_OPERATOR_PORT:'3101',GLOW_OPERATOR_BEARER_TOKEN:config.token,GLOW_OPERATOR_ID:'operator',GLOW_OPERATOR_ALLOWED_SUBJECTS:'["subject"]'}),/EXPIRY/);
});
test('artifact registration uses only the private control channel',async()=>{
 const r=await request({subject:'mission-owner',request:{...envelope,input:{action:'register_artifact',args:{mission_id:'NM-test',data_base64:'YQ=='}}}});
 assert.equal(r.status,200);
 const unsupported=await request({subject:'mission-owner',request:{...envelope,input:{action:'unsupported'}}});assert.equal(unsupported.status,400);
});

test('native HTTP operator handler rejects model bearer and forwards only authorized operator',async()=>{
 const handler=createOperatorHandler(config,async(_subject,_request,actor)=>({actor:actor.actor_id}));
 const call=(authorization:string)=>fetchHttpHandler(handler,'http://127.0.0.1:3101/next-factory',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({subject:'mission-owner',request:envelope})});
 assert.equal((await call('Bearer model-token')).status,401);
 const accepted=await call('Bearer '+config.token);assert.equal(accepted.status,200);assert.deepEqual(await accepted.json(),{actor:'release-operator'});
});
