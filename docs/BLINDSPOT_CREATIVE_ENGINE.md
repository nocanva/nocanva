# Blindspot-first creative engine

NoCanva's current priority is one excellent autonomous workflow:

> Create three Blindspot posts from what changed this week.

The expected result is three publishable Instagram drafts that use verified Blindspot facts, share one recognizable brand system, use deliberately different compositions, survive multimodal agent critique, and open at stable URLs for a human to tweak and export.

## Architecture

The canonical boundary is independent of Puck:

`Brand → Asset → Composition → Draft revision → Review → Approval → Render`

Puck is a replaceable editing adapter. It receives one approved semantic composition, edits only its allowed fields, and converts the result back into `PostContent`. NoCanva never stores or exposes raw Puck JSON. The web editor and PNG renderer use the same `PostArtwork` React tree.

Agents choose meaning rather than coordinates. The six approved families are `claim`, `real_but`, `receipt`, `whats_missing`, `product`, and `explainer`. Brand chrome, spacing, hierarchy, safe areas, and artwork geometry remain locked.

## Autonomous loop

1. Build an evidence ledger from source material; never invent a claim.
2. Get the Blindspot brand and list compositions with recent usage.
3. Avoid a composition used in the previous three posts unless the story requires it.
4. Create the semantic draft and keep its stable workspace URL.
5. Review the returned PNG against all eight visual questions.
6. Retrieve the current revision, update, and review again when needed. Stop after three agent iterations.
7. Approve the exact reviewed revision and promote it to an immutable render.

Mechanical checks establish dimensions, bounds, overflow, minimum phone-size type, font readiness, and deterministic hashes. They do not establish aesthetic quality; the calling multimodal agent owns that judgment.

## Measurement gate

The versioned 20-task benchmark is in `benchmarks/blindspot-v1.json`:

```sh
npm run benchmark:blindspot:run
# inspect every *-review.png in outputs/blindspot-benchmark-v1/
# record all eight decisions per PNG in quality-reviews.json
npm run benchmark:blindspot:run -- --finalize
npm run benchmark:blindspot -- outputs/blindspot-benchmark-v1/results.json
```

`quality-reviews.json` must copy the current manifest's `generatedAt` into `manifestGeneratedAt`, include a later `reviewedAt`, and name the reviewer. A new generation deletes stale results, and finalization rejects reviews from an older run. Mechanical success is never a visual pass.

The engine passes at 70% or more publishable without design edits and a median human effort below 120 seconds. Do not expand platform scope while it fails this gate.

Five to ten visually approved outputs belong in `benchmarks/blindspot-references.json`. References are real immutable NoCanva renders, not generated-image style prompts.

## Frozen scope

Until Blindspot passes the benchmark, do not add scheduling, publishing, collaboration, video, a template marketplace, a freeform canvas, embedded LLM calls, or additional platform plumbing. Asset crop, focal point, zoom, blur, highlight, and browser/device framing are in scope because they directly improve Blindspot output.
