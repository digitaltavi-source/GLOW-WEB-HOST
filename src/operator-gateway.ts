import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {timingSafeEqual} from 'node:crypto';

export type OperatorIdentity = {actor_id:string;channel:'PRIVATE_OPERATOR';expires_at:number};
export type OperatorConfig = {port:number;token:string;actorId:string;subjects:string[];expiresAt:number};
export type OperatorExecutor = (subject:string,request:Record<string,unknown>,actor:OperatorIdentity)=>Promise<unknown>;
const MAX_BODY=12*1024*1024;
const ACTIONS=new Set(['register_artifact','register_evidence','revoke_evidence','submit_phase','barrier_review',
 'human_recovery','record_composition_result','submit_system_assurance',
 'record_human_release_decision','record_deployment','record_live_verification']);

export function loadOperatorConfig(env:NodeJS.ProcessEnv=process.env):OperatorConfig|null {
  if(!env.GLOW_OPERATOR_PORT?.trim())return null;
  const port=Number(env.GLOW_OPERATOR_PORT),token=env.GLOW_OPERATOR_BEARER_TOKEN?.trim()??'';
  const actorId=env.GLOW_OPERATOR_ID?.trim()??'',expiresAt=Number(env.GLOW_OPERATOR_TOKEN_EXPIRES_AT);
  let subjects:unknown;try{subjects=JSON.parse(env.GLOW_OPERATOR_ALLOWED_SUBJECTS??'[]');}catch{throw Error('OPERATOR_SUBJECT_POLICY_INVALID');}
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('OPERATOR_PORT_INVALID');
  if(token.length<32||token===env.GLOW_PUBLIC_TEST_BEARER_TOKEN||token===env.GLOW_PROTECTED_SERVICE_TOKEN)throw Error('OPERATOR_TOKEN_SEPARATION_REQUIRED');
  if(!actorId||actorId.length>200)throw Error('OPERATOR_ID_REQUIRED');
  if(!Number.isInteger(expiresAt)||expiresAt<=0)throw Error('OPERATOR_EXPIRY_REQUIRED');
  if(!Array.isArray(subjects)||!subjects.length||subjects.some(x=>typeof x!=='string'||!x.trim()))throw Error('OPERATOR_SUBJECT_POLICY_INVALID');
  return {port,token,actorId,subjects:subjects as string[],expiresAt};
}

export function authorizeOperator(config:OperatorConfig,authorization:string|undefined,origin:string|undefined,now=Date.now()/1000){
  if(origin||now>=config.expiresAt)return false;
  const a=Buffer.from(authorization??''),b=Buffer.from('Bearer '+config.token);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export function createOperatorHandler(config:OperatorConfig,execute:OperatorExecutor){
  let inFlight=0;
  return async(req:IncomingMessage,res:ServerResponse)=>{
    const send=(status:number,body:unknown)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}};
    if(!authorizeOperator(config,req.headers.authorization,req.headers.origin)){send(401,{error:'OPERATOR_AUTHORITY_REQUIRED'});return;}
    if(req.method!=='POST'||req.url!=='/next-factory'){send(404,{error:'OPERATOR_ROUTE_NOT_FOUND'});return;}
    if(req.headers['content-type']?.split(';')[0]!=='application/json'){send(415,{error:'JSON_REQUIRED'});return;}
    if(inFlight>=4){send(429,{error:'OPERATOR_BACKPRESSURE'});return;}
    inFlight++;
    const timer=setTimeout(()=>{send(408,{error:'OPERATOR_BODY_DEADLINE'});req.destroy();},10000);
    try {
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>MAX_BODY){send(413,{error:'OPERATOR_BODY_LIMIT'});req.destroy();return;}chunks.push(b);}
      clearTimeout(timer);
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['subject','request'].includes(k)))throw Error('OPERATOR_INPUT_INVALID');
      if(typeof body.subject!=='string'||!config.subjects.includes(body.subject)){send(403,{error:'OPERATOR_SUBJECT_FORBIDDEN'});return;}
      const request=body.request;
      if(!request||typeof request!=='object'||Array.isArray(request)||request.operation!=='next_factory_control'||!ACTIONS.has(request.input?.action))throw Error('OPERATOR_INPUT_INVALID');
      // Identity is configuration-owned. No identity, role or consent from body is trusted.
      if(!authorizeOperator(config,req.headers.authorization,req.headers.origin)){send(401,{error:'OPERATOR_AUTHORITY_REQUIRED'});return;}
      const result=await execute(body.subject,request,{actor_id:config.actorId,channel:'PRIVATE_OPERATOR',expires_at:config.expiresAt});
      send(200,result);
    }catch{send(400,{error:'OPERATOR_REQUEST_REJECTED'});}
    finally{clearTimeout(timer);inFlight--;}
  };
}

export function startOperatorGateway(config:OperatorConfig|null,execute:OperatorExecutor){
  if(!config)return null;
  const server=createServer((req,res)=>{void createHandler(req,res);});
  const createHandler=createOperatorHandler(config,execute);
  server.requestTimeout=15000;server.headersTimeout=15000;
  server.listen(config.port,'127.0.0.1');
  return server;
}
