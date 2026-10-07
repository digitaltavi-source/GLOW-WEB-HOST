import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from 'node:fs';
import { NextFactoryControlInputSchema } from "../src/next-factory-schema.js";

const base={role:"operator",locale:"vi-VN"} as const;
const manifest=JSON.parse(readFileSync(new URL('../contracts/next-phase-contract.json',import.meta.url),'utf8'));
function payload(phase:string):Record<string,unknown>{
  const defaults:Record<string,unknown>={string:'fixture',integer:1,object:{},array:[],boolean:false};
  return Object.fromEntries(Object.entries(manifest.phases[phase].required).map(([k,v])=>[k,defaults[v as string]]));
}

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
      payload:{...payload('H2'),blueprint_revision:1,product_decomposition:{kit_a:{owns:["truth"]}},system_blueprint:{}}},...base});
  assert.equal(parsed.action,"submit_phase");
});

test("next-factory schema accepts exact H3 submit contract",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"submit_phase",args:{mission_id:"NM-test",expected_state_version:3,phase:"H3",
      payload:{...payload('H3'),packet_id:"P1",fork_readiness:{status:"PASS"},kit_orders:{kit_a_ref:"A",kit_b_ref:"B",kit_c_ref:"C"}}},...base});
  assert.equal(parsed.action,"submit_phase");
});
test("next-factory schema accepts composition result",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"record_composition_result",args:{mission_id:"NM-test",expected_state_version:10,
      result:{integrated_artifact_sha256:"d".repeat(64),candidate_preview_identity:"preview://1",composition_manifest:{builder:"composer"},evidence_refs:['GE-fixture']}},...base});
  assert.equal(parsed.action,"record_composition_result");
});

test("next-factory schema accepts system assurance",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"submit_system_assurance",args:{mission_id:"NM-test",expected_state_version:11,
      report:{integrated_artifact_sha256:"d".repeat(64),frozen_acceptance_refs:['H2'],g0_g12:{},false_green_probes:{},claim_limit:'DEMO_ONLY_UNQUALIFIED_CAPABILITIES_NOT_PRODUCTION_EVIDENCE',dimensions:{FUNCTIONAL:{status:"PASS",criteria_refs:['functional'],evidence_refs:['GE-fixture'],evidence_type:'REVIEW',evaluator_class:'OPERATOR_REVIEW',observed_result:'fixture'}}}},...base});
  assert.equal(parsed.action,"submit_system_assurance");
});

test("next-factory schema rejects model as human release approver",()=>{
  assert.throws(()=>NextFactoryControlInputSchema.parse({
    action:"record_human_release_decision",args:{mission_id:"NM-test",expected_state_version:12,
      decision:{actor_type:"MODEL",decision:"APPROVE",reason:"no",integrated_artifact_sha256:"d".repeat(64),
        assurance_report_hash:"a".repeat(64),candidate_preview_identity:"preview://1"}},...base}));
});

test("next-factory schema parses decision data without granting approval authority",()=>{
  const parsed=NextFactoryControlInputSchema.parse({
    action:"record_human_release_decision",args:{mission_id:"NM-test",expected_state_version:12,
      decision:{actor_type:"HUMAN",decision:"APPROVE",reason:"approved",integrated_artifact_sha256:"d".repeat(64),
        assurance_report_hash:"a".repeat(64),candidate_preview_identity:"preview://1",approved_scope:["demo"]}},...base});
  assert.equal(parsed.action,"record_human_release_decision");
});

test("next-factory schema accepts deployment and live verification",()=>{
  const dep=NextFactoryControlInputSchema.parse({
    action:"record_deployment",args:{mission_id:"NM-test",expected_state_version:13,
      deployment:{approval_receipt_id:"NHA-1",integrated_artifact_sha256:"d".repeat(64),release_identity:"release:1",environment:"staging",evidence_refs:['GE-fixture']}},...base});
  assert.equal(dep.action,"record_deployment");
  const live=NextFactoryControlInputSchema.parse({
    action:"record_live_verification",args:{mission_id:"NM-test",expected_state_version:14,
      verification:{deployment_receipt_id:"NDEP-1",observed_artifact_sha256:"d".repeat(64),status:"PASS",evidence_refs:["e://live"]}},...base});
  assert.equal(live.action,"record_live_verification");
});

test('phase schema preserves production receipt and rejects unknown root fields',()=>{
  const args={mission_id:'NM-test',expected_state_version:1,phase:'H1',payload:{unknowns:[],conflicts:[],mission_truth:{},authority_receipt:{actor_id:'operator'}}};
  assert.equal(NextFactoryControlInputSchema.safeParse({action:'submit_phase',args,...base}).success,true);
  assert.equal(NextFactoryControlInputSchema.safeParse({action:'submit_phase',args:{...args,payload:{...args.payload,spoofed_authority:true}},...base}).success,false);
});

test('thin H2 packet and inflated assurance claim are rejected',()=>{
  assert.equal(NextFactoryControlInputSchema.safeParse({action:'submit_phase',args:{mission_id:'NM-test',expected_state_version:1,phase:'H2',payload:{blueprint_revision:1,product_decomposition:{},system_blueprint:{}}},...base}).success,false);
  assert.equal(NextFactoryControlInputSchema.safeParse({action:'submit_system_assurance',args:{mission_id:'NM-test',expected_state_version:1,report:{integrated_artifact_sha256:'d'.repeat(64),claim_limit:'FIELD_VERIFIED'}},...base}).success,false);
});
