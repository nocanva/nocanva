# What is NoCanva?

## The short version

NoCanva is an open-source, agent-native system for creating governed, brand-ready media.

An AI coding agent such as Codex or Claude Code supplies the research, copy, content decisions, and visual judgment. NoCanva supplies the durable creative infrastructure around that work: approved brands, constrained templates, editable drafts, immutable revisions, mechanical checks, review, approval, deterministic rendering, and traceable exported assets.

NoCanva does not contain a mandatory LLM. It is the workspace and media-production system that an external agent operates.

> Ideas in. Brand-ready media out.

## Why NoCanva exists

AI agents increasingly work where product information already lives: repositories, changelogs, release notes, documentation, specifications, issue trackers, and campaign briefs. They can understand that information and write useful launch copy, but creating production-ready visual media still involves a fragmented handoff.

Without a governed media system, an agent typically has to:

- Generate a one-off image with no reusable structure.
- Write custom HTML or SVG for every post.
- Recreate the brand system for each request.
- Hand work to a separate general-purpose design tool.
- Lose track of which template, content, or revision produced an exported image.
- Re-render after approval and potentially produce different pixels.
- Depend on a human to repeat mechanical layout checks.

The result may look attractive once, but it is difficult to reproduce, audit, edit, or scale.

NoCanva exists to make visual media a reliable part of an agent workflow. The agent should be able to create media as naturally as it creates code, while the organization retains control over its brand, templates, approval policy, and final assets.

## The central idea

NoCanva separates creative reasoning from production infrastructure.

The calling agent owns:

- Reading and verifying source material.
- Maintaining an evidence ledger.
- Writing headlines and supporting copy.
- Selecting an appropriate approved template.
- Choosing or preparing source imagery.
- Reviewing the rendered image visually.
- Iterating when the composition is not good enough.

NoCanva owns:

- Brand definitions and constraints.
- Versioned templates.
- Structured content validation.
- Stable draft workspace URLs.
- Immutable draft revisions.
- Stale-write protection.
- Mechanical rendering checks.
- Review and approval records.
- Exact template-version pinning.
- Exact-size PNG rendering.
- Immutable assets and SHA-256 hashes.
- Agent and human access to the same work.

This boundary keeps the open-source core model-neutral. A user can bring Codex, Claude Code, another MCP-capable agent, or a custom automation system without changing NoCanva's lifecycle.

## What NoCanva produces

NoCanva currently focuses on branded launch and social media for developer and startup teams.

Supported media includes:

- Individual social cards.
- Instagram portrait posts at 1080 × 1350.
- Square posts at 1080 × 1080.
- Three-to-seven-slide carousels.
- Product screenshot cards.
- PNG export.
- Immutable carousel ZIP exports.

Content can include a structured eyebrow, headline, supporting copy, and an optional workspace image with deterministic fit, focal point, and zoom instructions.

The product is intentionally narrow. It is not trying to support every document, video, presentation, or publishing workflow.

## How the workflow works

### 1. Establish the source of truth

The calling agent reads the source repository, release note, documentation, or campaign brief. It records evidence and avoids inventing product claims.

### 2. Reuse an approved brand and template

The agent retrieves the brand and lists its available templates. It does not create a new brand or design system for every post.

Brand configuration currently includes identity, tagline, website, approved colors, and safe-area rules. Templates are versioned separately from brands.

### 3. Create a stable draft

The agent creates a structured draft through MCP. NoCanva returns a stable workspace URL that a human can open in the web application.

The agent and human see the same draft rather than working in disconnected copies.

### 4. Create immutable revisions

Every saved change creates a new revision. Updates must include the draft's exact current revision number, preventing an older agent or browser tab from silently overwriting newer work.

Each revision pins the exact template version used by that content.

### 5. Review the real rendered image

NoCanva renders the exact-size PNG and performs mechanical checks such as:

- Output dimensions.
- Canvas bounds.
- Clipping and overflow.
- Font readiness.
- Safe-area compliance where applicable.
- Repeated-render hash consistency.

These checks establish mechanical validity, not beauty. The calling multimodal agent or a human must still inspect the PNG and judge hierarchy, balance, cropping, legibility, and overall visual quality.

### 6. Approve an exact revision

Review and approval are recorded against a specific immutable revision and reviewed artifact. Editing an approved draft invalidates the previous approval.

Workspaces can permit agent approval for autonomous operation or require a human actor before final rendering.

### 7. Promote the reviewed bytes

Final rendering does not capture the page again. NoCanva promotes the exact PNG bytes that were reviewed and approved.

The completed render records:

- Draft revision.
- Template version.
- Input snapshot.
- Dimensions.
- Asset location.
- Creation time and actor.
- SHA-256 hash.

This makes the final asset reproducible and auditable.

## The carousel workflow

Carousels use the same lifecycle in parallel across three to seven ordered slides.

One carousel retains a single brand, format, template, and pinned template version. Every slide is rendered and visually inspected. Approval applies to the complete reviewed set, and final rendering promotes the exact reviewed PNG for every slide plus an immutable ZIP.

The carousel-level result records the ordered slide hashes so order and content are both verifiable.

## How humans use NoCanva

The web application is the shared review and editing surface.

Humans can:

- View agent-created brands, templates, drafts, carousels, and renders.
- Open a stable draft or carousel workspace URL.
- Edit structured copy.
- Upload or select workspace images.
- Adjust image fit, focal point, zoom, and alt text.
- Switch supported output formats.
- Save a new revision.
- Run mechanical review.
- Visually inspect the rendered result.
- Approve or reject a revision.
- Render the approved artifact.
- View provenance and revision history.
- Archive and restore work without deleting its history.

Structured editing is a deliberate product feature. A user can change the message, image, format, or approved composition without casually destroying the brand system.

### Experimental template editor

NoCanva is evaluating Puck, an MIT-licensed React visual editor, for constrained template composition.

The local proof lets a template designer choose among approved compositions and edit exposed fields while the brand header, footer, and core rules remain locked. It saves portable JSON and renders the same React component tree used by the preview.

This is currently an isolated proof of fit. It stores data locally in the browser and is not yet connected to production template versions or drafts. It will be adopted only if it removes substantial editor engineering without weakening deterministic rendering or brand governance.

## How agents use NoCanva

NoCanva exposes its important operations through the Model Context Protocol.

The daily draft lifecycle includes tools for:

- Retrieving a brand.
- Listing approved templates.
- Listing and retrieving drafts.
- Creating and updating drafts.
- Reviewing and approving revisions.
- Archiving drafts.
- Rendering approved media.
- Retrieving immutable renders.

A parallel tool family supports carousels.

Local development uses a stdio MCP server. Remote self-hosted and managed installations can expose authenticated Streamable HTTP MCP endpoints. Workspace-scoped tokens are revocable and audited.

Advanced brand and template administration remains separate from the normal media workflow. Agents should reuse design systems rather than reinvent them for each post.

## Deterministic does not mean repetitive

Determinism means identical inputs and the same template version produce identical output. It does not mean every template or brand should look alike.

Consistency should exist within a brand and within a template family. Different brands and different templates should be allowed to have different typography, composition, imagery, rhythm, and visual language.

NoCanva's design direction is therefore:

- One constrained design system per brand.
- Several genuinely different composition families per brand.
- Template selection based on communication intent.
- Reusable blocks such as screenshots, metrics, comparisons, quotes, steps, terminal output, feature lists, and calls to action.
- The same component and data model for preview and final rendering.
- Golden visual fixtures for curated templates.

The agent chooses the idea and the appropriate composition. The template controls how that composition stays on brand.

## What makes NoCanva different

### Compared with Canva

Canva is a broad, human-first creative suite covering many media categories and largely freeform design workflows.

NoCanva is narrower and agent-first. Its primary interface is a semantic media lifecycle rather than a blank canvas. It prioritizes reusable brand constraints, immutable revisions, approval policy, provenance, and deterministic output.

NoCanva is not intended to become a smaller Canva.

### Compared with Penpot or Figma

Penpot and Figma are general interface-design and prototyping applications. Their core objects are design files, pages, layers, components, and collaborative canvas operations.

NoCanva's core objects are brands, versioned media templates, structured drafts, reviewed revisions, approvals, and immutable renders. Penpot can be useful as an external design tool, but it does not replace NoCanva's autonomous media lifecycle.

### Compared with generative image tools

Image-generation models create new pixels from prompts. They are useful for source photography, illustration, and textures, but they do not inherently provide stable typography, brand rules, editable structured copy, approval provenance, or reproducible layout.

NoCanva may use agent-supplied generated images as immutable source assets. It does not depend on an embedded image model.

### Compared with template rendering APIs

Many rendering APIs can substitute values into a template and return an image.

NoCanva adds the shared agent-human workspace around rendering: evidence-aware agent operation, revisions, stale-write prevention, visual review, approval policy, exact-byte promotion, workspace isolation, stable URLs, and self-hostable MCP access.

## Product principles

1. **Agent-native:** every important operation is available to agents through a stable semantic interface.
2. **Human-visible:** everything an agent creates can be opened, understood, and edited in the web application.
3. **Deterministic:** identical approved inputs and template versions produce identical pixels.
4. **Brand-constrained:** creativity operates inside a deliberate brand system.
5. **Inspectable:** drafts, revisions, checks, approvals, renders, and hashes remain traceable.
6. **Provider-neutral:** no mandatory LLM, image generator, storage vendor, or hosted service is required by the open-source core.
7. **Self-hostable:** local and production self-hosting are first-class workflows.
8. **Cloud-optional:** the hosted version provides convenience without changing the underlying media lifecycle.
9. **Structured by default:** editing power should not make accidental brand destruction easy.
10. **Exact reviewed output:** approval applies to actual rendered bytes, not only to abstract input data.

## Architecture

NoCanva uses one shared application-service layer across the web application, APIs, MCP servers, and deployment targets.

At a high level:

```text
Codex / Claude Code / another agent
                 |
          semantic NoCanva MCP
                 |
                 v
      NoCanva application services <----> Web workspace
                 |
      brands, templates, drafts, revisions,
      reviews, approvals, renders, audit events
                 |
                 v
        deterministic HTML/CSS renderer
                 |
                 v
     exact reviewed PNGs and SHA-256 hashes
```

The current application is built with React and Next-compatible routing. Rendering uses shared React artwork components and exact browser capture. Durable relational records use a SQLite/D1-compatible repository, while immutable media uses filesystem/R2-compatible storage.

The managed deployment uses Cloudflare Workers, D1, R2, service bindings, and Browser Rendering. The self-hosted distribution provides Docker packaging and local storage defaults. Both paths use the same contracts.

## Open-source and hosted models

NoCanva's core is MIT licensed.

Users can:

- Run the application and MCP server locally for development.
- Self-host the complete core product.
- Use authenticated remote MCP with their own deployment.
- Use NoCanva Cloud for managed infrastructure, storage, rendering, authentication, isolation, and operational reliability.

The hosted product should add convenience rather than hold the creative workflow hostage. A user should be able to move between self-hosted and managed deployments without teaching their agent a different lifecycle.

## Security and workspace isolation

Hosted NoCanva fails closed for anonymous application requests. Agent tokens are scoped to a workspace, stored as hashes, revocable, and carried as trusted server context.

Durable queries and object-storage keys are workspace scoped. Client-supplied identity is not trusted. Review and approval attribution comes from authenticated context, and human-required approval policies cannot be bypassed by claiming a different actor in request data.

## What NoCanva intentionally does not do

NoCanva currently avoids:

- A freeform infinite canvas.
- A general-purpose vector editor.
- A huge public template marketplace.
- A social publishing scheduler.
- Animation and video editing.
- Dozens of unrelated output categories.
- A mandatory embedded LLM.
- Claims that mechanical checks establish aesthetic quality.
- Creating a new brand or template for every post.

These are product boundaries, not missing checkboxes. The goal is a dependable media workflow for agents, not feature parity with every creative application.

## Current state

The current release candidate includes:

- Brand-aware structured editing.
- Multiple renderer families.
- Real rendered template previews.
- Exact-size PNG output.
- Image upload and deterministic cropping.
- Durable brands, templates, drafts, revisions, approvals, and renders.
- Stable draft and carousel URLs.
- Local and authenticated remote MCP interfaces.
- Immutable reviewed artifacts and exact-byte promotion.
- Workspace isolation and revocable managed tokens.
- Docker self-hosting.
- Cloudflare deployment infrastructure.
- Automated draft, render, authentication, isolation, and carousel fixtures.

Remaining product work is concentrated on stronger template diversity, richer launch-media compositions, named carousel roles and partial reuse, additional formats, assisted brand onboarding, onboarding polish, and real design-partner observation.

## Who NoCanva is for

The initial customer is a developer or startup team that repeatedly turns product information into launch media.

Typical inputs include:

- A product release.
- A changelog entry.
- A repository or README.
- A new feature specification.
- A product screenshot.
- A technical article.
- A campaign brief.

Typical users include:

- Founders using coding agents across product and marketing work.
- Developer-relations and open-source teams.
- Small marketing teams with strong brand requirements.
- Agencies operating repeatable client brand systems.
- Teams that want autonomous media creation with an optional human approval boundary.

## What success looks like

NoCanva succeeds when a team asks its agent to create media again the following week.

Important measures include:

- Time from connection to first successful render.
- Percentage of agent drafts opened in the UI.
- Percentage edited or reviewed by another actor.
- Percentage approved and exported.
- Average iterations before approval.
- Assets produced per active workspace per week.
- Brand and layout failure rate.
- Successful self-host installation rate.
- Repeat weekly use.

The goal is not the largest number of registered users or generated images. It is a dependable habit: product evidence enters the agent workflow, and governed brand-ready media comes out.

## Product statement

> NoCanva is the governed media pipeline for AI agents. Give your agent a release note, repository, screenshot, or campaign brief. It creates brand-ready media through MCP. Open the result in NoCanva to edit, review, approve, and export the exact asset that was inspected.

NoCanva gives agents creative reach without giving up brand control, provenance, or human visibility.
