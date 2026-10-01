import test from "node:test";
import assert from "node:assert/strict";
import { WebRequest } from "../src/contracts.js";

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
