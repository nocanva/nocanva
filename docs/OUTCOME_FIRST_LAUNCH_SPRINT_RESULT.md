# Outcome-first launch sprint result

**Date:** 18 September 2026
**Decision:** Narrow and continue after source onboarding
**Release status:** Implementation complete; five-run success gate not met

## Outcome

The outcome-first workflow is implemented and one fully sourced Blindspot launch completed the complete NoCanva lifecycle:

```text
verified evidence
→ creative plan
→ product-demonstration intent
→ product composition
→ mechanically reviewed PNG
→ eight-question visual review
→ approval
→ immutable exact-byte render
```

The other four planned runs were stopped before drafting because required approved brands or source assets were unavailable. The blockers are recorded in their run manifests; no generated or unrelated material was substituted.

## Ticket results

| Ticket | Result |
| --- | --- |
| OL-01 — Specify the launch workflow | Complete. `nocanva-media` recognizes launch-outcome requests, creates a plan, routes story intent, and returns a complete launch package. |
| OL-02 — Tighten the visual-review rubric | Complete. The eight questions now cover first-glance comprehension, dominance, phone readability, purposeful copy, source fidelity, story and brand fit, finish, and distinctness. |
| OL-03 — Define benchmark run records | Complete. A versioned schema, five manifests, index, scorecard, lifecycle IDs, process timing, visual answers, caption, alt text, URLs, template pins, and hashes are retained. |
| OL-04 — Produce five launch runs | Partially complete. Blindspot rendered; NoCanva, Cloudflare Agents SDK, Framework Laptop 13, and OLIPOP are source-blocked. |
| OL-05 — Evaluate usability and repair | Complete for the rendered run. Blindspot is publishable with one agent review iteration and zero finishing edits. |
| OL-06 — Improve the highest-frequency failure | Complete. Review warnings now compare a candidate's actual background before reporting recent-surface repetition. |
| OL-07 — Sprint review and release decision | Complete. Decision: narrow and continue after approved source onboarding. |

## Rendered result

- Run: `BS-LAUNCH-01`
- Story intent: Product demonstration
- Composition: `product`
- Visual direction: `interface`
- Format: 1080 × 1350
- Template version: `product@6`
- Agent review iterations: 1
- Human finishing time: 0 seconds
- Review verdict: Publishable
- Review SHA-256: `b8151c804a950568c39e577d0b3699c725c217d4e7dfdb862a2e601305003e3a`
- Final SHA-256: `b8151c804a950568c39e577d0b3699c725c217d4e7dfdb862a2e601305003e3a`

The matching hashes demonstrate that final rendering promoted the reviewed bytes.

## Measured funnel

| Measure | Result |
| --- | --- |
| Planned runs | 5 |
| Fully sourced runs | 1 |
| Rendered runs | 1 |
| Publishable rendered runs | 1 of 1 |
| First-glance pass | 1 of 1 rendered |
| Caption usable without rewriting | 1 of 1 rendered |
| Claim-accuracy failures | 0 |
| Asset-fidelity failures | 0 |
| Median agent review iterations | 1 |
| Median human finishing time | 0 seconds |
| Automated time to first review | 0.566 seconds |
| Automated time to immutable publishable render | 15.667 seconds |

The automation timings are local fixture timings and are not customer-facing performance claims.

## Blocker analysis

### NoCanva

The intended exact-pixels story requires a current review-workspace capture and its byte-identical immutable render. The benchmark does not retain that verified pair, and the current seeded workspace has no approved NoCanva brand/template.

### Cloudflare Agents SDK

The evidence and story are ready, but the NoCanva workspace has no approved Cloudflare brand/template and the benchmark does not retain a cleared official code or documentation crop as a source asset.

### Framework Laptop 13

Official current-model packshots and service imagery are not retained, permission review remains incomplete, and no approved Framework brand/template exists.

### OLIPOP Classic Grape

The current packshot and nutrition-panel pixels are not retained, permission review remains incomplete, and no approved OLIPOP brand/template exists.

## Product learning

The outcome-first layer worked as intended on the sourced run: the story was chosen before the composition, the user-facing artifact was specific, and the final package included caption, alt text, evidence, workspace, immutable render, template pin, and hash.

The dominant constraint is now approved source and brand onboarding, not the launch workflow itself. Creating temporary brands or regenerating product assets would invalidate the sprint's fidelity rules and would not test real production readiness.

The run also exposed and fixed one review-quality defect: a feed-level background warning was returned even when the candidate already used a different background. Review now suppresses that warning when the candidate has resolved the repetition.

## Decision

Keep the outcome-first skill and story-intent catalog changes. Do not declare the five-run release gate passed.

The next bounded milestone is to onboard approved brand records and exact source assets for the four blocked products, then execute their existing manifests without changing the story plans. Video, publishing, a freeform canvas, and persistent story-intent fields remain out of scope.
