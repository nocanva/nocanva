# Outcome-first launch sprint

**Status:** Ready for execution
**Length:** 10 working days
**Theme:** Make NoCanva feel like a launch outcome, not a media-production protocol
**Primary surface:** `skills/nocanva-media/SKILL.md`
**Quality gate:** Preserve the Blindspot 20-task benchmark and all existing review, approval, and exact-byte guarantees

## Sprint outcome

A developer can say:

> Use NoCanva to launch what I just built.

The agent then turns verified repository or product evidence into a publishable launch package without requiring the user to understand brands, templates, revisions, review artifacts, or render mechanics.

The completed package contains:

1. One approved static post or 3–7 slide carousel.
2. One canonical ready-to-post caption.
3. Meaningful alt text for every source image.
4. A concise evidence summary connecting every claim to its source.
5. The editable workspace URL.
6. Immutable render URLs, dimensions, pinned template version, and SHA-256 hashes.

The sprint improves the creative planning and delivery layer. It does not weaken or replace NoCanva's existing semantic MCP lifecycle.

## Product hypothesis

NoCanva's governance is valuable but should be mostly invisible during the first-use experience. A short, opinionated creative workflow can produce stronger and more immediately useful work while the existing platform continues to enforce brand constraints, revisions, mechanical review, approval, and exact-byte promotion.

The hypothesis passes if users can request a launch outcome in one sentence and receive work that is more specific, more immediately understandable, and closer to publishable without additional design instruction.

## Design principles

### Lead with the job

The skill interprets the user's desired outcome before exposing implementation choices. It should ask for input only when a missing fact or asset would materially change the story.

### Plan the story before selecting the composition

Evidence determines the strongest story. The story determines the composition. The available template must not determine what the agent chooses to say.

### One artifact, one dominant idea

Every post or carousel has one primary communication objective. Supporting copy and imagery clarify that idea rather than compete with it.

### First-glance quality is a release criterion

A viewer should understand the subject and central tension or benefit in under one second. Mechanical validity is necessary but cannot substitute for this judgment.

### Deliver a publishable package

The output is not complete when a PNG exists. Caption, alt text, evidence summary, workspace link, and immutable asset details are part of the customer outcome.

### Governance remains non-negotiable

The sprint preserves evidence discipline, approved brands, semantic content, immutable revisions, stale-write protection, visual inspection, approval, pinned templates, and exact reviewed bytes.

## Scope boundary

### In scope

- An outcome-first invocation and workflow in the NoCanva media skill.
- A compact creative-plan contract completed before draft creation.
- A story-intent taxonomy mapped to existing semantic compositions.
- Stronger first-glance and story-specific visual review guidance.
- Canonical caption, alt text, and evidence-summary delivery.
- Five reproducible end-to-end launch examples from verified sources.
- Instrumentation and evaluation of time-to-first-publishable and human repair.
- Documentation and tests for any changed MCP response contract.

### Explicitly out of scope

- Video, animation, audio, voiceover, or timeline editing.
- Social publishing or scheduling.
- Embedded LLM calls.
- New brands, templates, or visual directions unless an existing benchmark failure proves one is required.
- A freeform canvas or coordinate-based API.
- A new persistent story-intent database field during this sprint.
- Changes to the revision, review, approval, authentication, or exact-byte promotion guarantees.
- Broad product expansion before the Blindspot benchmark passes.

## User experience

### Primary invocation

```text
Use NoCanva to launch what I just built.
```

Supported refinements remain natural-language instructions rather than a large flag surface:

```text
Turn this release into one evidence-led launch post.
Create a five-slide product walkthrough from this repository.
Make the launch feel direct and technical, not corporate.
Use this screenshot as the product proof.
```

### Agent-visible workflow

```text
verified evidence
      ↓
creative plan
      ↓
story intent
      ↓
compatible semantic composition
      ↓
NoCanva draft and routed visual direction
      ↓
mechanical + multimodal review
      ↓
exact-revision approval
      ↓
immutable launch package
```

### Creative-plan contract

Before calling `nocanva_create_draft` or `nocanva_create_carousel`, the agent records a concise plan in its working context or a repository artifact when the user requests one:

```markdown
## Launch plan

- Objective: What should this artifact accomplish?
- Audience: Who should care?
- Verified event: What actually happened?
- Strongest claim: What is the most compelling sourced statement?
- Proof: Which source, screenshot, date, metric, or behavior supports it?
- Hook: What should be understood in under one second?
- Story intent: Which intent below fits the evidence?
- Visual anchor: What should dominate the frame?
- Supporting detail: What is the one secondary fact worth retaining?
- Intended reaction: What should the viewer think, feel, or do?
- Format: Single post or carousel, with a reason.
- Caption: Canonical one-to-three-sentence draft.
- Exclusions: Claims or implications the evidence does not support.
```

This plan is an agent workflow artifact, not a new server-side source of truth. Canonical media content remains the structured NoCanva payload.

## Story-intent taxonomy

The sprint uses six intents that map onto the six existing Blindspot compositions. The intent describes the communication job; the composition remains the semantic rendering contract.

| Story intent | Use when | Existing composition | Required proof |
| --- | --- | --- | --- |
| Announcement | A verified event or capability is itself the story | `claim` | Named event, capability, release, or behavior |
| Contradiction | The interesting truth conflicts with the common framing | `real_but` | Both sides must be explicitly supported |
| Evidence | A source artifact, quote, date, number, or receipt carries the story | `receipt` | Visible, attributable evidence |
| Omitted context | A specific missing fact changes interpretation | `whats_missing` | Named omitted date, place, source, statement, or context |
| Product demonstration | The product interface or behavior is the proof | `product` | Real product screenshot or verified product asset |
| Feature education | A user should understand how something works | `explainer` | Verified steps, behavior, or documented workflow |

Rules:

- Choose the story intent from evidence before looking at recent composition history.
- Use recent history to break ties and avoid repetition, not to force a weaker story.
- Do not persist `storyIntent` in the media payload during this sprint.
- Record the selected intent and rationale in the evidence summary and benchmark manifest.
- Non-Blindspot brands use the same intent vocabulary, mapped to the closest approved template available for that brand.

## Caption contract

Each completed run produces one canonical caption. It should:

- Be one to three sentences.
- Name the actual product, event, or behavior.
- Lead with the strongest verified point.
- Match the artifact's story rather than introduce a second idea.
- Avoid generic launch language such as “excited to announce,” “revolutionize,” or “unlock.”
- Contain no claim absent from the evidence ledger.
- Be returned in the final agent response; it is not persisted in the rendered image unless intentionally part of the composition.

Platform variants are optional and must not replace the canonical caption.

## Evidence-summary contract

The final response includes a compact ledger:

| Artifact claim | Source | Status |
| --- | --- | --- |
| Exact claim or faithful paraphrase | Repository path, approved URL, or user-provided fact | Verified |

The summary also names deliberately excluded claims when omission matters. It must not expose secrets, private tokens, or irrelevant repository content.

## Workstreams

### Workstream A — Outcome-first skill

Update `skills/nocanva-media/SKILL.md` to:

- Recognize launch-outcome requests, not only requests phrased as media creation.
- Build the creative plan before selecting a composition.
- Apply the story-intent mapping.
- Prefer a single post unless the story genuinely needs sequence, comparison, or multiple evidence beats.
- Preserve the existing maximum of three agent review iterations.
- Return the complete launch package.
- Keep the normal MCP lifecycle behind the skill rather than restating it to the user at every step.

**Acceptance criteria**

- The skill contains the complete creative-plan contract.
- All six intents have unambiguous selection rules and composition mappings.
- Existing evidence, asset-integrity, revision, review, approval, and rendering instructions remain intact.
- A reader can execute the workflow without consulting this sprint document.
- No instruction permits external publishing.

### Workstream B — Review quality

Strengthen the existing eight-question rubric without growing it into a long checklist. Preserve eight questions unless evaluation demonstrates that one dimension cannot be expressed clearly.

The review must establish:

1. The hook and subject are understandable in under one second.
2. One idea clearly dominates the hierarchy.
3. Copy is legible at phone-feed size.
4. Supporting copy earns its space and does not repeat the headline.
5. Source imagery is prominent, correctly cropped, and factually faithful.
6. The selected composition and visual direction fit the story intent and brand.
7. The result feels deliberately art-directed and publishable.
8. It is meaningfully distinct from recent work without breaking brand continuity.

**Acceptance criteria**

- MCP review responses return the updated rubric for posts and every carousel slide.
- Contract tests assert the rubric count and critical language.
- Every benchmark review records answers, not merely a global pass/fail.
- Mechanical checks are still described as necessary but insufficient for aesthetic approval.

### Workstream C — Launch-package delivery

Define one consistent final-response structure in the skill:

```text
Launch package
- Creative angle and story intent
- Canonical caption
- Alt text
- Evidence summary
- Editable workspace URL
- Immutable asset or carousel URLs
- Dimensions
- Pinned template version
- SHA-256 hash or ordered slide hashes
```

**Acceptance criteria**

- Single-post and carousel paths return the same conceptual package.
- Caption and alt text pass evidence review.
- Every reported URL and hash comes from the final NoCanva records.
- The skill never claims that the media was externally published.

### Workstream D — Reproducible examples

Create five launch runs using the existing benchmark products:

1. NoCanva.
2. Blindspot.
3. Cloudflare Agents SDK.
4. Framework Laptop 13.
5. OLIPOP Classic Grape.

At least:

- Two runs use a real product or interface screenshot.
- One run is evidence-led.
- One run is a carousel.
- Four different story intents appear across the set.

For each run retain:

- Evidence ledger.
- Creative plan.
- Story-intent rationale.
- Exact structured payload.
- Draft and render identifiers.
- Review answers and warnings.
- Revision count.
- Human interventions and elapsed finishing time.
- Final caption and alt text.
- Pinned template version and final hashes.

Examples remain private benchmark artifacts unless separately approved for publication.

**Acceptance criteria**

- All five runs are reproducible from their retained inputs.
- No unsupported claim enters a draft or caption.
- Every final asset passed mechanical and visual review.
- The example set demonstrates conceptual variety, not only different colors or crops.

### Workstream E — Measurement and release decision

Measure:

- Time from invocation to first reviewed candidate.
- Time from invocation to first publishable candidate.
- Number of agent revisions.
- Number and duration of human edits.
- Publishable, minor-edit, major-edit, or reject verdict.
- One-second hook pass rate.
- Claim and asset-fidelity pass rate.
- Story-intent and composition diversity across the set.
- Caption usability without rewriting.

Do not count setup or source-access blockers as creative finishing time; record them separately.

## Ticket plan

### OL-01 — Specify the launch workflow

**Files:** `skills/nocanva-media/SKILL.md`, this document
**Owner:** Product/agent workflow
**Estimate:** 1 day
**Depends on:** None

- Add invocation handling, creative planning, story intent, and delivery contracts.
- Preserve both single-post and carousel lifecycles.
- Add worked examples for announcement, product demonstration, and evidence.

**Done when:** The skill independently describes the outcome-first workflow and passes manual instruction review against all existing safety constraints.

### OL-02 — Tighten the visual-review rubric

**Files:** `lib/compositions.ts`, `tests/media-schema.test.mjs`, relevant MCP contract tests
**Owner:** Creative engine
**Estimate:** 1 day
**Depends on:** OL-01

- Rewrite the eight questions around first-glance comprehension, hierarchy, story fit, fidelity, finish, and distinctness.
- Preserve the eight-question response contract unless a deliberate versioned change is approved.

**Done when:** Tests assert all eight questions and both draft and carousel review responses expose them.

### OL-03 — Define benchmark run records

**Files:** `benchmarks/creative-quality-v1/README.md`, new run manifest schema or documented JSON contract, review templates
**Owner:** Benchmarking
**Estimate:** 1 day
**Depends on:** OL-01

- Define required fields for plan, evidence, intent, payload, revisions, timing, review answers, caption, and immutable result.
- Add validation where practical.

**Done when:** A fresh contributor can record a complete run without making schema decisions.

### OL-04 — Produce five launch runs

**Files:** `benchmarks/creative-quality-v1/`
**Owner:** Creative production
**Estimate:** 3 days
**Depends on:** OL-02, OL-03

- Execute the skill against the five benchmark products.
- Inspect every PNG visually.
- Record failures and revisions rather than polishing the ledger after the fact.

**Done when:** Five complete, reviewable, reproducible launch packages exist.

### OL-05 — Evaluate usability and repair

**Files:** benchmark reviews and scorecard
**Owner:** Product/design review
**Estimate:** 1 day
**Depends on:** OL-04

- Conduct blind review where practical.
- Test whether canonical captions are postable without rewriting.
- Measure human finishing time and classify every result.

**Done when:** Every run has a verdict, review answers, time data, and documented failure pattern.

### OL-06 — Improve the highest-frequency failure

**Files:** Determined by OL-05; likely skill, composition routing, content warnings, or one existing renderer family
**Owner:** Engineering/design
**Estimate:** 2 days
**Depends on:** OL-05

- Fix one repeated failure affecting at least two runs.
- Do not add a new platform subsystem or generic editor feature.
- Re-run only the affected cases plus relevant automated tests.

**Done when:** The targeted metric improves without weakening claim fidelity, brand constraints, or deterministic rendering.

### OL-07 — Sprint review and release decision

**Files:** Final scorecard and sprint decision
**Owner:** Product
**Estimate:** 1 day
**Depends on:** OL-06

- Compare baseline and outcome-first runs.
- Decide ship, narrow, repeat, or stop.
- Select the next smallest milestone.

**Done when:** The decision cites measured results and names any unresolved blocker.

## Ten-day sequence

### Day 1 — Workflow contract

- Complete OL-01.
- Review the story-intent mapping against current compositions.
- Confirm no persistent schema change is required.

**Exit:** Executable skill specification.

### Day 2 — Review and benchmark contracts

- Complete OL-02 and OL-03.
- Run relevant tests.

**Exit:** Stable evaluation and record-keeping contract.

### Days 3–5 — Reference launch runs

- Execute OL-04.
- Maintain complete evidence and process records.
- Stop a run when source evidence or required imagery is unavailable; record the blocker instead of inventing a substitute.

**Exit:** Five complete launch packages or explicit source blockers.

### Day 6 — Blind review

- Complete OL-05 scoring.
- Review first-glance comprehension separately from detailed reading.

**Exit:** Comparable creative and usability results.

### Days 7–8 — Targeted correction

- Complete OL-06.
- Favor a narrow correction to the most common failure.

**Exit:** Measured before-and-after evidence.

### Day 9 — Regression and lifecycle verification

- Run unit, type, lint, MCP, draft, and carousel checks required by `AGENTS.md`.
- Verify review, approval, and exact-byte promotion remain unchanged.

**Exit:** Passing implementation and lifecycle verification.

### Day 10 — Decision and handoff

- Complete OL-07.
- Present the five launch packages, scorecard, repair data, and recommendation.

**Exit:** Ship, narrow, repeat, or stop decision.

## Success gates

The outcome-first workflow ships only if:

- Five of five launch packages contain no unsupported claims.
- Five of five preserve product and source-asset fidelity.
- At least four of five are publishable or minor-edit.
- At least four of five pass first-glance comprehension.
- At least four of five canonical captions are usable without rewriting.
- Median human finishing time is below two minutes.
- Median agent review iterations are two or fewer.
- At least four different story intents are represented.
- No composition appears in more than two of the five final packages unless evidence requires it.
- All existing automated and MCP lifecycle checks pass.
- Review and final render hashes prove exact-byte promotion is intact.

If creative quality improves but captions or packaging fail, narrow the next sprint to delivery. If story planning improves copy but visuals remain weak, prioritize the highest-frequency composition or asset-integration failure. Do not use video or a freeform canvas to conceal a static creative-quality problem.

## Required verification

For code or MCP behavior changed during this sprint, run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run mcp:fixture
npm run mcp:draft-fixture
npm run mcp:carousel-fixture
```

Also re-run the affected Blindspot benchmark cases and record whether the publishable verdict, human-edit time, or first-glance result changed.

## Risks and controls

### Workflow becomes prompt bureaucracy

**Risk:** The creative plan adds text without improving decisions.
**Control:** Keep it to eleven fields, allow concise answers, and evaluate whether it changes the selected story or composition.

### Story intent duplicates composition IDs

**Risk:** Two taxonomies create confusion.
**Control:** Story intent is user and agent language; composition ID remains the server contract. Maintain the explicit one-to-one mapping during this sprint.

### Better copy, same-looking feed

**Risk:** Planning improves language but not visual variety.
**Control:** Measure composition and visual-direction diversity, and inspect recent work before draft creation.

### Attractive but unsupported launch claims

**Risk:** Outcome-oriented writing encourages exaggeration.
**Control:** Evidence and product fidelity remain hard gates for artifact copy and captions.

### Packaging leaks into publishing

**Risk:** Ready-to-post output is mistaken for authorization to post.
**Control:** The skill creates copy and assets but never publishes externally.

### Scope expands into video

**Risk:** The BRAG comparison pulls the sprint toward motion tooling.
**Control:** Video remains frozen until the existing Blindspot gate passes; record future integration ideas separately.

## Sprint review decisions

At review, decide:

1. Did outcome-first planning improve publishability and first-glance comprehension?
2. Should the launch workflow become the default NoCanva skill path?
3. Which story intents produced the strongest and weakest results?
4. Is any intent-to-composition mapping wrong or too restrictive?
5. What was the highest-frequency source of human repair?
6. Does the next milestone belong in the skill, content warnings, routing, or renderer?
7. Has the Blindspot quality gate moved enough to justify broader scope?

## Definition of done

This sprint is complete when the skill can execute the outcome-first workflow, the five benchmark launch packages and their complete ledgers exist, automated verification passes, success gates have been scored, and a written ship, narrow, repeat, or stop decision has been recorded.
