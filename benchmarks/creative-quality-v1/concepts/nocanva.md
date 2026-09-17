# Concept sheet — NoCanva

## Shared production contract

- Audience: teams that use coding agents to create governed brand media.
- Objective: make the product feel like serious creative infrastructure, not another template editor.
- Source pixels: current NoCanva UI and render captures only; remove account details and credentials.
- Generated imagery: abstract environments, light, texture, and depth surfaces only. Never regenerate the UI, logo, or exported poster.
- Required formats: 4:5 primary and 1:1 adaptation.
- Required editable controls: headline copy and scale, UI crop, asset position and scale, connection path, CTA, background tone, and depth intensity.

## NC-01 — Exact pixels, approved once

### Argument

The reviewed artwork and immutable export are the same pixels. The poster should make that continuity visible in one glance.

### Copy hierarchy

1. **Exact pixels, approved once.**
2. Reviewed revision in. Immutable PNG out.
3. NoCanva mark and restrained `Open source · Agent-native` footer.

### Composition

- A large, real draft-review crop enters from the left as a crisp floating surface.
- A matching immutable render exits to the right with a visible SHA fragment beneath it.
- One precise connector passes through a small approval seal between the two surfaces.
- Headline occupies the quiet upper-left zone; the product evidence owns the center and lower-right.
- Dark neutral environment, controlled white surfaces, one warm accent at the approval point.

### Asset plan

- Real review-screen capture with readable status and artwork.
- Exact immutable render from the same revision.
- Repository-owned NoCanva mark.
- Optional generated background with studio light and shallow material depth.

### Fidelity and rejection rules

- The two artwork instances must be demonstrably identical.
- No fabricated hash, status, revision, or UI element.
- Reject if the interface is too small to identify, if the connector looks like generic workflow decoration, or if the poster reads as a dashboard screenshot collage.

### Scene primitives exposed

`text`, `image`, `surface`, `path`, `seal`, `hashLabel`, `shadow`, `grain`, `safeArea`

## NC-02 — Your agent creates; you make the call

### Argument

Agents can do the production work without taking the final human decision.

### Copy hierarchy

1. **Your agent creates. You make the call.**
2. Research, revisions, and review arrive ready for a human approval.
3. `Agent → Review → Human approval → Export`

### Composition

- A vertical production trail rises behind one tactile approval control in the foreground.
- Small real UI crops show revision, review, and approval states; the human action is largest and clearest.
- The visual center is the approval decision, not a robot illustration.
- Warm white field with black type, graphite UI crops, and one green approval accent.

### Asset plan

- Current captures for revision history, review result, and approval action.
- NoCanva mark.
- Generated paper or acrylic depth surfaces permitted behind the real captures.

### Fidelity and rejection rules

- Preserve the exact wording of real product states.
- Do not imply autonomous publication or an embedded model.
- Reject if the agent is anthropomorphized, if approval appears automatic, or if the design resembles a generic four-step infographic.

### Scene primitives exposed

`text`, `image`, `stepRail`, `decisionControl`, `surface`, `shadow`, `accent`, `safeArea`

## NC-03 — One revision, shared

### Argument

The stable draft URL and revision history give agents and humans one governed object to work on together.

### Copy hierarchy

1. **One revision. Shared by agent and human.**
2. Every edit is recorded. Stale writes fail.
3. A small revision sequence using real values from the chosen capture.

### Composition

- A stable URL runs as a physical spine through layered revision cards.
- Earlier revisions recede; the current revision sits sharply in front with the real artwork crop.
- Human and agent interventions are identified by restrained labels, not avatars.
- Editorial black-and-cream treatment with a single electric-blue provenance line.

### Asset plan

- Real revision-history and current-draft captures.
- Exact stable draft URL with sensitive workspace identifiers redacted if necessary.
- No generated UI. Generated material texture is optional.

### Fidelity and rejection rules

- Use a genuine revision sequence from one draft.
- Do not expose private identifiers or credentials.
- Reject if the timeline is decorative rather than legible, or if the current revision is not visually dominant.

### Scene primitives exposed

`text`, `image`, `revisionStack`, `spine`, `label`, `mask`, `shadow`, `safeArea`
