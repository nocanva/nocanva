import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultPostPayload, formats, parsePostPayload, posterLayoutSchema, renderFilename, templateCreateSchema } from "../lib/media.ts";
import { compositions, compositionFromTemplateId, creativeContentWarnings, recentCompositionWarnings, visualReviewRubric } from "../lib/compositions.ts";

test("accepts the default structured payload", () => {
  assert.deepEqual(parsePostPayload(defaultPostPayload), defaultPostPayload);
  assert.deepEqual(formats.portrait, { id: "portrait", label: "4:5", width: 1080, height: 1350 });
});

test("rejects content that exceeds template limits", () => {
  assert.throws(() => parsePostPayload({
    ...defaultPostPayload,
    content: { ...defaultPostPayload.content, headline: "x".repeat(85) },
  }));
});

test("creates stable safe filenames", () => {
  assert.equal(renderFilename(defaultPostPayload), "blindspot-a-screenshot-is-a-claim-not-proof-portrait.png");
});

test("accepts deterministic image crop instructions and rejects drift", () => {
  const payload = parsePostPayload({ ...defaultPostPayload, content: { ...defaultPostPayload.content, image: { assetId: "123e4567-e89b-12d3-a456-426614174000", alt: "Product screen", fit: "cover", focalPoint: { x: 0.25, y: 0.75 }, zoom: 1.4 } } });
  assert.equal(payload.content.image.zoom, 1.4);
  assert.throws(() => parsePostPayload({ ...payload, content: { ...payload.content, image: { ...payload.content.image, zoom: 3.1 } } }));
  assert.throws(() => parsePostPayload({ ...payload, content: { ...payload.content, image: { ...payload.content.image, focalPoint: { x: -0.1, y: .5 } } } }));
});

test("exposes six semantic compositions and the fixed visual review rubric", () => {
  assert.deepEqual(Object.keys(compositions), ["claim", "real_but", "receipt", "whats_missing", "product", "explainer"]);
  assert.equal(compositionFromTemplateId("real-but"), "real_but");
  assert.equal(visualReviewRubric.length, 8);
  assert.match(recentCompositionWarnings([{ compositionId: "claim" }], "claim")[0], /previous three/);
});

test("flags generic creative copy and anonymous evidence", () => {
  const warnings = creativeContentWarnings({ headline: "Three checks. Better context.", support: "Read the source.", evidence: { source: "Verified source" } });
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /generic/);
  assert.match(warnings[1], /marketing adjective/);
  assert.match(warnings[2], /primary source/);
});

test("keeps the Blindspot benchmark and approved visual references measurable", async () => {
  const benchmark = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1.json", import.meta.url), "utf8"));
  const references = JSON.parse(await readFile(new URL("../benchmarks/blindspot-references.json", import.meta.url), "utf8"));
  assert.equal(benchmark.tasks.length, 20);
  assert.equal(benchmark.success.publishableWithoutDesignEditsPercent, 70);
  assert.equal(benchmark.success.medianHumanSecondsMaximum, 120);
  assert.ok(references.references.length <= references.maximumApproved);
  if (references.references.length < references.minimumApproved) assert.match(references.status, /awaiting real Blindspot source material/);
  assert.equal(references.qaCandidates.length, 5);
  assert.ok([...references.references, ...references.qaCandidates].every((reference) => reference.width === 1080 && reference.height === 1350 && /^[a-f0-9]{64}$/.test(reference.sha256)));
  assert.ok(references.qaCandidates.every((reference) => reference.templateVersionId.endsWith("@2")));
});

test("accepts bounded HTML/CSS layout templates and rejects incomplete generic layouts", () => {
  const layout = posterLayoutSchema.parse({ family: "grid", mediaPosition: "left", alignment: "right", headlineScale: 1.12, mediaSplit: .42, signature: "rail" });
  assert.equal(layout.family, "grid");
  assert.equal(layout.mediaSplit, .42);
  assert.throws(() => templateCreateSchema.parse({ id: "grid", brandId: "blindspot", name: "Evidence grid", description: "A split evidence poster.", rendererKey: "layout" }));
  assert.doesNotThrow(() => templateCreateSchema.parse({ id: "grid", brandId: "blindspot", name: "Evidence grid", description: "A split evidence poster.", rendererKey: "layout", layout }));
});
