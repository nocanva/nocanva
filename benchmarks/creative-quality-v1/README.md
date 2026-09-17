# Creative quality benchmark v1

This workspace executes the discovery sprint in `docs/CREATIVE_QUALITY_PIVOT_SPRINT.md`.

It evaluates whether NoCanva can support market-competitive, art-directed posters without weakening its source fidelity, revision, approval, and deterministic-output guarantees.

## Status

- Sprint plan: approved.
- Day 1 product set: selected.
- Evidence ledgers: initialized.
- Quality rubric: initialized.
- Reference library: initial taxonomy established; collection continues.
- Concept briefs: 15 production briefs drafted across five products.
- Candidate production: blocked on source-asset clearance and capture.
- Scene graph v0: not started.
- Product code changes: none.

## Product set

| Product | Class | Why it is included |
| --- | --- | --- |
| NoCanva | Software interface | First-party source access, launch messaging, screenshots, and a technically demanding product story. |
| Blindspot | Software and evidence | Tests real screenshots, source provenance, claim restraint, and evidence-led visual systems. |
| Cloudflare Agents SDK | Information-heavy developer product | Tests technical launch communication from authoritative documentation. |
| Framework Laptop 13 | Physical product | Tests packshot fidelity, modular feature callouts, comparison, and premium product composition. |
| OLIPOP Classic Grape | Physical consumer product | Enables direct comparison with polished commercial ad examples while testing packaging and nutrition fidelity. |

These are internal benchmark subjects. Inclusion does not imply endorsement, partnership, publishing permission, or permission to imply new claims.

## Required candidate set

Produce three visually distinct candidates per product:

1. Hero.
2. Feature, comparison, or evidence.
3. Alternate campaign concept.

Total: 15 posters.

## Hard rules

- Every factual statement must appear in the corresponding evidence ledger.
- Time-sensitive prices, availability, discounts, and product status must be rechecked immediately before use.
- Real products, interfaces, logos, labels, and important text must not be redrawn by an image model.
- Generated imagery may provide environments, backgrounds, textures, or decorative material only when the result does not misrepresent the product.
- Candidate directions must differ conceptually, not merely by color or crop.
- Outputs remain private benchmark artifacts unless the product owner separately approves publication.

## Directory contract

```text
benchmarks/creative-quality-v1/
├── README.md
├── rubric.json
├── reference-library.md
├── products/
│   ├── nocanva.md
│   ├── blindspot.md
│   ├── cloudflare-agents-sdk.md
│   ├── framework-laptop-13.md
│   └── olipop-classic-grape.md
├── concepts/       # one concept sheet per product
├── candidates/     # final benchmark images and manifests
├── reviews/        # blind scores and qualitative notes
└── scene-graph/    # v0 specification after editing-needs analysis
```

Evidence, reference taxonomy, and concept briefs are initialized. Candidate media begins only after the asset checklist in every concept sheet is satisfied.
