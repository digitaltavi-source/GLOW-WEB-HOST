import {IncomingMessage,ServerResponse} from 'node:http';
import {Duplex} from 'node:stream';
import type {Socket} from 'node:net';

export type Dispatch=(req:IncomingMessage,res:ServerResponse)=>unknown;
export async function fetchHttpHandler(dispatch:Dispatch,input:Request|string|URL,init?:RequestInit):Promise<Response>{
 const request=input instanceof Request?input:new Request(input,init);
 const url=new URL(request.url),bytes=Buffer.from(await request.arrayBuffer());
 const socket=new Duplex({read(){},write(_chunk,_encoding,done){done();}}) as Socket;
 Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.1'});
 Object.defineProperty(socket,'encrypted',{value:url.protocol==='https:'});
 const req=new IncomingMessage(socket);
 req.method=request.method;req.url=url.pathname+url.search;req.httpVersion='1.1';
 req.headers=Object.fromEntries(request.headers);req.headers.host=url.host;
 if(bytes.length&&!req.headers['content-length'])req.headers['content-length']=String(bytes.length);
 req.rawHeaders=Object.entries(req.headers).flatMap(([k,v])=>[k,String(v)]);
 const res=new ServerResponse(req);res.assignSocket(socket);
 const chunks:Buffer[]=[];
 const write=res.write.bind(res),end=res.end.bind(res);
 res.write=((chunk:unknown,...args:unknown[])=>{
  if(chunk!=null)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk),typeof args[0]==='string'?args[0] as BufferEncoding:'utf8'));
  return (write as Function)(chunk,...args);
 }) as typeof res.write;
 res.end=((chunk?:unknown,...args:unknown[])=>{
  if(chunk!=null&&typeof chunk!=='function')chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk),typeof args[0]==='string'?args[0] as BufferEncoding:'utf8'));
  return (end as Function)(chunk,...args);
 }) as typeof res.end;
 return new Promise<Response>((resolve,reject)=>{
  const deadline=setTimeout(()=>{socket.destroy();reject(Error('INPROCESS_HTTP_DEADLINE'));},8000);
  res.once('finish',()=>{
   clearTimeout(deadline);
   const headers=new Headers();
   for(const [name,value] of Object.entries(res.getHeaders()))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):String(value));
   const body=[204,304].includes(res.statusCode)?null:Buffer.concat(chunks);
   resolve(new Response(body,{status:res.statusCode,headers}));socket.destroy();
  });
  res.once('error',error=>{clearTimeout(deadline);reject(error);});
  req.once('error',error=>{clearTimeout(deadline);reject(error);});
  try{Promise.resolve(dispatch(req,res)).catch(error=>{clearTimeout(deadline);reject(error);});req.push(bytes.length?bytes:null);if(bytes.length)req.push(null);}
  catch(error){clearTimeout(deadline);reject(error);}
 });
}
export async function hostFixture(env:Record<string,string>,run:(host:{app:Dispatch;handler:{close:()=>Promise<void>}})=>Promise<void>){
 const previous={...process.env};
 for(const key of ['GLOW_OPERATOR_PORT','GLOW_COMBINED_RUNTIME_MODULE'])delete process.env[key];
 Object.assign(process.env,{GLOW_GATEWAY_PROFILE:'DEVELOPMENT',GLOW_ALLOWED_HOSTS:'127.0.0.1,localhost',GLOW_PUBLIC_MCP_URL:'http://127.0.0.1:3100/mcp-v2',GLOW_PROTECTED_SERVICE_URL:'https://backend.fixture',GLOW_PROTECTED_SERVICE_TOKEN:'fixture-token-only',...env});
 try{const mod=await import('../src/server.js?fixture='+Math.random());await run({app:mod.app as unknown as Dispatch,handler:mod.handler});}
 finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
}
