---
name: nocanva-layout
description: Generate distinctive HTML/CSS poster compositions for NoCanva through structured layout templates. Use when an agent needs creative directions, deterministic layout variation, and renderer-ready geometry for branded posts or short carousels.
---

# NoCanva layout direction

NoCanva does not make embedded LLM calls. The calling agent supplies the creative direction; NoCanva validates the layout spec, renders the React/HTML/CSS poster, reviews the exact PNG, and preserves the immutable artifact.

## Creative workflow

1. Read the brief and classify the content job: thesis, quote, evidence signal, announcement, statistic, list, testimonial, before/after, screenshot, or image-led story.
2. Extract 5–10 concrete subject nouns, materials, actions, or visual mechanics. Use one to motivate the composition; do not add an unrelated motif.
3. Generate 6–10 spatial concepts before selecting. Include at least one direction that is not centered type over a background or headline-left plus card-right.
4. Reject the predictable median. A new color, font, gradient, or ornament on the same skeleton is not a new direction.
5. Shortlist 2–4 directions. Each direction must name its family, focal region, reading order, alignment, media behavior, density, headline move, signature move, and copy-fit risk.

Read [references/creative-direction-prompt.md](references/creative-direction-prompt.md) for the copy/paste prompt used by the calling LLM.

## Wire the selected direction

Create a versioned template through `canvnah_create_template` with `rendererKey: "layout"` and a `layout` object. The renderer consumes the object and does not execute arbitrary agent-authored markup.

Template authoring is an advanced administration action. Production media still uses the semantic `nocanva_*` draft → review → approval → render lifecycle; do not send coordinates or Puck data to draft tools.

```json
{
  "id": "evidence-grid",
  "brandId": "blindspot",
  "name": "Evidence grid",
  "description": "A hard-edged evidence poster with a split image and oversized claim.",
  "rendererKey": "layout",
  "layout": {
    "family": "grid",
    "mediaPosition": "left",
    "alignment": "right",
    "focalRegion": "headline",
    "density": "dense",
    "headlineScale": 1.12,
    "mediaSplit": 0.42,
    "showIndex": true,
    "indexPlacement": "rail",
    "signature": "rail"
  }
}
```

Available layout controls are deliberately bounded: `family` (`statement`, `signal`, `bloom`, `split`, `grid`), `mediaPosition` (`auto`, `none`, `top`, `bottom`, `left`, `right`, `full-bleed`), `alignment`, `focalRegion`, `density`, `headlineScale` (0.75–1.5), `mediaSplit` (0.25–0.75), `showIndex`, `indexPlacement`, and `signature`.

## Variation contract

When showing alternatives, change at least three structural dimensions across the set: family, media/content reading order, focal region, media position, split ratio, alignment, density, or headline geometry. Changing only hue or font is a duplicate.

Derive a stable direction seed from `brandId + templateId + format + content fingerprint + direction index` when selecting bounded alternatives. Never use timestamps, `Math.random()`, random decoration, or generated filler copy to create variety.

Keep brand colors, safe areas, required content, readability, and the family signature invariant. For carousels, vary slide density intentionally while preserving the same template version and visual language.

## Review loop

After creating or updating the template:

1. Call `canvnah_review_template` in portrait and square when both formats are supported.
2. Inspect the returned PNG, not only the mechanical verdict.
3. Fix copy, layout parameters, media focal point, or the family when hierarchy, wrapping, crop, or thumbnail recognition is weak.
4. Use the normal NoCanva draft → review → approval → render lifecycle for production media.

The renderer checks canvas bounds, clipped regions, collapsed header/footer, exact dimensions, font readiness, and repeated PNG hashes. Those checks establish reproducibility and mechanical safety; they do not establish aesthetic quality.

Read [references/layout-math.md](references/layout-math.md) for the renderer geometry and fit equations.
