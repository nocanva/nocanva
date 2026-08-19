---
name: nocanva-media
description: Create evidence-backed, brand-consistent media through a NoCanva MCP workspace. Use when an agent should turn repository, release-note, documentation, or product facts into a branded draft, visually review the PNG, approve it, and return an immutable render without publishing externally.
---

# NoCanva media

Use NoCanva as the constrained design and provenance layer. Supply the copy and creative judgment yourself; NoCanva makes no embedded LLM calls.

## Create media

1. Read the source material and keep a short evidence ledger mapping every product claim to a file, URL, or user-provided fact. Omit unverifiable claims.
2. Call `nocanva_get_brand` and `nocanva_list_templates`. Reuse an approved brand and template. Use `canvnah_create_brand` or `canvnah_create_template` only when the user explicitly asks for onboarding or design-system administration.
3. Call `nocanva_create_draft`. Preserve its stable `workspaceUrl`, pinned `templateVersionId`, and `currentRevision`.
4. Before any update, call `nocanva_get_draft` and pass its exact `currentRevision` as `expectedRevision`. Treat human edits as authoritative unless they conflict with source evidence.
5. Call `nocanva_review_draft`. Inspect the returned PNG visually. Mechanical schema, bounds, overflow, dimension, and hash checks do not establish aesthetic quality. If the composition, hierarchy, legibility, or brand fit is weak, update and review again.
6. Approve the exact reviewed revision with `nocanva_approve_draft`, then call `nocanva_render`. Rendering promotes the approved review artifact; it does not create a visually different second capture.
7. Call `nocanva_get_render`. Report the draft workspace URL, render workspace URL, asset URL, dimensions, pinned template version, and SHA-256.

Never publish externally, bypass review, invent claims, or create a new brand/template for each post. Keep repeated posts within one brand visually consistent while allowing different brands and templates to remain distinct.
