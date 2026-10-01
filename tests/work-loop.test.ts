import test from "node:test";
import assert from "node:assert/strict";
import { callProtectedService, BackendError } from "../src/backend.js";
import type { HostConfig } from "../src/config.js";
import type { WebRequestType } from "../src/contracts.js";

const config: HostConfig = {
  protectedServiceUrl: "https://protected.example",
  protectedServiceToken: "test-token",
  port: 3000
};

function req(operation: WebRequestType["operation"], request_id: string, input: Record<string, unknown>): WebRequestType {
  return { request_id, operation, role: "client", locale: "vi-VN", input };
}

test("NORMAL: host transports exact RC4 work bindings and capability receipts", async () => {
  const mission="M-test";
  const seen:string[]=[];
  const fakeFetch = async (_url: string|URL|Request, init?: RequestInit) => {
    const body=JSON.parse(String(init?.body ?? "{}")) as WebRequestType;
    seen.push(body.operation);
    const base={request_id:body.request_id,public_evidence:[],errors:[]};
    if(body.operation==="create_web_mission"){
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"PUBLIC_DECLASSIFIED",
        result:{mission_id:mission,stage:"KIT_A",mission_state:"READY_FOR_WORK",state_version:1}}),{status:200});
    }
    if(body.operation==="get_work"){
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"MODEL_SESSION_PRIVATE",
        result:{work_package:{mission_id:mission,stage:"KIT_A",work_kind:"KIT_A_CUSTOMER_TRUTH_H1",
          work_id:"W-1",work_contract_revision:1,state_version:2,expected_handoff_type:"H1_KIT_A_V2_1_RC1"}}}),{status:200});
    }
    if(body.operation==="get_capability_plan"){
      assert.deepEqual(body.input,{mission_id:mission,expected_state_version:2,work_id:"W-1",work_contract_revision:1,triggered_scope:[]});
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"MODEL_SESSION_PRIVATE",
        result:{mission_id:mission,stage:"KIT_A",state_version:2,work_id:"W-1",work_contract_revision:1,
          declared_scope:["S01"],capability_specs:[{capability_id:"S01"}]}}),{status:200});
    }
    if(body.operation==="submit_capability_contributions"){
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"MODEL_SESSION_PRIVATE",
        result:{mission_id:mission,stage:"KIT_A",state_version:2,work_id:"W-1",work_contract_revision:1,
          capability_scope_receipt:{receipt_type:"CAPABILITY_COVERAGE_DECISION_RECEIPT",receipt_id:"x"},
          capability_coverage:{S01:{state:"ACTIVATED_WITH_CONTRIBUTION_EVIDENCE",contribution_evidence:{receipt_id:"y"}}}}}),{status:200});
    }
    if(body.operation==="submit_work"){
      assert.equal(body.input["expected_state_version"],2);
      assert.equal(body.input["work_id"],"W-1");
      assert.equal(body.input["work_contract_revision"],1);
      assert.equal("work_token" in body.input,false);
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"PUBLIC_DECLASSIFIED",
        result:{mission_id:mission,stage:"KIT_A",mission_state:"AWAITING_APPROVAL",state_version:3,approval_required:true}}),{status:200});
    }
    if(body.operation==="approve_stage"){
      assert.deepEqual(body.input,{mission_id:mission,expected_state_version:3,actor_type:"HUMAN",decision:"APPROVE",approval_note:"Approved test H1"});
      return new Response(JSON.stringify({...base,status:"accepted",exposure:"PUBLIC_DECLASSIFIED",
        result:{mission_id:mission,stage:"KIT_B",mission_state:"READY_FOR_WORK",state_version:4}}),{status:200});
    }
    throw new Error(`unexpected op ${body.operation}`);
  };

  await callProtectedService(config,"user-1",req("create_web_mission","r-start",{mission:{goal:"demo"}}),fakeFetch as typeof fetch);
  await callProtectedService(config,"user-1",req("get_work","r-work",{mission_id:mission}),fakeFetch as typeof fetch);
  await callProtectedService(config,"user-1",req("get_capability_plan","r-plan",{mission_id:mission,expected_state_version:2,work_id:"W-1",work_contract_revision:1,triggered_scope:[]}),fakeFetch as typeof fetch);
  await callProtectedService(config,"user-1",req("submit_capability_contributions","r-cap",{mission_id:mission,expected_state_version:2,work_id:"W-1",work_contract_revision:1,triggered_scope:[],material:{S01:{contribution_result:{finding:"x"},claim_limit:"test"}},not_material:{}}),fakeFetch as typeof fetch);
  await callProtectedService(config,"user-1",req("submit_work","r-submit",{mission_id:mission,expected_state_version:2,work_id:"W-1",work_contract_revision:1,result:{work_status:"COMPLETED"}}),fakeFetch as typeof fetch);
  await callProtectedService(config,"user-1",req("approve_stage","r-approve",{mission_id:mission,expected_state_version:3,actor_type:"HUMAN",decision:"APPROVE",approval_note:"Approved test H1"}),fakeFetch as typeof fetch);

  assert.deepEqual(seen,["create_web_mission","get_work","get_capability_plan","submit_capability_contributions","submit_work","approve_stage"]);
});

test("ADVERSARIAL: extra private trace is blocked at host boundary", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id:"r-leak",status:"accepted",exposure:"MODEL_SESSION_PRIVATE",
    result:{work_package:{mission_id:"M-test"}},public_evidence:[],errors:[],internal_trace:"forbidden"
  }),{status:200});
  await assert.rejects(
    () => callProtectedService(config,"user-1",req("get_work","r-leak",{mission_id:"M-test"}),fakeFetch as typeof fetch),
    (e:unknown) => e instanceof BackendError && e.message==="DECLASSIFICATION_SCHEMA_REJECTED"
  );
});

test("FAILURE/RECOVERY: backend 503 is surfaced and later retry may succeed", async () => {
  let calls=0;
  const fakeFetch = async () => {
    calls++;
    if(calls===1) return new Response("down",{status:503});
    return new Response(JSON.stringify({
      request_id:"r-retry",status:"accepted",exposure:"PUBLIC_DECLASSIFIED",
      result:{mission_id:"M-test",stage:"KIT_A",mission_state:"READY_FOR_WORK",state_version:1},public_evidence:[],errors:[]
    }),{status:200});
  };
  await assert.rejects(
    () => callProtectedService(config,"user-1",req("get_status","r-retry",{mission_id:"M-test"}),fakeFetch as typeof fetch),
    /PROTECTED_SERVICE_HTTP_503/
  );
  const recovered=await callProtectedService(config,"user-1",req("get_status","r-retry",{mission_id:"M-test"}),fakeFetch as typeof fetch);
  assert.equal(recovered.status,"accepted");
});
