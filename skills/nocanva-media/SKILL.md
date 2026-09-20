---
name: nocanva-media
description: Turn a repository, release, documentation, or verified product brief into an evidence-backed launch post or 3–7 slide carousel through NoCanva. Use for requests such as “launch what I built,” “make a launch post,” or creating brand-consistent media that must be visually reviewed, approved, and returned as immutable renders without external publishing.
---

# NoCanva media

Use NoCanva as the constrained design and provenance layer. Supply the copy and creative judgment yourself; NoCanva makes no embedded LLM calls.

## Direct the launch

Start from the outcome, not the tool lifecycle. When the user asks to launch what they built, infer a single post by default. Use a carousel only when sequence, comparison, or multiple evidence beats materially improve the story.

### Establish evidence and the creative plan

1. Read the source material and keep a short evidence ledger mapping every proposed artifact or caption claim to a file, approved URL, or user-provided fact. Omit unverifiable claims and note important exclusions.
2. Before selecting a composition, make a compact launch plan:
   - **Objective:** what the artifact should accomplish.
   - **Audience:** who should care.
   - **Verified event:** what actually happened.
   - **Strongest claim:** the most compelling sourced statement.
   - **Proof:** the source, screenshot, date, metric, or behavior supporting it.
   - **Hook:** what should be understood in under one second.
   - **Story intent:** one of the intents below.
   - **Visual anchor:** what should dominate the frame.
   - **Supporting detail:** the one secondary fact worth retaining.
   - **Intended reaction:** what the viewer should think, feel, or do.
   - **Format:** single post or carousel, with a reason.
   - **Caption:** one-to-three-sentence canonical draft.
   - **Exclusions:** claims or implications the evidence does not support.
3. Keep this plan in working context unless the user requests a repository artifact. Canonical media content remains the structured NoCanva payload.

### Route story intent to composition

Choose the intent from evidence before inspecting recent work:

| Story intent | Use when | Composition |
| --- | --- | --- |
| Announcement | A verified event, release, capability, or behavior is the story | `claim` |
| Contradiction | A supported truth conflicts with the common framing | `real_but` |
| Evidence | A source artifact, quote, date, number, or receipt carries the story | `receipt` |
| Omitted context | A specific missing fact changes the interpretation | `whats_missing` |
| Product demonstration | A real interface or product behavior is the proof | `product` |
| Feature education | The viewer should understand a verified workflow | `explainer` |

For Blindspot, call `nocanva_get_brand` and `nocanva_list_compositions`. Inspect the recent 20 drafts and repetition warnings after selecting the story intent. Use history to break ties and avoid repetition, never to force a weaker story. Avoid a composition used in the previous three posts unless evidence strongly requires it. Let NoCanva route a compatible `editorial`, `documentary`, `bulletin`, `field_notes`, `monument`, or `interface` visual direction. For other brands, call `nocanva_list_templates` and map the intent to the closest approved template.

### Create and review a single post

1. When a required source image is on the repository filesystem, hash it and measure its byte length locally, then call `nocanva_create_asset_upload`. Use the returned short-lived URL and headers in a terminal `curl --data-binary @file` PUT. Never paste or base64-encode the source into the conversation. Confirm the returned asset SHA-256 matches the local hash.
2. Call `nocanva_create_draft` with semantic content and `compositionId`, never story-intent metadata, coordinates, or Puck JSON. Omit `visualDirection` on the first attempt so the deterministic router can use the content and recent feed. Preserve the returned direction reason, stable `workspaceUrl`, pinned `templateVersionId`, and `currentRevision`.
3. Before any update, call `nocanva_get_draft` and pass its exact `currentRevision` as `expectedRevision`. Treat human edits as authoritative unless they conflict with source evidence.
4. Call `nocanva_review_draft`. Treat every returned content or creative-similarity warning as requiring revision. Inspect the PNG and answer all eight returned questions. Confirm first-glance comprehension, one dominant idea, phone legibility, purposeful supporting copy, faithful crop, story and brand fit, professional finish, and distinctness from recent work. Mechanical checks do not establish aesthetic quality. If the silhouette is wrong, update with a different compatible `visualDirection`; otherwise preserve it. Review at most three agent iterations. If transport drops, retrieve the draft before retrying; a matching latest review means the first call committed.
5. Approve the exact reviewed revision with `nocanva_approve_draft`, then call `nocanva_render`. Rendering promotes the approved review artifact rather than making a visually different capture.
6. Call `nocanva_get_render` and use only its final URLs, dimensions, template version, and SHA-256 in delivery.

For Blindspot, use specific evidence-led copy. Name the actual claim, date, location, source, contradiction, or product behavior. Use real Blindspot product screenshots and meaningful image descriptions; never substitute a NoCanva screenshot, a generic source label, or an invented logo. A mechanically valid fixture is not an approved visual reference. Only add a render to `benchmarks/blindspot-references.json` after its claims and assets are sourced and a human approves its brand quality.

## Create a carousel

1. Build one evidence-backed narrative with 3–7 structured slides. Each slide needs an eyebrow, headline, and support line. The opening states the hook, each middle slide advances it, and the close resolves it. Reserve `whats_missing` for a specific omitted date, place, source, statement, or context. For a screenshot-free feature walkthrough use `explainer`; use `product` only when every product-led slide has a real product screenshot.
2. Call `nocanva_create_carousel` with one approved brand, template, and format for the entire set. Omit directions initially; NoCanva routes every slide using its content, sequence role, and recent feed. Preserve its `workspaceUrl`, `templateVersionId`, and `currentRevision`.
3. Before edits, call `nocanva_get_carousel` and use its exact `currentRevision` with `nocanva_update_carousel`.
4. Call `nocanva_review_carousel`. Treat every returned content warning, similarity warning, and failed contrast or typography check as requiring revision. Inspect every PNG and answer all eight returned questions for every slide. One attractive slide does not establish the quality of the set. Check narrative flow, hierarchy, legibility, repetition, brand fit, and whether direction changes create intentional rhythm. Never approve a slide whose meaningful content disappears or breaks incorrectly.
5. Approve the exact review set with `nocanva_approve_carousel`, then call `nocanva_render_carousel`. Rendering promotes every approved review artifact without a second capture.
6. Call `nocanva_get_carousel_render` and use only its final URLs, dimensions, template version, ordered hashes, and ZIP URL in delivery.

## Deliver the launch package

Return a compact, usable package rather than narrating the internal lifecycle:

- **Creative angle:** the selected story intent and why it fits the evidence.
- **Canonical caption:** one to three sentences, specific and postable as-is; avoid generic phrases such as “excited to announce,” “revolutionize,” or “unlock.”
- **Alt text:** meaningful descriptions for every source image.
- **Evidence summary:** each artifact and caption claim mapped to its source, plus material exclusions.
- **Editable workspace:** the draft or carousel workspace URL.
- **Immutable result:** render and asset URLs, dimensions, pinned template version, SHA-256 or ordered slide hashes, and ZIP URL for a carousel.

Caption and alt text follow the same evidence rules as pixels. Do not introduce a second story in the caption. Never say the media was published; creating a launch package does not authorize external publication.

## Invariants

Never publish externally, bypass review, invent claims, persist story-intent metadata in media payloads, or create a new brand/template for each post. Keep repeated posts within one brand visually consistent while allowing different brands and templates to remain distinct.
