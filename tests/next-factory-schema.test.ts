import test from "node:test";
import assert from "node:assert/strict";
import { NextFactoryControlInputSchema } from "../src/next-factory-schema.js";

const base={role:"operator",locale:"vi-VN"} as const;

test("next-factory schema accepts exact H1 submit contract",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:1,phase:"H1",
      payload:{unknowns:[],conflicts:[],mission_truth:{goal:"demo"}}},...base});
  assert.equal(parsed.action,"submit_phase");
});

test("next-factory schema rejects missing mission_id",()=>{
  assert.throws(()=>NextFactoryControlInputSchema.parse({
    action:"status",args:{},...base}));
});

test("next-factory schema rejects wrong state_version type",()=>{
  assert.throws(()=>NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:"1",phase:"H1",
      payload:{unknowns:[],conflicts:[],mission_truth:{}}},...base}));
});

test("next-factory schema rejects unsupported phase",()=>{
  assert.throws(()=>NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:1,phase:"H4",
      payload:{}},...base}));
});
test("next-factory schema accepts exact H2 submit contract",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:2,phase:"H2",
      payload:{blueprint_revision:1,product_decomposition:{kit_a:{owns:["truth"]}},system_blueprint:{}}},...base});
  assert.equal(parsed.action,"submit_phase");
});

test("next-factory schema accepts exact H3 submit contract",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:3,phase:"H3",
      payload:{packet_id:"P1",fork_readiness:{status:"PASS"},kit_orders:{kit_a_ref:"A",kit_b_ref:"B",kit_c_ref:"C"}}},...base});
  assert.equal(parsed.action,"submit_phase");
});