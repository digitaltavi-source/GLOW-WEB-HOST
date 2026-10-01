import test from "node:test";
import assert from "node:assert/strict";
import { callProtectedService, BackendError } from "../src/backend.js";
import type { HostConfig } from "../src/config.js";

const config: HostConfig = {
  protectedServiceUrl: "https://protected.example",
  protectedServiceToken: "test-token",
  port: 3000
};

const request = {
  request_id: "r1",
  operation: "create_web_mission" as const,
  role: "client" as const,
  locale: "vi-VN",
  input: { mission: { goal: "demo" } }
};

test("accepts only public response schema", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "completed",
    exposure: "PUBLIC_DECLASSIFIED",
    result: { title: "Public result" },
    public_evidence: [],
    errors: []
  }), { status: 200, headers: { "content-type": "application/json" } });

  const out = await callProtectedService(config, "user-1", request, fakeFetch as typeof fetch);
  assert.equal(out.status, "completed");
});

test("accepts current RC4 model-session private work-package shape", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "accepted",
    exposure: "MODEL_SESSION_PRIVATE",
    result: {
      work_package: {
        mission_id: "M-test",
        stage: "KIT_A",
        work_kind: "KIT_A_CUSTOMER_TRUTH_H1",
        work_id: "W-test",
        work_contract_revision: 1,
        state_version: 2,
        expected_handoff_type: "H1_KIT_A_V2_1_RC1"
      }
    },
    public_evidence: [],
    errors: []
  }), { status: 200, headers: { "content-type": "application/json" } });

  const out = await callProtectedService(config, "user-1", request, fakeFetch as typeof fetch);
  assert.equal(out.exposure, "MODEL_SESSION_PRIVATE");
  assert.equal((out.result?.["work_package"] as Record<string,unknown>)?.["work_id"],"W-test");
});

test("rejects extra protected fields at declassification boundary", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({
    request_id: "r1",
    status: "completed",
    exposure: "PUBLIC_DECLASSIFIED",
    result: { title: "Public result" },
    public_evidence: [],
    errors: [],
    internal_trace: "must-not-cross"
  }), { status: 200, headers: { "content-type": "application/json" } });

  await assert.rejects(
    () => callProtectedService(config, "user-1", request, fakeFetch as typeof fetch),
    (error: unknown) => error instanceof BackendError && error.message === "DECLASSIFICATION_SCHEMA_REJECTED"
  );
});

test("fails closed on protected service HTTP error", async () => {
  const fakeFetch = async () => new Response("no", { status: 503 });
  await assert.rejects(
    () => callProtectedService(config, "user-1", request, fakeFetch as typeof fetch),
    /PROTECTED_SERVICE_HTTP_503/
  );
});
