# GLOW Web Host

Status: `CANDIDATE / DEV_FALSIFICATION_PASS / NOT HOSTINGER VERIFIED`

Public experience, operational workspace and AI gateway for the protected GLOW Web Factory.

```text
USER
  -> GLOW Web public website/workspace
  -> ChatGPT / Claude / Gemini / compatible AI host when reasoning is needed
  -> OAuth + MCP (/mcp-v2)
  -> protected Factory boundary
  -> private GLOW-WEB-FACTORY
```

Public surfaces:
- showcase and mission workspace;
- declassified status/result surfaces;
- AI handoff capsule;
- MCP/OAuth transport;
- health/readiness;
- public contracts, tests and deployment metadata.

Protected Factory internals, KIT/Capability implementation, private evidence, credentials and private runtime state are not public source.

`PUBLIC HOST != PROTECTED FACTORY`
`WEB WORKSPACE != FACTORY AUTHORITY`
`MODEL_SESSION_PRIVATE != PUBLIC_DECLASSIFIED`

Canonical deployment target: `digitaltavi-source/GLOW-WEB-HOST@main`.

## One-domain combined deployment

Production topology for Hostinger:

```text
PUBLIC GLOW-WEB-HOST
  + exact PRIVATE GLOW-WEB-FACTORY runtime fetched at build-time
  -> one Node process
  -> one public listener/domain
  -> protected Factory imported in-process
```

The public repository never commits private Factory bytes. Build-time private staging is written under `.glow-private-runtime/`, which is gitignored. The private source is pinned by `GLOW_PRIVATE_FACTORY_SHA` and fetched with a read-only `GLOW_PRIVATE_REPO_TOKEN` stored only in Hostinger Environment Variables.

`ONE DOMAIN != ONE AUTHORITY BOUNDARY`
`PRIVATE RUNTIME PRESENT AT DEPLOYMENT != PRIVATE SOURCE PUBLICLY EXPOSED`
