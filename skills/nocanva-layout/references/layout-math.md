# NoCanva layout math

## Canonical canvas

```text
portrait = 1080 × 1350
square   = 1080 × 1080
```

The preview may scale, but export mode must use the canonical pixel dimensions.

## Safe rectangle

NoCanva’s brand safe area is a pixel token bounded to 40–140px; the default is 64px.

```text
safeRect.x      = safeAreaPx
safeRect.y      = safeAreaPx
safeRect.width  = canvasWidth  - 2 × safeAreaPx
safeRect.height = canvasHeight - 2 × safeAreaPx
```

## Media crop

Image focal point is normalized and deterministic:

```text
object-position = focalX × 100% focalY × 100%
transform       = scale(zoom)
0 ≤ focalX ≤ 1
0 ≤ focalY ≤ 1
1 ≤ zoom ≤ 3
```

## Split layouts

```text
mediaWidth = round(safeRect.width × mediaSplit)
textWidth  = safeRect.width - mediaWidth - gapPx
```

`mediaSplit` is bounded to 0.25–0.75. Use it only when the selected family supports a split.

## Copy fit

The legacy baseline accepts `eyebrow ≤ 28`, `headline ≤ 84`, and `support ≤ 150` characters. Treat these as template defaults, not universal truth.

```text
estimatedLines  = ceil(characterCount / estimatedCharsPerLine)
estimatedHeight = estimatedLines × lineHeightPx + blockMargins
requiredHeight  = headerHeight + mediaHeight + estimatedHeight + footerHeight
```

If `requiredHeight > safeRect.height`, shorten the copy, change the split, or choose another family. Never hide overflow to force a pass.

## Hierarchy

Use these as starting constraints:

```text
headlineSize ≥ 2.5 × bodySize
relatedGap   < unrelatedGap
one focal region per poster
```

Make the focal region dominant with at least two signals: scale + isolation, scale + contrast, or position + whitespace.

## Deterministic variation

```text
seed = hash(brandId + "|" + templateId + "|" + format + "|" + contentFingerprint + "|" + directionIndex)
```

Use the seed only to select from bounded named alternatives. Do not mutate brand tokens, safe areas, required content, or readability gates.

## Mechanical predicates

For each `[data-render-region]`, with a 1px tolerance:

```text
inside = left ≥ root.left - 1
      ∧ top ≥ root.top - 1
      ∧ right ≤ root.right + 1
      ∧ bottom ≤ root.bottom + 1
```

If a region uses clipping, flag overflow when `scrollWidth > clientWidth + 1` or `scrollHeight > clientHeight + 1`. Treat a brand header/footer below 1% of canvas height as collapsed.
