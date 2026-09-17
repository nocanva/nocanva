# Concept sheet — OLIPOP Classic Grape

## Shared production contract

- Audience: adults considering a nostalgic grape soda alternative.
- Objective: meet a polished consumer-campaign bar while preserving package and nutrition fidelity.
- Source pixels: official current Classic Grape packaging, gallery imagery, and nutrition facts only.
- Generated imagery: environments, fruit still life, liquid, texture, light, and decorative forms only. Never redraw the can, label, certification, or nutrition panel.
- Required formats: 4:5 primary and 1:1 adaptation.
- Required editable controls: packshot, crop, scale and rotation, shadow, ingredient positions, headline path, nutrition values, CTA, and palette.

## OL-01 — Grape, grown up

### Argument

Nostalgic grape flavor can feel playful and sophisticated at the same time.

### Copy hierarchy

1. **Grape, grown up.**
2. Sweet-tart concord grape juice with lime.
3. `Classic Grape · OLIPOP`

### Composition

- One real can stands oversized on a curved plum-colored studio surface.
- A controlled grape-and-lime still life frames, but never covers, the label.
- Headline follows one broad arc behind the can; the product breaks the type plane.
- Dense color, believable condensation and shadow, and small deterministic legal/brand finishing.

### Asset plan

- Official current packshot.
- Optional official lifestyle crop.
- Generated studio environment and fruit permitted only after visual verification that they do not alter the product.

### Fidelity and rejection rules

- Label text, can geometry, flavor identity, and nutrition callouts must stay exact.
- Do not add health halos, invented ingredients, or unsupported functional claims.
- Reject if the can looks pasted on, the label is partly generated, or the fruit overwhelms the product.

### Scene primitives exposed

`textPath`, `productImage`, `surface`, `fruitImage`, `shadow`, `condensationOverlay`, `logo`, `safeArea`

## OL-02 — Read the can

### Argument

The current nutrition facts can carry a graphic product story without an unsupported comparison.

### Copy hierarchy

1. **Read the can.**
2. `50 calories · 9g fiber · 5g total sugars · 1g added sugar`
3. Per 355mL can, with a clear official-source qualifier.

### Composition

- A real can sits at the intersection of four dimensional typographic values.
- Each value behaves like a physical sign or plinth rather than a flat dashboard tile.
- A compact official nutrition-panel crop provides verification without becoming the focal point.
- Cream, grape, lime, and deep ink palette tied to the current package.

### Asset plan

- Official current packshot.
- Official nutrition-panel image or verified deterministic transcription.
- Generated depth surfaces and lighting permitted.

### Fidelity and rejection rules

- Values, units, serving basis, and product version must exactly match the current official page.
- Do not infer comparative superiority or a health outcome.
- Reject if it reads like a clinical nutrition chart, hides the serving basis, or cannot be updated as one structured fact group.

### Scene primitives exposed

`text`, `factGroup`, `productImage`, `plinth`, `nutritionCrop`, `shadow`, `citation`, `safeArea`

## OL-03 — Concord grape, kissed with lime

### Argument

The official flavor description becomes a rich ingredient-led visual world.

### Copy hierarchy

1. **Concord grape, kissed with lime.**
2. Sweet-tart and refrigerated.
3. `Classic Grape · OLIPOP`

### Composition

- The real can is suspended inside a deep purple ingredient world with one lime-green light edge.
- Grapes and lime form a deliberate directional sweep; they are atmosphere and flavor cues, not quantity claims.
- The can remains upright and fully readable while overlapping the headline slightly.
- More editorial and cinematic than OL-01, with less copy and stronger depth.

### Asset plan

- Official current packshot.
- Generated or licensed grape, lime, liquid, and environmental elements.
- Official mark if separate from the packshot.

### Fidelity and rejection rules

- Do not imply whole-fruit quantities, fresh-pressed production, or ingredient effects.
- Keep generated elements physically separate from label pixels.
- Reject if it resembles a different flavor, if liquid crosses the label, or if the environment makes the real can look synthetic.

### Scene primitives exposed

`text`, `productImage`, `ingredientImage`, `particleField`, `lightField`, `shadow`, `mask`, `logo`, `safeArea`
