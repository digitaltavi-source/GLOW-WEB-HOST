export const MAX_AUTHORIZED_FILE_BYTES=8*1024*1024;
const MAX_REDIRECTS=3;

export type AuthorizedFileInput={
 download_url:string;
 file_id:string;
 mime_type?:string;
 file_name?:string;
};

type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

function validateUrl(raw:string){
 let url:URL;
 try{url=new URL(raw);}catch{throw Error('FILE_DOWNLOAD_URL_INVALID');}
 if(url.protocol!=='https:')throw Error('FILE_DOWNLOAD_HTTPS_REQUIRED');
 if(url.username||url.password)throw Error('FILE_DOWNLOAD_CREDENTIALS_FORBIDDEN');
 if(url.port&&url.port!=='443')throw Error('FILE_DOWNLOAD_PORT_FORBIDDEN');
 const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(host==='localhost'||host.endsWith('.localhost')||host==='::1'||host==='0.0.0.0'||host.startsWith('127.'))throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
 if(/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
 const m=host.match(/^172\.(\d+)\./);if(m&&Number(m[1])>=16&&Number(m[1])<=31)throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
 return url;
}

async function boundedBody(response:Response){
 const length=response.headers.get('content-length');
 if(length!==null){const n=Number(length);if(!Number.isFinite(n)||n<0)throw Error('FILE_DOWNLOAD_LENGTH_INVALID');if(n>MAX_AUTHORIZED_FILE_BYTES)throw Error('FILE_TOO_LARGE');}
 if(!response.body)throw Error('FILE_DOWNLOAD_BODY_MISSING');
 const reader=response.body.getReader();
 const chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   if(value){total+=value.byteLength;if(total>MAX_AUTHORIZED_FILE_BYTES){await reader.cancel();throw Error('FILE_TOO_LARGE');}chunks.push(value);}
  }
 }finally{reader.releaseLock();}
 const out=Buffer.allocUnsafe(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
 return out;
}

export async function fetchAuthorizedFile(file:AuthorizedFileInput,opts:{fetchImpl?:FetchLike;timeoutMs?:number}={}){
 if(!file||typeof file.file_id!=='string'||!file.file_id.trim()||typeof file.download_url!=='string'||!file.download_url.trim())throw Error('FILE_INPUT_INVALID');
 const fetchImpl=opts.fetchImpl??fetch;
 let current=validateUrl(file.download_url);
 for(let redirects=0;redirects<=MAX_REDIRECTS;redirects++){
  let response:Response;
  try{response=await fetchImpl(current,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(opts.timeoutMs??15000),headers:{accept:'*/*'}});}catch(error){if(error instanceof Error&&['FILE_TOO_LARGE'].includes(error.message))throw error;throw Error('FILE_DOWNLOAD_FAILED');}
  if([301,302,303,307,308].includes(response.status)){
   if(redirects===MAX_REDIRECTS)throw Error('FILE_DOWNLOAD_REDIRECT_LIMIT');
   const location=response.headers.get('location');if(!location)throw Error('FILE_DOWNLOAD_REDIRECT_INVALID');
   current=validateUrl(new URL(location,current).toString());continue;
  }
  if(!response.ok)throw Error('FILE_DOWNLOAD_HTTP_ERROR');
  const bytes=await boundedBody(response);
  return {bytes,file_id:file.file_id,mime_type:file.mime_type??null,file_name:file.file_name??null};
 }
 throw Error('FILE_DOWNLOAD_REDIRECT_LIMIT');
}
