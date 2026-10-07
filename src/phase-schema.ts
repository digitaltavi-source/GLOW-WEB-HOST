import {readFileSync} from 'node:fs';
import * as z from 'zod/v4';

type Phase = {required:Record<string,string>;optional:Record<string,string>};
const manifest=JSON.parse(readFileSync(new URL('../contracts/next-phase-contract.json',import.meta.url),'utf8')) as {contract:string;phases:Record<string,Phase>};
if(manifest.contract!=='GWF_HOST_PHASE_CONTRACT_V2')throw Error('PHASE_CONTRACT_VERSION_INVALID');
function field(kind:string):z.ZodType {
  switch(kind){
    case 'array':return z.array(z.unknown());
    case 'object':return z.record(z.string(),z.unknown());
    case 'integer':return z.number().int().min(1);
    case 'boolean':return z.boolean();
    case 'string':return z.string().min(1);
    default:throw Error('PHASE_CONTRACT_TYPE_INVALID');
  }
}
function phase(name:string){
  const spec=manifest.phases[name];if(!spec)throw Error('PHASE_CONTRACT_MISSING');
  const shape:Record<string,z.ZodType>={};
  for(const [key,kind] of Object.entries(spec.required))shape[key]=field(kind);
  for(const [key,kind] of Object.entries(spec.optional))shape[key]=field(kind).optional();
  return z.object(shape).strict();
}
export const H1PhaseSchema=phase('H1');
export const H2PhaseSchema=phase('H2');
export const H3PhaseSchema=phase('H3');
