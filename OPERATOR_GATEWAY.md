# Private operator gateway candidate

The public MCP client can prepare work and inspect a mission. It cannot grant
approval, register trusted proof, certify assurance or record deployment/live
verification. H1/H2 acceptance uses the separate operator channel. HUMAN in a
request and an OAuth email scope are not approval authority.

The operator gateway is disabled by default. Set the documented variables in
`.env.example` using a secret distinct from public/test/backend credentials, a
named operator, a finite expiry and an explicit allowlist of mission-owner
subjects. It listens only on `127.0.0.1`, never on the public listener. Access via
a controlled local session or SSH tunnel; do not expose it through a reverse
proxy. The bearer secret is an operator credential, not a ChatGPT tool argument.
Rotation requires a controlled process restart; expiry is checked at HTTP
admission and again by the queued runtime. An expired/missing operator channel
blocks DEMO/PRODUCTION readiness. Remote protected-service operator mode is not
implemented and fails closed.

POST `/next-factory` with `Authorization: Bearer <operator-secret>` and JSON:

```json
{
  "subject": "authenticated-mission-owner-subject",
  "request": {
    "request_id": "unique-stable-operation-id",
    "operation": "next_factory_control",
    "role": "operator",
    "locale": "vi-VN",
    "input": {"action": "submit_phase", "args": {"mission_id": "NM-existing", "expected_state_version": 1, "phase": "H1", "payload": {}}}
  }
}
```

The example payload is intentionally incomplete: supply the actual approved
packet matching `contracts/next-phase-contract.json`. No customer facts may be
invented. Read the fresh mission version before a mutation. The runtime issues
an AUTHORIZED_OPERATOR receipt tied to the actual packet and configured actor.
It does not pretend that the service account is the human customer.

Private-only actions: `register_artifact`, `register_evidence`, `revoke_evidence`.
Artifacts use `mission_id` plus `data_base64` (maximum decoded size 8 MiB).
Registration computes the SHA-256 from bytes. Proof registration uses
`mission_id`, `kind`, `artifact_sha256`, `evidence_sha256`, `bindings`. Its output
is a `GE-...` evidence reference, which is checked against the mission, actual
bytes and exact binding every time it is consumed.

For CAPABILITY/COMPOSITION, pass the full `reviewed_result` and omit the result
hash binding to have the runtime compute it with its canonical serializer. This
avoids cross-language numeric/Unicode serialization drift. A supplied conflicting
hash is rejected. Receipt references are excluded from the composition result
digest to avoid a circular binding.

Kinds/bindings:

| Kind | Required consumption binding |
|---|---|
| CAPABILITY | work_item_id, capability_id, owner_epoch, canonical result_sha256 |
| COMPOSITION | blueprint_revision, exact current component_artifacts list, canonical composition_result_sha256 (exclude evidence_refs) |
| ASSURANCE dimension | integrated_build_id, dimension, criteria_refs, status |
| ASSURANCE gate | integrated_build_id, gate, status |
| ASSURANCE false-green probe | integrated_build_id, probe, expected=REJECT, observed=REJECT |
| DEPLOYMENT | approval_receipt_id, release_identity, environment |
| LIVE | deployment_receipt_id, release_identity, environment |
| REPAIR | defect_id and, for barrier repair, work_item_id |

For capability contributions, include `artifact_sha256` in contribution_result.
Package manifests must reference admitted artifact bytes. Composition results,
deployments and false-green probes now require evidence_refs. Release decisions
on this channel use `actor_type=AUTHORIZED_OPERATOR`; actor identity is supplied
by the server, never the JSON request.

Operator evidence is accountable review, not independent qualification or an
automatic quality guarantee. This candidate admits only development/demo
claims. Blanket NOT_MATERIAL assurance waivers and FIELD_VERIFIED/5-star claims
are rejected. Assurance is rechecked before approval, deployment and live
recording. Revoking proof consumed by the current assurance reopens its mission
as SYSTEM_ASSURANCE_FAILED. Failure/unknown-outcome must be reconciled by reading
canonical state, not by blind resubmission with a new request ID.

Preserve admitted-artifacts together with SQLite in backups. Missing/corrupted
bytes or proof blocks consumption. Do not edit SQLite or overwrite immutable
artifact bytes to force a pass. The raw state engine used by internal fixture
tests is a trusted persistence library; externally supplied input must only
enter through the guarded gateway.

Before deployment: clean Node 22 TypeScript build and full host tests; exact
combined release matrix; provider/OAuth scope configuration; process lifecycle
and operator-port support on the actual host; backup/restore of the new proof
store. No field qualification is claimed by this source document.
