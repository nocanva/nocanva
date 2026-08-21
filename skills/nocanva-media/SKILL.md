---
name: nocanva-media
description: Create evidence-backed, brand-consistent single cards or 3–7 slide carousels through a NoCanva MCP workspace. Use when an agent should turn repository, release-note, documentation, or product facts into branded media, visually review every PNG, approve it, and return immutable renders without publishing externally.
---

# NoCanva media

Use NoCanva as the constrained design and provenance layer. Supply the copy and creative judgment yourself; NoCanva makes no embedded LLM calls.

## Create media

1. Read the source material and keep a short evidence ledger mapping every product claim to a file, URL, or user-provided fact. Omit unverifiable claims.
2. For Blindspot, call `nocanva_get_brand` and `nocanva_list_compositions`. Inspect the recent 20 drafts and repetition warnings. Choose among `claim`, `real_but`, `receipt`, `whats_missing`, `product`, and `explainer` by story purpose; avoid a composition used in the previous three posts unless evidence strongly requires it. For other brands, call `nocanva_list_templates` and reuse an approved template.
3. Call `nocanva_create_draft` with semantic content and `compositionId`, never coordinates or Puck JSON. Preserve its stable `workspaceUrl`, pinned `templateVersionId`, and `currentRevision`.
4. Before any update, call `nocanva_get_draft` and pass its exact `currentRevision` as `expectedRevision`. Treat human edits as authoritative unless they conflict with source evidence.
5. Call `nocanva_review_draft`. Treat every returned `contentWarnings` item as a request for revision, not an informational note. Inspect the returned PNG visually. Answer all eight returned rubric questions, including one-second hook, hierarchy, phone legibility, copy density, crop, Blindspot fit, professional finish, and similarity to recent posts. Mechanical schema, bounds, overflow, typography, dimension, and hash checks do not establish aesthetic quality. If the result is weak, update and review again, for at most three agent iterations.
6. Approve the exact reviewed revision with `nocanva_approve_draft`, then call `nocanva_render`. Rendering promotes the approved review artifact; it does not create a visually different second capture.
7. Call `nocanva_get_render`. Report the draft workspace URL, render workspace URL, asset URL, dimensions, pinned template version, and SHA-256.

Never publish externally, bypass review, invent claims, or create a new brand/template for each post. Keep repeated posts within one brand visually consistent while allowing different brands and templates to remain distinct.

For Blindspot, use specific evidence-led copy. Name the actual claim, date, location, source, contradiction, or product behavior. Use real Blindspot product screenshots and meaningful image descriptions; never substitute a NoCanva screenshot, a generic source label, or an invented logo. A mechanically valid fixture is not an approved visual reference. Only add a render to `benchmarks/blindspot-references.json` after its claims and assets are sourced and a human approves its brand quality.

## Create a carousel

1. Build one evidence-backed narrative with 3–7 structured slides. Each slide needs an eyebrow, headline, and support line.
2. Call `nocanva_create_carousel` with one approved brand, template, and format for the entire set. Preserve its `workspaceUrl`, `templateVersionId`, and `currentRevision`.
3. Before edits, call `nocanva_get_carousel` and use its exact `currentRevision` with `nocanva_update_carousel`.
4. Call `nocanva_review_carousel`. Inspect every returned PNG visually; one attractive slide does not establish the quality of the full set. Check narrative flow, hierarchy, legibility, repetition, brand fit, and whether slide-to-slide rhythm is intentional.
5. Approve the exact review set with `nocanva_approve_carousel`, then call `nocanva_render_carousel`. Rendering promotes every approved review artifact without a second capture.
6. Call `nocanva_get_carousel_render`. Report the editable workspace URL, immutable render URL, every slide URL and SHA-256, the pinned template version, dimensions, and ZIP URL.
