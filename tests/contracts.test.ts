import test from "node:test";
import assert from "node:assert/strict";
import { WebRequest, WebResponse } from "../src/contracts.js";

const operations = [
  "create_web_mission",
  "get_work",
  "get_capability_plan",
  "submit_capability_contributions",
  "submit_work",
  "inspect_blocked_stage",
  "recover_blocked_stage",
  "approve_stage",
  "get_status",
  "get_delivery",
  "get_next_factory_capability_handshake",
  "next_factory_control"
] as const;

for (const operation of operations) {
  test(`public contract admits bounded operation: ${operation}`, () => {
    const parsed = WebRequest.parse({
      request_id: `test-${operation}`,
      operation,
      role: "client",
      locale: "vi-VN",
      input: { mission_id: "M-test" }
    });
    assert.equal(parsed.operation, operation);
  });
}

test("public contract rejects unknown Factory-control mutation operation", () => {
  assert.throws(() => WebRequest.parse({
    request_id: "bad-operation",
    operation: "mutate_factory_canon",
    role: "client",
    locale: "vi-VN",
    input: {}
  }));
});

test("recovery guidance remains advisory and separate from public evidence", () => {
  const recovery = {
    type: "GDEE_RECOVERY_GUIDANCE_V1",
    category: "AUTHORITY_REQUIRED",
    recovery_route: "ESCALATE_TO_OPERATOR",
    mutation_authorized: false,
    automatic_retry_allowed: false,
    human_approval_required: true,
    remediation_steps: ["Request review from the owning operator before further mutation."]
  };
  const response = {
    request_id: "synthetic",
    status: "failed",
    exposure: "PUBLIC_DECLASSIFIED",
    result: null,
    public_evidence: [],
    errors: [{ code: "OPERATOR_AUTHORITY_REQUIRED", message: "OPERATOR_AUTHORITY_REQUIRED", retryable: false, recovery }]
  };
  assert.deepEqual(WebResponse.parse(response).public_evidence, []);
  assert.throws(() => WebResponse.parse({
    ...response,
    errors: [{ ...response.errors[0], recovery: { ...recovery, mutation_authorized: true } }]
  }));
});
