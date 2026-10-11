import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';

export type Dispatch=(req:IncomingMessage,res:ServerResponse)=>unknown;
export async function fetchHttpHandler(dispatch:Dispatch,input:Request|string|URL,init?:RequestInit):Promise<Response>{
 const request=input instanceof Request?input:new Request(input,init);
 const url=new URL(request.url),bytes=Buffer.from(await request.arrayBuffer());
 // Use the native HTTP parser and stream lifecycle, including response backpressure.
 const listener=createServer((req,res)=>{Promise.resolve(dispatch(req,res)).catch(()=>{res.statusCode=500;res.end('FIXTURE_DISPATCH_FAILED');});});
 await new Promise<void>((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 try{
  const address=listener.address();if(!address||typeof address==='string')throw Error('FIXTURE_ADDRESS_REQUIRED');
  const response=await fetch('http://127.0.0.1:'+address.port+url.pathname+url.search,{method:request.method,headers:Object.fromEntries(request.headers),body:['GET','HEAD'].includes(request.method)?undefined:bytes,signal:AbortSignal.timeout(8000)});
  const body=await response.arrayBuffer();
  return new Response([204,304].includes(response.status)?null:body,{status:response.status,headers:response.headers});
 }finally{listener.closeAllConnections();await new Promise<void>(resolve=>listener.close(()=>resolve()));}
}
export async function hostFixture(env:Record<string,string>,run:(host:{app:Dispatch;handler:{close:()=>Promise<void>}})=>Promise<void>){
 const previous={...process.env};
 for(const key of ['GLOW_OPERATOR_PORT','GLOW_COMBINED_RUNTIME_MODULE'])delete process.env[key];
 Object.assign(process.env,{NODE_ENV:'test',GLOW_HOST_INPROCESS_TEST:'1',GLOW_GATEWAY_PROFILE:'DEVELOPMENT',GLOW_ALLOWED_HOSTS:'127.0.0.1,localhost',GLOW_PUBLIC_MCP_URL:'http://127.0.0.1:3100/mcp-v2',GLOW_PROTECTED_SERVICE_URL:'https://backend.fixture',GLOW_PROTECTED_SERVICE_TOKEN:'fixture-token-only',...env});
 try{const mod=await import('../src/server.js?fixture='+Math.random());await run({app:mod.app as unknown as Dispatch,handler:mod.handler});}
 finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
}
