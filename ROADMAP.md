# NoCanva product and delivery roadmap

## Current priority — Blindspot creative engine

Platform expansion is frozen. The immediate release gate is the Blindspot-first workflow documented in [`docs/BLINDSPOT_CREATIVE_ENGINE.md`](docs/BLINDSPOT_CREATIVE_ENGINE.md): six semantic composition families, a constrained Puck editing adapter over canonical NoCanva data, shared React artwork for editor and renderer, recent-post variety guidance, a fixed eight-question multimodal review loop, and a 20-task outcome benchmark.

Success means at least 70% of benchmark outputs are publishable without design edits and median human effort is below two minutes. Scheduling, collaboration, video, marketplaces, additional auth/storage work, and new brand expansion stay frozen until that gate passes. The historical milestones below remain useful infrastructure context, not the active product backlog.

NoCanva is the open-source creative workspace for AI agents. An agent turns repository evidence, release notes, documentation, or a campaign brief into brand-ready media; NoCanva supplies deterministic rendering, reviewable drafts, reproducible assets, and a shared workspace.

Users can self-host the complete core product or use NoCanva Cloud for managed infrastructure, authenticated remote access, teams, storage, and operational reliability. NoCanva does not require a built-in LLM. Codex, Claude Code, or another multimodal agent supplies copy, creative reasoning, and visual critique.

Positioning:

> Give your agent an idea, release note, or campaign brief. It creates brand-ready media through MCP. Open the result in NoCanva to review, edit, iterate, and export.

> Ideas in. Brand-ready media out.

## Product principles

1. **Agent-native:** every important operation is available through MCP and the application API.
2. **Deterministic:** identical brand, template version, content, and format produce identical pixels.
3. **Brand-locked:** agents choose intent and content; approved brand and template rules control visual output.
4. **Inspectible:** drafts, revisions, checks, approvals, renders, and hashes have stable workspace URLs.
5. **Provider-neutral:** the open-source core has no mandatory LLM, storage vendor, or hosted-service dependency.
6. **Self-hostable:** local development and production self-hosting remain first-class workflows.
7. **Cloud-optional:** NoCanva Cloud adds convenience and collaboration without weakening the open-source core.

## What is complete

### Milestone 1: deterministic studio slice

- Brand-aware structured editor.
- Reusable statement, signal, and brand-specific renderer families.
- Live Instagram portrait and square previews.
- Shared HTML/CSS artwork component.

### Milestone 2: real rendering

- Exact-size 1080 px PNG rendering.
- Schema, canvas-bound, overflow, font-readiness, and deterministic-hash checks.
- Playwright-based agent renderer.
- Actual rendered template previews in the template library.

### Milestone 3: durable workspace

- Brand, Template, TemplateVersion, Post, and Render records.
- Immutable assets with input snapshots and SHA-256 hashes.
- Brand, template, render-history, and render-detail views.
- Local D1/SQLite-compatible storage and R2-compatible asset storage.

### Milestone 4: local agent workflow

- Local stdio MCP server.
- Brand, template, post, review, render, inspect, and rerender tools.
- Exact PNGs returned for multimodal agent review.
- End-to-end Codex and Claude Code workflow fixtures.

## Delivery plan

The next release is three two-week sprints. The dependency order is trustworthy collaboration, distributable infrastructure, then richer media.

## Sprint 1 — Trustworthy agent–workspace loop — complete

### Outcome

An agent creates a stable draft, another actor edits or reviews it, the agent retrieves the exact revision, and NoCanva produces a render pinned to the correct template version.

### Scope

- Introduce stable Draft and immutable DraftRevision records.
- Give every draft a stable `/drafts/:id` workspace URL.
- Pin `template_version_id` on each draft revision and render.
- Add lifecycle states: `draft`, `in_review`, `approved`, and `rendered`.
- Keep archive/restore orthogonal through `archived_at`.
- Record review and approval actor, notes, timestamp, and revision.
- Invalidate approval when an approved draft is edited.
- Add revision numbers or ETags so stale agent updates cannot overwrite newer edits.
- Let the UI load and edit every agent-created brand, template, and draft.
- Let agents retrieve UI or API edits and revision history.
- Rename the primary MCP namespace to `nocanva_*` while temporarily retaining `canvnah_*` aliases routed to the same handlers.
- Keep brand and template creation as advanced/admin operations.

### Target MCP surface

- `nocanva_get_brand`
- `nocanva_list_templates`
- `nocanva_list_drafts`
- `nocanva_get_draft`
- `nocanva_create_draft`
- `nocanva_update_draft`
- `nocanva_review_draft`
- `nocanva_approve_draft`
- `nocanva_archive_draft`
- `nocanva_render`
- `nocanva_get_render`

### Approval policy

Approval is actor-neutral and workspace-configurable. An approval may come from a human or an authorized agent. Self-hosted and autonomous workspaces can permit agent approval; stricter teams can require a human actor before final rendering. Mechanical validation remains mandatory in every mode.

### Agent-first exit test

One automated fixture must:

1. Create a draft and receive its stable URL.
2. Update it through a second actor/API path.
3. Retrieve the new revision through MCP.
4. Produce and inspect an exact-content preview.
5. Record review and approval against that revision.
6. Render with the pinned template version.
7. Update the template and prove the previous render is unchanged.
8. Edit the draft, prove approval is invalidated, and create a new revision.
9. Archive and restore the draft without losing provenance.

### NoCanva after Sprint 1

NoCanva is a trustworthy local agent workspace rather than only a rendering utility. The complete agent-to-workspace loop is machine-testable and provenance is reliable.

## Sprint 2 — Open-source distribution and NoCanva Cloud foundation — complete

Implementation status: the open-source distribution and the private managed release candidate are deployed and contract-tested. The app runs on Cloudflare Workers with dedicated D1/R2 storage; MCP runs on a separate Worker with Browser Rendering and a service binding to the app. Workspace-scoped managed tokens, human-required approval, and anonymous fail-closed behavior are active. A custom domain plus Cloudflare Access is still required before replacing the private Sites URL for human access.

### Outcome

A new user can self-host NoCanva or connect an agent to NoCanva Cloud in approximately two minutes.

### Open-source scope

- Publish a documented, provider-neutral open-source core.
- Add Docker packaging and a one-command local production setup.
- Support local filesystem/SQLite defaults with documented D1/R2-compatible adapters.
- Keep local stdio MCP as the default development interface.
- Add authenticated Streamable HTTP MCP for remote self-hosting.
- Provide migrations, seed data, health checks, backups, and upgrade documentation.
- Bundle an `AGENTS.md` workflow and Claude Code import instructions.
- Provide one-command Codex and Claude Code connection examples.

### NoCanva Cloud scope

- Managed application, database, object storage, and render workers.
- Workspace-scoped authentication tokens with revocation and audit history.
- Authenticated remote MCP endpoint.
- Workspace isolation, rate limits, render timeouts, and structured logs.
- Connection and diagnostics page.
- Activation and render-completion event instrumentation.

Cloud authentication and operational code must remain outside or cleanly layered above the open-source core. Cloud features must use the same application services and MCP contracts as self-hosted installations.

### Agent-first exit test

A clean environment must start NoCanva, connect a fresh MCP client, create a draft, render it, and open the returned workspace URL without manual database or server configuration. The same contract suite must run against local stdio, self-hosted HTTP, and NoCanva Cloud.

### Release-candidate verification — 2026-08-20

- Production build, TypeScript, lint, schema, persistence, UI-contract, MCP-authentication, and render-contract suites pass.
- The full draft lifecycle passes over local stdio and authenticated Streamable HTTP.
- A clean Docker stack builds, becomes healthy, completes an authenticated draft-to-render workflow, and preserves the exact PNG hash through the documented stop/restore/restart procedure.
- The application loads agent-created brands, real template previews, editable draft workspaces, and immutable render details without browser console errors.
- Six visually reviewed 1080 × 1350 campaign assets were created for ScamDB India and Parakhi using one locked template per brand.
- The hosted contract uploaded a real immutable image through MCP, rendered and mechanically reviewed it with Cloudflare Browser Rendering, crossed a separate human-required approval boundary, promoted the exact reviewed bytes, and retrieved the immutable 1080 × 1350 render with a matching SHA-256.

### NoCanva after Sprint 2

NoCanva is a usable, release-candidate-tested open-source self-hosted product with a cloud-ready service foundation. Managed convenience will use the same agent workflow after the remaining deployment, UI/API authentication, and data-isolation work is complete.

## Sprint 2B — Secure public release — release candidate complete

### Outcome

Publish the open-source release and operate a private hosted NoCanva without trusting client-supplied identity or allowing data to cross workspace boundaries.

### Gates

- **Application boundary — implemented:** local mode remains frictionless; hosted mode requires a private Sites identity or the internal application service token. MCP token identity and workspace are forwarded as trusted server context, and hosted actors cannot spoof review or approval attribution.
- **Workspace isolation — implemented:** every durable record and query is scoped by authenticated workspace, reusable slug IDs are physically namespaced, and R2 assets use workspace-prefixed keys. A two-workspace container contract proved isolated lists, independent matching slugs, denied cross-workspace reads/writes, and denied render-asset access.
- **Cloud contract — complete:** the Workers app, D1, R2, Browser Rendering MCP Worker, secrets, service binding, and hosted image lifecycle proof are live on free-tier-compatible resources.
- **Open-source release — prepared, owner action pending:** release documentation and the `v0.4.0-rc.1` candidate are ready. Repository visibility remains private and no public release/tag is created without the owner’s explicit decision.
- **Human cloud access — owner action pending:** attach the chosen custom domain and protect it with Cloudflare Access. Until then, the private Sites deployment remains the human UI and the Workers app remains agent/service-only.

No public deployment is allowed until all four gates pass.

## Sprint 3 — Product-launch media wedge — core media complete

### Outcome

Developer and startup teams can turn repositories, changelogs, release notes, documentation, and screenshots into a complete branded launch-media set.

### Scope

- Add a first-class carousel/deck model with 3–7 ordered slides. **Complete.**
- Support `cover`, `body`, and `cta` slide roles.
- Store slide revisions and render references independently.
- Produce a deck-level hash from ordered slide hashes.
- Reuse unchanged slide renders byte-for-byte.
- Add screenshot/image upload, focal point, fit, zoom, and deterministic cropping for cards and individual carousel slides. **Complete.**
- Support Instagram portrait and LinkedIn social-card dimensions.
- Provide PNG export initially.
- Ship three excellent launch templates:
  - Feature announcement card
  - Product workflow carousel
  - Product screenshot with explanation
- Add an assisted brand-onboarding flow from a website, logo, or repository.
- Extract candidate colors and assets, recommend fonts, and generate two or three constrained templates for review before activation.

Brand onboarding may use the calling agent for extraction and creative recommendations. The saved brand and rendering path remain deterministic and do not require an embedded NoCanva LLM.

Remaining Sprint 3 work is narrower: named slide roles and partial slide reuse, LinkedIn dimensions, three launch-specific template compositions, assisted brand onboarding, and design-partner observation.

### Agent-first exit test

An agent must turn a fixture repository, release note, and screenshot into a mechanically valid, visually inspectible, approved launch carousel. Repeating the run with identical inputs must reproduce the same slide hashes; changing one slide must not change the others.

### NoCanva after Sprint 3

NoCanva is an open-source and hosted agent-native media workspace with a clear initial customer: developer and startup teams producing repeatable product-launch content. It supports individual cards, launch carousels, screenshots, stable drafts, agent/human revisions, approvals, and reproducible exports.

## Quality and testing strategy

NoCanva should have minimal dependency on manual testing because its primary users are agents.

Required automated layers:

- Schema and application-service unit tests.
- MCP contract tests for every supported transport.
- Full agent workflow fixtures with multiple actors and revisions.
- Golden-image regression tests for approved templates.
- Mechanical layout checks for bounds, overflow, fonts, dimensions, and safe areas.
- Deterministic repeated-render hash checks.
- Storage migration and rollback fixtures.
- Self-host installation smoke tests.
- Cloud isolation and authentication tests.
- Carousel partial-update tests proving unchanged slides remain byte-identical.

Automated checks establish mechanical correctness and reproducibility, not aesthetic quality. Visual quality comes from the calling multimodal agent, optional human review, and curated golden templates. Human testing is concentrated on onboarding clarity, approval UX, and periodic template-quality review rather than routine regression testing.

## Metrics that matter

- Time from connection to first successful render.
- Percentage of agent drafts opened in the UI.
- Percentage edited by another actor.
- Percentage reviewed, approved, and exported.
- Average agent iterations before approval.
- Assets produced per active workspace per week.
- Brand, layout, and deterministic-render failure rate.
- Successful self-host installation rate.
- Repeat weekly usage by active workspaces.

The strongest signal is a team asking its agent to create media again the following week.

## Explicit non-goals

- No freeform infinite canvas.
- No general-purpose vector editor.
- No large template marketplace.
- No publishing scheduler.
- No animation or video editor yet.
- No dozens of unrelated output categories.
- No mandatory built-in LLM or visual-review provider.

Structured editing is a feature. Users and agents can change the message, image, format, and approved layout without accidentally destroying the design system.

## Release definition

The three-sprint release is complete when a team can connect its preferred agent, create and revise stable drafts, review real rendered previews, produce template-version-pinned assets, generate a launch carousel with screenshots, and choose either self-hosted NoCanva or NoCanva Cloud without changing the workflow.
