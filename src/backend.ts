import { resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { WebResponse, type WebRequestType, type WebResponseType } from "./contracts.js";
import type { HostConfig } from "./config.js";
import { resolveProtectedStateDir } from "./state-dir.js";

export class BackendError extends Error {}

type CombinedRuntime = {
  execute(subject: string, raw: WebRequestType): Promise<{ status_code: number; body: unknown }>;
  executeOperator?(subject: string, raw: WebRequestType, actor: {actor_id:string;channel:string;expires_at:number}): Promise<{status_code:number;body:unknown}>;
};

let combinedRuntimePromise: Promise<CombinedRuntime> | null = null;
let combinedRuntimeIdentity: string | null = null;

function combinedModuleUrl(specifier: string): string {
  if (specifier.startsWith("file:")) return specifier;
  return pathToFileURL(isAbsolute(specifier) ? specifier : resolve(process.cwd(),specifier)).href;
}

async function getCombinedRuntime(config: HostConfig): Promise<CombinedRuntime> {
  const specifier=config.combinedRuntimeModule?.trim();
  if(!specifier) throw new BackendError("COMBINED_RUNTIME_NOT_CONFIGURED");

  if(!combinedRuntimePromise || combinedRuntimeIdentity!==specifier){
    combinedRuntimeIdentity=specifier;
    combinedRuntimePromise=import(combinedModuleUrl(specifier)).then(async mod=>{
      const create=mod.createGlowCombinedRuntime;
      if(typeof create!=="function") throw new BackendError("COMBINED_RUNTIME_FACTORY_MISSING");
      const state=resolveProtectedStateDir();
      const runtime=await create({
        repoRoot:process.cwd(),
        stateDir:state.path,
        stateMode:state.mode
      });
      if(!runtime || typeof runtime.execute!=="function") {
        throw new BackendError("COMBINED_RUNTIME_EXECUTOR_INVALID");
      }
      return runtime as CombinedRuntime;
    });
  }
  return combinedRuntimePromise;
}

export async function callProtectedService(
  config:HostConfig,
  subject:string,
  request:WebRequestType,
  fetchImpl:typeof fetch=fetch
):Promise<WebResponseType>{
  let raw:unknown;

  if(config.combinedRuntimeModule){
    const result=await (await getCombinedRuntime(config)).execute(subject,request);
    if(result.status_code!==200) throw new BackendError("PROTECTED_INPROCESS_STATUS_"+result.status_code);
    raw=result.body;
  }else{
    if(!config.protectedServiceUrl || !config.protectedServiceToken){
      throw new BackendError("PROTECTED_SERVICE_NOT_CONFIGURED");
    }
    const response=await fetchImpl(config.protectedServiceUrl+"/v1/web-missions",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer "+config.protectedServiceToken,
        "x-glow-subject":subject
      },
      body:JSON.stringify(request)
    });
    if(!response.ok) throw new BackendError("PROTECTED_SERVICE_HTTP_"+response.status);
    raw=await response.json();
  }

  const parsed=WebResponse.safeParse(raw);
  if(!parsed.success) throw new BackendError("DECLASSIFICATION_SCHEMA_REJECTED");
  return parsed.data;
}

export async function callProtectedOperator(config:HostConfig,subject:string,request:WebRequestType,actor:{actor_id:string;channel:string;expires_at:number}):Promise<WebResponseType>{
  if(!config.combinedRuntimeModule)throw new BackendError('REMOTE_OPERATOR_CHANNEL_NOT_SUPPORTED');
  const runtime=await getCombinedRuntime(config);
  if(!runtime.executeOperator)throw new BackendError('OPERATOR_RUNTIME_NOT_BOUND');
  const result=await runtime.executeOperator(subject,request,actor);
  if(result.status_code!==200)throw new BackendError('OPERATOR_BACKEND_STATUS_'+result.status_code);
  const parsed=WebResponse.safeParse(result.body);
  if(!parsed.success)throw new BackendError('OPERATOR_RESPONSE_SCHEMA_REJECTED');
  return parsed.data;
}

export async function checkProtectedReadiness(
  config:HostConfig,
  fetchImpl:typeof fetch=fetch
):Promise<{ok:boolean;protected_service_authenticated:boolean;code:string}>{
  const probe:WebRequestType={
    request_id:"r3-readiness-probe-v1",
    operation:"next_factory_control",
    role:"unspecified",
    locale:"vi-VN",
    input:{action:"status",args:{mission_id:"NM-000000000000"}}
  };
  try{
    const out=await callProtectedService(config,"r3-readiness-probe",probe,fetchImpl);
    const code=out.errors?.[0]?.code??"";
    if(out.status==="failed" && code==="MISSION_NOT_FOUND"){
      return {
        ok:true,
        protected_service_authenticated:true,
        code:config.combinedRuntimeModule ? "PROTECTED_FACTORY_INPROCESS_REACHABLE" : "PROTECTED_FACTORY_REACHABLE"
      };
    }
    return {ok:false,protected_service_authenticated:true,code:"PROTECTED_FACTORY_UNEXPECTED_RESPONSE"};
  }catch(error){
    return {
      ok:false,
      protected_service_authenticated:false,
      code:error instanceof Error?error.message:"PROTECTED_FACTORY_PROBE_FAILED"
    };
  }
}
