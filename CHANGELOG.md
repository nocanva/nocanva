# Changelog

## 0.4.0-rc.1 — 2026-08-20

- Added immutable 3–7 slide carousel revisions, review sets, approvals, PNG artifacts, and ZIP export.
- Added immutable PNG/JPEG workspace assets with SHA-256 deduplication and workspace isolation.
- Added constrained per-card and per-slide image fit, focal point, zoom, alt text, and human editing controls.
- Added `nocanva_list_assets` and `nocanva_upload_asset`; the MCP surface now contains 33 tools.
- Deployed the private app to Cloudflare Workers with D1/R2 and connected the Browser Rendering MCP Worker through a service binding.
- Proved the hosted agent upload → draft → review → human approval → immutable render lifecycle.
- Updated Vite and `fast-uri`; the production dependency audit reports no known vulnerabilities.

## 0.3.0 — 2026-08-19

- Added managed workspace-scoped MCP tokens, activation metrics, and private hosted authentication.
- Added exact reviewed-artifact promotion and trusted template-version provenance.
- Added self-hosting, backups, restore tooling, Docker packaging, and authenticated HTTP MCP.
