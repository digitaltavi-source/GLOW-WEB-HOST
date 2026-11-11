# GLOW Web — ChatGPT connection

**Owner:** GLOW-WEB-HOST public transport layer
**Public connection:** `/mcp-v2` (authenticated API/MCP)

The ChatGPT connector securely forwards permitted requests and returns only the data class authorized for that specific request. Signing in does not automatically grant permission to review or approve a project.

- Authentication, session isolation, scope checks and bounded transport belong to this Host adapter.
- The protected service remains responsible for project processing, decisions, specialist work, evidence and approval.
- Public responses show only safe, understandable information; restricted work packages are never a public page, sample payload or log.
- If the protected service is unavailable, the connector reports an accurate limited/unavailable state. It never fabricates progress or completion.

This document intentionally does not reproduce private processing stages, internal identifiers, specialist routing, evaluation criteria or proprietary methods.

**Change boundary:** edits to the ChatGPT connection must not modify the website UI channel. Shared authentication and transport contracts require regression for both channels. Deployment requires an exact reviewed commit and separate authorization.
