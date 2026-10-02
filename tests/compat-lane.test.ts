import test from "node:test";
import assert from "node:assert/strict";
import {NextFactoryControlInputSchema} from "../src/next-factory-schema.js";
test("compose_readiness accepts stale-client compat fields",()=>{
  const x=NextFactoryControlInputSchema.parse({
    action:"compose_readiness",
    args:{mission_id:"NM-test",expected_state_version:5,compat_action:"record_composition_result",result:{x:1}},
    role:"operator",locale:"vi-VN"
  });
  assert.equal(x.action,"compose_readiness");
  assert.equal((x.args as any).compat_action,"record_composition_result");
});
