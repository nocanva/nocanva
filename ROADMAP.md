# Framewise delivery roadmap

Framewise is the working name for the AI-native branded media generator.

## Phase 1 — Product foundation

### Milestone 1: deterministic studio slice — complete

- Brand-aware workspace with a seeded Blindspot brand.
- Structured content fields with explicit length limits.
- Reusable editorial statement and signal-card templates.
- Live 4:5 and 1:1 previews driven only by brand, template, and content.
- Responsive desktop and mobile workspace.

Exit test: a user can edit structured copy, change a template or format, and see a consistent branded result without a freeform canvas.

### Milestone 2: real rendering — complete

- Extracted template and brand definitions into shared application services.
- Added schema validation for every content payload.
- Added fixed-size HTML/CSS output with deterministic 1080 px canvases.
- Added browser download plus a Playwright automation renderer.
- Added layout checks for overflow, canvas bounds, and font readiness.

Exit test: one command or application call creates a pixel-stable PNG from a template ID and structured content.

## Phase 2 — Durable workspace

### Milestone 3: brands, templates, posts, and immutable renders — complete

- Added a D1/SQLite-compatible schema for Brand, Template, TemplateVersion, Post, and Render.
- Stored PNG assets in R2 and every render as an immutable record with its exact input snapshot.
- Built Brands, Templates, Render History, and shareable Render Detail routes.
- Added persistent downloads, rerendering, iteration links, hashes, and record metadata.

Exit test: refreshing the application preserves data and every render can be reproduced from its stored snapshot.

## Phase 3 — Agent-native workflow

### Milestone 4: MCP surface

- Expose the small `brands`, `templates`, `posts`, and `renders` tool surface.
- Return asset URL, workspace URL, IDs, dimensions, and template version.
- Keep MCP and UI operations behind the same application services.
- Add an end-to-end fixture for “Create a Blindspot post explaining X.”

Exit test: Codex or Claude can select a template, create content, render it, inspect the shared URL, and rerender without UI-only logic.

## Phase 4 — Quality and deployment

### Milestone 5: production hardening

- Docker packaging and production configuration.
- Local font and asset bundling.
- Render queue limits, timeouts, structured logs, and health checks.
- Golden-image regression tests for templates.
- Seed/import flow for a first real Blindspot brand kit.

Exit test: the core workflow is reliable in a clean deployment and template regressions are caught automatically.

## Scope guardrails

Until milestone 5 is complete: no freeform canvas, publishing, scheduling, analytics, marketplace, image generation, video, animation, or complex authentication.
