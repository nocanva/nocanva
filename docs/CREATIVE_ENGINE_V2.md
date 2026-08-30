# Creative Engine v2

## Product promise

Connect NoCanva through MCP, give the calling agent verified content, and receive a draft that is at least 90% ready for Instagram without choosing coordinates, browsing a template library, or repairing the layout by hand.

NoCanva remains deterministic and model-neutral. The calling multimodal agent researches, writes, and visually judges. NoCanva supplies content-aware art direction, feed memory, constrained editing, mechanical review, revisions, approval, and immutable rendering.

## What the market solves

- [Canva Autofill](https://www.canva.dev/docs/connect/api-reference/autofills/) maps structured data into brand-template fields. Canva Magic Design and Layouts separately return several content-aware layout suggestions.
- [Placid MCP](https://placid.app/help/mcp-setup-guide) exposes named dynamic template layers to an agent. Its outputs remain template-driven.
- [Creatomate modifications](https://creatomate.com/docs/fundamentals/getting-started/template-modifications) separate dynamic values from a visual template and can modify or reorder template elements.
- [Polotno](https://polotno.com/docs/schema) provides a structured, editable design JSON and a capable embedded canvas editor.
- [Adobe Express](https://helpx.adobe.com/express/web/create-with-templates/text-to-template.html) generates several editable template candidates from a prompt.

The repeatable systems are strong at filling one chosen template. The generative systems are strong at proposing directions but weaker at reproducibility and governance. NoCanva's opportunity is to combine governed deterministic output with content-aware direction selection and multimodal agent review.

## Diagnosis

NoCanva v1 has several semantic compositions, but they share too much visual grammar: persistent header and footer positions, similar typography, the same safe-area box, repeated headline/support stacking, and a narrow set of surfaces. Composition diversity therefore does not guarantee visual diversity.

Adding a freeform canvas would improve repairability, not first-draft quality. Adding more templates without routing would create a larger library that the agent must manually search. Neither solves the core problem.

## Model

Every output has two independent decisions:

1. `compositionId`: what the story is doing—claim, correction, receipt, missing context, product, or explainer.
2. `visualDirection`: how that story is staged—editorial, documentary, bulletin, field notes, monument, or interface.

Content stays semantic. A visual direction never exposes coordinates or editor JSON.

### Visual directions

| Direction | Silhouette | Best signals |
| --- | --- | --- |
| Editorial | Restrained report with balanced type and proof | Safe fallback, sourced statements |
| Documentary | Source media dominates; copy behaves like a caption | Photos, video frames, evidence |
| Bulletin | Urgent sans typography and decisive color blocks | Breaking updates, strong hooks |
| Field notes | Annotated paper, evidence labels, irregular proof objects | Source trails, timelines, explainers |
| Monument | One oversized fact or sentence with extreme whitespace | Strong numbers, dates, conclusions |
| Interface | Product screenshot becomes the stage | Product behavior and UI evidence |

## Routing

The router ranks compatible directions using only deterministic signals:

- Composition and carousel role.
- Presence and role of an image, screenshot, evidence, quote, metric, or steps.
- Copy length and density.
- Recent direction, surface, composition, and headline-opening history.
- Stable tie-breaking.

The router must not choose a direction used in the previous three outputs when another compatible direction exists. An explicitly supplied direction is allowed only when compatible and is still reported as a repetition warning.

For carousels, routing happens per slide. Hook, context, evidence, and close should normally use different silhouettes while retaining the same brand and template version.

## Agent experience

The simple path stays simple:

1. The agent calls `nocanva_create_draft` or `nocanva_create_carousel` with verified semantic content.
2. NoCanva assigns visual directions and records why.
3. Review returns the rendered PNGs, direction metadata, mechanical checks, recent-feed similarity warnings, and the visual rubric.
4. The calling multimodal agent accepts or revises. It may explicitly request a different compatible direction on a later revision.

The human sees the recommended direction as compact metadata. Puck exposes bounded content, crop, emphasis, and section-order refinements. It does not become a generic canvas. A direction switcher remains a deliberately small follow-up; the default agent path requires no layout choice.

## Quality gates

The engine is not complete when every PNG merely passes bounds checks.

- 100% of outputs pass dimensions, bounds, collision, phone readability, contrast, image prominence, and deterministic hash checks.
- At least 90% of the benchmark is publishable without layout repair after agent review.
- Median human adjustment time stays below 60 seconds.
- No visual direction appears in the previous three standalone outputs when a compatible alternative exists.
- A carousel with four or more slides uses at least three visual directions unless a reviewer records a story-specific exception.
- In a nine-post feed, no single visual direction exceeds four covers.
- Pairwise layout fingerprints include direction, surface, dominant region, media coverage, alignment, density, and brand-mark placement; near duplicates require revision.

## Implementation sequence

1. Persist `visualDirection` with semantic content and expose direction definitions through MCP.
2. Add deterministic ranking for drafts and per-slide carousel routing.
3. Build direction-specific CSS/React treatments that create genuinely different silhouettes while reusing the same semantic blocks.
4. Include direction and feed-memory results in review responses.
5. Add an optional direction switcher and Instagram feed/profile preview without adding freeform controls.
6. Generate three candidate directions when the single-result router does not clear the quality benchmark.

Stage six is conditional. Multiple candidates add render cost and review burden; a strong router should first prove how often alternatives are necessary.

## Current benchmark

Creative Engine v2 passes the Blindspot v1 gate:

- 20/20 tasks publishable without design edits after full-size PNG review.
- 30/30 PNGs pass schema, bounds, overflow, collision, typography, phone readability, critical-text contrast, image prominence, and deterministic rendering.
- All six visual directions are represented across the set.
- Median recorded human layout adjustment: 0 seconds.
