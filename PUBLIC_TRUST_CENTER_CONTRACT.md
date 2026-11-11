# GLOW Web Public Trust Center Contract

Status: `CANDIDATE / PUBLIC_DECLASSIFICATION_BOUNDARY`

## Purpose

The Trust Center exists so a recruiter, partner, enterprise customer, evaluator or technical reviewer can judge the professionalism and maturity of GLOW Web **without receiving protected Factory implementation**.

## Public-safe trust surfaces

The Host may publish declassified summaries of:
- architecture boundaries and component roles;
- Process flow at a non-proprietary level;
- semantic capability coverage;
- security and authority boundaries;
- quality/assurance model;
- release and provenance discipline;
- runtime identity and bounded readiness status;
- selected case studies and outcome evidence approved for public release;
- accessibility, performance and responsive-quality evidence where public-safe;
- human approval/release responsibilities;
- collaboration and integration model.

## Runtime authorization diagnostics

OAuth authorization for GLOW Web is **tool-scoped**. A read-only public/profile invocation may carry only the scopes needed for that tool, while an acceptance tool may trigger a separate step-up authorization for `web.accept`.

Therefore:

`PROFILE_REQUEST_TOKEN_SCOPE != GLOBAL_CONNECTION_AUTHORITY`

`MISSING web.accept ON A READ-ONLY PROFILE CALL != ACCEPTANCE_TOOL_UNAVAILABLE`

The authoritative field check for the acceptance lane is a **non-mutating** invocation of the acceptance-preparation tool. If that call passes OAuth/RBAC enforcement and reaches a Factory semantic validation error, the scoped authorization seam is operating for that invocation. This does not approve or advance a mission.

Public status text must not convert a per-request token diagnostic into a connection-wide or production-readiness claim.

## Forbidden disclosures

The Trust Center must not publish:
- private Factory source;
- proprietary KIT or Capability implementation;
- confidential prompts or hidden decision traces;
- internal scoring/evaluator logic that is protected IP;
- private evidence or customer-confidential artifacts;
- credentials, tokens, private file paths or runtime state;
- internal qualification material not explicitly declassified.

## Authority laws

`PUBLIC TRUST STATEMENT != FACTORY AUTHORITY`

`DECLASSIFIED EVIDENCE != PRIVATE EVIDENCE STORE`

`CAPABILITY SUMMARY != CAPABILITY IMPLEMENTATION`

`QUALITY CLAIM != QUALIFICATION UNLESS THE REQUIRED EVIDENCE CLASS EXISTS`

`READ-ONLY AUTH DIAGNOSTIC != PHASE ACCEPTANCE`

## Recommended public sections

- About GLOW Web
- How the Factory works
- Capability Coverage
- Quality & Assurance
- Security & Privacy Boundary
- Release & Provenance
- Runtime / Service Status
- Selected Case Studies
- Collaboration / Partnership
- Responsible Human Authority

Every public claim must carry the weakest truthful evidence level. Missing evidence remains missing; it must not be replaced with marketing language.

## Relationship to the private Factory

GLOW-WEB-HOST owns presentation, declassification and transport only. GLOW-WEB-FACTORY remains the semantic and operational owner of Process, Capability, state, evidence and qualification.
