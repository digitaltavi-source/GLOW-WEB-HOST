# GLOW Web Host

Canonical purpose: one remote MCP/OAuth host adapter for the protected GLOW Web Factory.

## Active boundary

- Canonical MCP endpoint: `/mcp-v2`
- Authentication: OAuth in DEMO/PRODUCTION
- Factory state/authority remains in the protected Factory backend.
- This repository does not own Process semantics, Capability authority, Canon, qualification, or release authority.
- ChatGPT app registration is external to this repository; the app scans this MCP endpoint for tools.

## Required critical tools

The MCP surface must include, among the governed Factory tools:

- `glow_get_factory_status`
- `glow_get_factory_work`
- `glow_evidence_admission_preflight`
- `glow_register_factory_artifact`
- `glow_register_factory_artifact_file`
- `glow_register_factory_evidence`
- `glow_prepare_phase_acceptance`
- `glow_next_factory_accept_phase`

`glow_register_factory_artifact_file` must retain `_meta["openai/fileParams"] = ["file"]`.

## Build and verification

```bash
npm ci
npm test
```

CI is required before promotion. A source-level guard also checks that the critical file-backed tool and OpenAI file parameter metadata remain present.

## Release rule

A branch name is not release evidence. Deploy only an exact reviewed commit SHA. Keep one canonical ChatGPT app connection to this endpoint; experimental personal/cleanroom wrappers are not part of the supported integration path.
