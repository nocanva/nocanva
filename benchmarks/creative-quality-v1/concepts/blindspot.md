# Concept sheet — Blindspot

## Shared production contract

- Audience: people evaluating a fact-check, claim, or report through Blindspot.
- Objective: make evidence and missing context desirable without turning it into generic newsroom graphics.
- Source pixels: approved Blindspot screenshots and named primary sources only.
- Generated imagery: neutral material environments or non-factual texture only. Never regenerate the product UI, documents, people, events, or evidence.
- Required formats: 4:5 primary and 1:1 adaptation.
- Required editable controls: source crop, screenshot crop, claim and verdict type, evidence order, highlight region, connector, citation, and background treatment.

## BS-01 — Product proof

### Argument

The product screenshot is itself the proof of how Blindspot reveals context.

### Copy hierarchy

1. Story-specific verdict or product behavior visible in the screenshot.
2. **See what the post left out.**
3. Named source and reporting date.

### Composition

- Present the real interface as a premium product object, free of a generic browser-frame cliché.
- One magnified context region leaves the interface surface and becomes a legible evidence card.
- Headline is subordinate to the source pixels; it frames what to notice rather than repeating the screenshot.
- Dark field, high-fidelity screen light, decisive red or blue brand accent.

### Asset plan

- Current product screenshot with a useful verdict and context panel.
- Approved logo and brand tokens.
- Named source record used by that exact story.

### Fidelity and rejection rules

- Screenshot must remain upright, undistorted, and readable.
- Do not invent a label, verdict, source, metric, or product state.
- Reject if the screenshot is decorative, crops out the evidence, or occupies less than the dominant visual role.

### Scene primitives exposed

`text`, `image`, `screenSurface`, `magnifier`, `evidenceCard`, `connector`, `citation`, `shadow`, `safeArea`

## BS-02 — The missing context

### Argument

The strongest fact-check is often the detail excluded from the circulating claim.

### Copy hierarchy

1. Exact short claim excerpt.
2. **What it leaves out**
3. The decisive sourced omission in one sentence.
4. Named primary source, date, and locator.

### Composition

- The claim occupies a compressed band with a visible gap cut from its center.
- The missing context physically fills that gap using a source excerpt or document crop.
- Blindspot UI appears as the verification layer, not as an ornamental screenshot.
- Restrained editorial palette with one bright evidence highlight.

### Asset plan

- Original claim capture when legally and ethically appropriate.
- Primary-source document or official page capture.
- Blindspot context-panel crop for the same story.

### Fidelity and rejection rules

- The claim excerpt and omission must match the named source.
- Never imply that absence alone proves motive.
- Reject if the layout can be reused with arbitrary text without losing its visual idea, or if the source locator is unreadable.

### Scene primitives exposed

`text`, `quoteBand`, `cutout`, `sourceCrop`, `highlight`, `citation`, `image`, `safeArea`

## BS-03 — Receipt versus claim

### Argument

Put the viral wording and the primary record into a direct, inspectable confrontation.

### Copy hierarchy

1. **Claim / Record**
2. Exact paired excerpts.
3. One precise explanation of the contradiction or missing qualifier.
4. Source identity and date.

### Composition

- Two physical planes meet at a sharp central seam: the claim on one side, the primary record on the other.
- The decisive language aligns across the seam through a single rule or bracket.
- Blindspot branding and CTA sit in a quiet footer; evidence owns the poster.
- Use texture differences to distinguish social capture from authoritative record without degrading either.

### Asset plan

- Original claim capture.
- Primary-record crop with sufficient surrounding context.
- Optional Blindspot verdict crop as a small third proof point.

### Fidelity and rejection rules

- Preserve enough surrounding context to avoid misleading excerpting.
- Do not fabricate social metrics, usernames, document seals, or annotations.
- Reject if the record cannot be read at export size or if decorative effects obscure provenance.

### Scene primitives exposed

`text`, `splitPlane`, `image`, `documentCrop`, `bracket`, `annotation`, `citation`, `safeArea`
