import {IncomingMessage,ServerResponse} from 'node:http';
import {Duplex} from 'node:stream';
import type {Socket} from 'node:net';

export type Dispatch=(req:IncomingMessage,res:ServerResponse)=>unknown;
export async function fetchHttpHandler(dispatch:Dispatch,input:Request|string|URL,init?:RequestInit):Promise<Response>{
 const request=input instanceof Request?input:new Request(input,init);
 const url=new URL(request.url),bytes=Buffer.from(await request.arrayBuffer());
 const wire:Buffer[]=[];
 const socket=new Duplex({read(){},write(chunk,_encoding,done){wire.push(Buffer.from(chunk));done();}}) as Socket;
 Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.1'});
 Object.defineProperty(socket,'encrypted',{value:url.protocol==='https:'});
 const req=new IncomingMessage(socket);
 req.method=request.method;req.url=url.pathname+url.search;req.httpVersion='1.1';req.httpVersionMajor=1;req.httpVersionMinor=1;
 req.complete=true; // Entire request is supplied below; native HTTP parser would mark this before EOF.
 req.headers=Object.fromEntries(request.headers);req.headers.host=url.host;
 if(bytes.length&&!req.headers['content-length'])req.headers['content-length']=String(bytes.length);
 req.rawHeaders=Object.entries(req.headers).flatMap(([k,v])=>[k,String(v)]);
 const res=new ServerResponse(req);res.assignSocket(socket);
 return new Promise<Response>((resolve,reject)=>{
  const deadline=setTimeout(()=>{socket.destroy();reject(Error('INPROCESS_HTTP_DEADLINE:'+request.method+' '+url.pathname+' socketDestroyed='+socket.destroyed+' responseEnded='+res.writableEnded));},8000);
  res.once('finish',()=>{
   clearTimeout(deadline);
   try{
    const raw=Buffer.concat(wire),boundary=raw.indexOf('\r\n\r\n');
    if(boundary<0)throw Error('HTTP_RESPONSE_HEADERS_REQUIRED');
    const headers=new Headers();
    for(const line of raw.subarray(0,boundary).toString('utf8').split('\r\n').slice(1)){
     const colon=line.indexOf(':');if(colon>0)headers.append(line.slice(0,colon),line.slice(colon+1).trim());
    }
    let body=raw.subarray(boundary+4);
    if(headers.get('transfer-encoding')?.includes('chunked')){
     const chunks:Buffer[]=[];let position=0;
     while(position<body.length){
      const end=body.indexOf('\r\n',position);if(end<0)throw Error('HTTP_CHUNK_SIZE_REQUIRED');
      const size=parseInt(body.subarray(position,end).toString('ascii').split(';')[0]!,16);
      if(!Number.isFinite(size))throw Error('HTTP_CHUNK_SIZE_INVALID');
      position=end+2;if(size===0)break;
      if(position+size+2>body.length)throw Error('HTTP_CHUNK_DATA_INCOMPLETE');
      chunks.push(body.subarray(position,position+size));position+=size+2;
     }
     body=Buffer.concat(chunks);headers.delete('transfer-encoding');
    }
    headers.delete('content-length');
    resolve(new Response([204,304].includes(res.statusCode)?null:new Uint8Array(body),{status:res.statusCode,headers}));
   }catch(error){reject(error);}
   socket.destroy();
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
 Object.assign(process.env,{NODE_ENV:'test',GLOW_HOST_INPROCESS_TEST:'1',GLOW_GATEWAY_PROFILE:'DEVELOPMENT',GLOW_ALLOWED_HOSTS:'127.0.0.1,localhost',GLOW_PUBLIC_MCP_URL:'http://127.0.0.1:3100/mcp-v2',GLOW_PROTECTED_SERVICE_URL:'https://backend.fixture',GLOW_PROTECTED_SERVICE_TOKEN:'fixture-token-only',...env});
 try{const mod=await import('../src/server.js?fixture='+Math.random());await run({app:mod.app as unknown as Dispatch,handler:mod.handler});}
 finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
}
