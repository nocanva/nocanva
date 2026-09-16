# Creative quality pivot sprint

**Status:** Proposed for review  
**Length:** 10 working days  
**Theme:** Prove the creative-quality direction before changing the product architecture  
**Implementation policy:** This sprint produces evidence, reference work, and specifications. It does not ship editor or rendering code.

## Sprint outcome

Decide, with visual evidence, whether NoCanva can become reusable creative production infrastructure that produces art-directed posters comparable to strong commercial creative tools while preserving verified inputs, product fidelity, revisions, approval, and exact output.

At the end of the sprint we should be able to answer:

1. What does a market-competitive NoCanva poster look like?
2. Which visual systems should NoCanva support first?
3. Can the proposed hybrid workflow produce that quality repeatedly?
4. Which parts belong in NoCanva Core, an intelligence adapter, or a vertical application?
5. What scene primitives are required before direct canvas editing is built?
6. Is the next investment the quality engine, the scene graph, or a narrower product experiment?

## Product decision carried into the sprint

Output quality comes before a general-purpose canvas editor.

A sophisticated editor cannot rescue weak default output without turning NoCanva into a manual design application. Strong default concepts create immediate value, validate the reusable infrastructure thesis, and reveal the small set of editing operations that humans actually need.

The future editor remains important. Its data model should be designed during this sprint, but implementation follows only after the successful poster experiments identify the right primitives.

## Proposed positioning

> NoCanva is agent-native creative production infrastructure that turns verified product material into art-directed, editable, governed media.

The platform has three layers:

1. **NoCanva Core** — assets, scene representation, deterministic finishing, revisions, review, approval, and immutable exports.
2. **Creative intelligence adapters** — research, campaign strategy, concept development, asset generation, multimodal critique, and candidate ranking.
3. **Vertical applications** — focused products such as launch kits, local ads, marketplace listings, evidence cards, and real-estate campaigns.

Vertical applications may depend on Core. Core must never depend on a vertical application.

## Reference application

Use a **Product Launch Kit** as the sprint's reference application.

Input:

- A product URL, repository, changelog, verified brief, or product screenshot.

Output for each product:

- One product or interface hero poster.
- One feature, comparison, or evidence poster.
- One distinctly different campaign concept.

The application is deliberately broad enough to exercise physical products and software screenshots, but narrow enough to evaluate a coherent customer outcome.

## Required inputs

Before Day 2, select five real products:

- Two software or developer products with real interface screenshots.
- Two physical products with clean product photographs or packshots.
- One evidence-heavy or information-heavy product story.

For every product, retain an evidence ledger containing:

- Approved source URLs.
- Product images and screenshots.
- Brand marks, colors, and type references.
- Claims that may be used.
- Claims that must not be inferred.
- Intended audience and campaign objective.

No invented product feature, statistic, testimonial, certification, or comparison may enter a reference poster.

## Workstream A — Quality benchmark

### Reference library

Collect 30–50 strong posters across the following systems:

- Product hero.
- Interface or screenshot hero.
- Feature callouts.
- Comparison graphics.
- Ingredient or component annotations.
- Lifestyle scenes.
- Testimonial or social proof.
- Editorial announcements.
- Evidence and receipt-led posters.
- Multi-slide narrative campaigns.

The library should include commercial tools, strong agency work, strong in-house work, and relevant human-designed references. LocalAds examples are useful anchors, not the sole definition of quality.

Starting references:

- Product hero: <https://makelocalads.com/hero/olipop-01.webp>
- Comparison graphic: <https://makelocalads.com/hero/olipop-03.webp>
- Ingredient composition: <https://makelocalads.com/hero/olipop-06.webp>
- LocalAds workflow and showcase: <https://makelocalads.com/#how-it-works>

### Visual taxonomy

Tag every reference by:

- Visual system.
- Primary focal object.
- Information density.
- Asset count and asset roles.
- Typography treatment.
- Background treatment.
- Depth, lighting, texture, and effects.
- Brand-specific versus reusable decisions.
- Likely deterministic versus generative components.
- Required editing operations.

### Quality rubric

Score each sprint output from 1–5 on:

1. Strength of the visual idea.
2. Composition and hierarchy.
3. Typography.
4. Product or screenshot fidelity.
5. Brand fidelity.
6. Supporting-asset integration.
7. Claim accuracy and provenance.
8. Mobile readability.
9. Distinctness from adjacent candidates.
10. Amount of human repair required.

Product fidelity and claim accuracy are hard gates rather than qualities that may be averaged away.

## Workstream B — Manual quality experiment

Create three poster candidates for each of the five products: 15 posters total.

This is intentionally a manual or semi-manual experiment. Use the strongest available tools and models. Record the complete workflow, but do not constrain it to what NoCanva can automate today.

### Composition method

Each candidate should separate:

- **Verified source assets:** product packshots, screenshots, logos, evidence, and source text.
- **Generated supporting assets:** backgrounds, environments, textures, illustrations, and decorative material.
- **Deterministic finishing:** typography, claims, product labels, brand marks, charts, annotations, and CTA treatment.

Important product labels, screenshots, logos, and copy must not be redrawn by an image model. Preserve or deterministically composite the real source pixels.

### Candidate diversity

The three candidates for a product must represent different visual ideas, not small variations of one template. Change at least three of:

- Visual system.
- Focal object scale.
- Image role.
- Information density.
- Type hierarchy.
- Surface or environment.
- Supporting-asset treatment.

### Process ledger

For every candidate, record:

- Source inputs.
- Strategic angle.
- Art direction.
- Tools or models used.
- Generated and deterministic components.
- Time to first candidate.
- Human interventions.
- Fidelity failures.
- Finalization time.

## Workstream C — Scene graph specification

Derive a version-zero scene graph from the successful candidates. Do not start from a generic design-editor feature list.

The specification should cover:

- Canvas and output format.
- Text elements and bounded typography.
- Source images, product cutouts, and screenshots.
- Generated images and decorative assets.
- Shapes, paths, gradients, and textures.
- Masks and crop regions.
- Shadows, blur, opacity, and blend treatment.
- Groups and reusable components.
- Position, size, rotation, and stacking order.
- Alignment relationships and safe areas.
- Brand locks and editable properties.
- Responsive variants across formats.
- Provenance from semantic field to rendered element.
- Deterministic serialization and hashing.
- Revision behavior when agent and human edits meet.

### Editing modes to specify

**Guided mode**

- Semantic fields.
- Recommended composition.
- Automatic reflow.
- Brand-safe controls.

**Canvas mode**

- Direct selection.
- Move, resize, align, reorder, group, and lock.
- Typography controls.
- Crop and mask controls.
- Smart guides, safe areas, undo, and redo.

The specification must define what happens when a later semantic edit would invalidate manual layout overrides.

## Ten-day sequence

### Day 1 — Alignment and inputs

- Confirm the positioning and reference application.
- Select the five products.
- Establish the evidence ledger for each.
- Agree on the evaluation rubric and hard gates.

**Exit:** Five usable briefs with approved source material.

### Days 2–3 — Reference library and taxonomy

- Collect and tag 30–50 references.
- Identify recurring visual systems and production techniques.
- Separate quality signals from landing-page presentation effects.
- Select the 12 strongest benchmark anchors.

**Exit:** Approved visual taxonomy and benchmark board.

### Days 4–6 — Produce the reference campaign set

- Develop three visual directions per product.
- Produce 15 finished posters.
- Preserve source fidelity and deterministic text.
- Record the process ledger.

**Exit:** Complete candidate set with no unsupported claims.

### Day 7 — Blind quality review

- Mix NoCanva experiment outputs with benchmark references.
- Review without identifying the source tool.
- Score every candidate using the rubric.
- Record which posters reviewers would actually publish.

**Exit:** Comparable scores and qualitative failure patterns.

### Day 8 — Editing-needs analysis

- Attempt realistic revisions on the best five candidates.
- Record every operation required to finish them.
- Rank editing operations by frequency and importance.
- Separate essential direct manipulation from specialist design tooling.

**Exit:** Evidence-backed minimum canvas-editor scope.

### Day 9 — Scene graph and platform boundary

- Draft the scene-graph v0 specification.
- Map each production step to Core, an adapter, or the reference application.
- Identify likely throwaway experiments versus durable architecture.

**Exit:** Reviewable scene model and ownership boundaries.

### Day 10 — Sprint review and investment decision

- Present the reference library, 15 posters, scores, time data, editing analysis, and scene specification.
- Decide whether the creative-quality approach clears the gate.
- Select the smallest implementation milestone.
- Explicitly stop or revise the pivot if quality remains below the references.

**Exit:** Written go, narrow, repeat, or stop decision.

## Success gates

The pivot advances to implementation only if:

- At least 12 of 15 posters are rated publishable or minor-edit.
- Median quality score is at least 4/5.
- Product and screenshot fidelity pass on 15 of 15 posters.
- Claim accuracy passes on 15 of 15 posters.
- Every product has at least two genuinely distinct publishable concepts.
- Median measured human finishing time is below two minutes.
- Reviewers prefer or consider the best NoCanva experiment comparable to at least half of the selected benchmark anchors.
- The successful outputs can be represented by a coherent scene graph without embedding tool-specific documents.

If the outputs pass creatively but require excessive manual work, narrow the quality engine before building the editor. If the outputs are strong and revision patterns repeat, proceed with the scene graph and minimum direct-manipulation editor.

## Sprint deliverables

1. Creative reference library and tagged visual taxonomy.
2. Five verified product briefs and evidence ledgers.
3. Fifteen finished poster candidates.
4. Quality scores and blind-review notes.
5. Per-candidate production and time ledger.
6. Ranked list of required editing operations.
7. Scene graph v0 specification.
8. Core versus adapter versus vertical-application responsibility map.
9. Recommended implementation milestone with estimated scope.
10. Written sprint decision.

## Explicit non-goals

- No production editor implementation.
- No renderer migration.
- No commitment to an image-model vendor.
- No video, scheduling, publishing, analytics, or ad-buying work.
- No billing or pricing implementation.
- No generic blank canvas.
- No attempt to match all Canva functionality.
- No changes to the existing NoCanva revision and approval contract.

## Risks and controls

### Reference-board bias

**Risk:** Choosing only visually spectacular work that cannot serve normal product communication.  
**Control:** Include simple, information-heavy, software, and evidence-led references alongside product advertising.

### Product hallucination

**Risk:** Generated scenes alter packaging, interfaces, or claims.  
**Control:** Preserve real source pixels and render factual text deterministically.

### Accidental Canva clone

**Risk:** Direct editing expands into a general design suite.  
**Control:** Derive controls from observed finishing work and retain locked brand/template constraints.

### Tool-specific architecture

**Risk:** The scene model becomes coupled to one editor or image generator.  
**Control:** Store canonical NoCanva primitives and treat editors and generators as replaceable adapters.

### Attractive but unrepeatable demonstrations

**Risk:** A few hand-crafted posters look strong but the process does not scale.  
**Control:** Record time and intervention data for all 15 outputs and require repeatable patterns across five products.

## Decisions requested in sprint review

1. Approve, narrow, repeat, or stop the quality pivot.
2. Confirm the first vertical application.
3. Confirm the scene graph as the next durable Core investment.
4. Approve the minimum editing scope derived from observed revisions.
5. Select the first creative-intelligence adapter strategy.
6. Choose the next implementation sprint and its measurable release gate.

