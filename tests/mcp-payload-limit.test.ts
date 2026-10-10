import test from "node:test";
import assert from "node:assert/strict";
import {fetchHttpHandler,type Dispatch} from "./http-fixture.js";
import { createGlowMcpExpressApp, DEFAULT_MCP_JSON_LIMIT } from "../src/mcp-app.js";

async function withServer(run:(base:string,call:typeof fetch)=>Promise<void>){
 const app=createGlowMcpExpressApp(["127.0.0.1","localhost"]);
 app.post("/echo-size",(req,res)=>res.json({size:typeof req.body?.pad==="string"?req.body.pad.length:0}));
 const call=((input:RequestInfo|URL,init?:RequestInit)=>fetchHttpHandler(app as unknown as Dispatch,input instanceof Request?input:String(input),init)) as typeof fetch;
 await run("http://127.0.0.1:3100",call);
}

test("MCP JSON body limit is explicitly bounded at 512kb", () => {
  assert.equal(DEFAULT_MCP_JSON_LIMIT,"512kb");
});

test("RECOVERY: H2-sized MCP payload above Express default 100kb is accepted", async () => {
  await withServer(async (base,call)=>{
    const response=await call(base+"/echo-size",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({pad:"x".repeat(140_000)})
    });
    assert.equal(response.status,200);
    const body=await response.json() as {size:number};
    assert.equal(body.size,140_000);
  });
});

test("ADVERSARIAL: MCP payload beyond bounded 512kb ceiling is rejected", async () => {
  await withServer(async (base,call)=>{
    const response=await call(base+"/echo-size",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({pad:"x".repeat(600_000)})
    });
    assert.equal(response.status,413);
  });
});
