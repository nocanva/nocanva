import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultPostPayload, draftLayoutSchema, formats, parsePostPayload, posterLayoutSchema, renderFilename, templateCreateSchema } from "../lib/media.ts";
import { carouselSequenceRole, carouselSequenceSurface, carouselStoryWarnings, chooseVisualDirection, compositionDiversityGuidance, compositions, compositionFromTemplateId, creativeContentWarnings, rankVisualDirections, recentCompositionWarnings, visualDirections, visualFingerprint, visualReviewRubric, visualSimilarityWarnings } from "../lib/compositions.ts";

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

test("accepts bounded semantic draft layout refinements and rejects freeform drift", () => {
  const layout = draftLayoutSchema.parse({ headlineScale: 1.05, headlineAlignment: "center", density: "airy", compositionPosition: "raised", supportPosition: "lowered" });
  const payload = parsePostPayload({ ...defaultPostPayload, layout });
  assert.deepEqual(payload.layout, layout);
  assert.throws(() => parsePostPayload({ ...defaultPostPayload, layout: { ...layout, headlineScale: 1.5 } }));
  assert.throws(() => parsePostPayload({ ...defaultPostPayload, layout: { ...layout, x: 120 } }));
});

test("exposes six semantic compositions and the fixed visual review rubric", () => {
  assert.deepEqual(Object.keys(compositions), ["claim", "real_but", "receipt", "whats_missing", "product", "explainer"]);
  assert.equal(compositionFromTemplateId("real-but"), "real_but");
  assert.equal(visualReviewRubric.length, 8);
  assert.match(recentCompositionWarnings([{ compositionId: "claim" }], "claim")[0], /previous three/);
});

test("routes semantic content into distinct compatible visual directions", () => {
  assert.deepEqual(Object.keys(visualDirections), ["editorial", "documentary", "bulletin", "field_notes", "monument", "interface"]);
  assert.equal(chooseVisualDirection({ compositionId: "claim", content: { headline: "One precise claim" } }), "monument");
  assert.equal(chooseVisualDirection({ compositionId: "real_but", content: { headline: "The image is real. The date is not.", image: {} } }), "documentary");
  assert.equal(chooseVisualDirection({ compositionId: "product", content: { headline: "Public links open a cited report", image: {} } }), "interface");
  const rerouted = rankVisualDirections({ compositionId: "claim", content: { headline: "One precise claim" }, recent: [
    { visualDirection: "monument" }, { visualDirection: "bulletin" }, { visualDirection: "field_notes" },
  ] });
  assert.equal(rerouted[0].id, "editorial");
  assert.doesNotThrow(() => parsePostPayload({ ...defaultPostPayload, content: { ...defaultPostPayload.content, visualDirection: "bulletin" } }));
  assert.throws(() => parsePostPayload({ ...defaultPostPayload, content: { ...defaultPostPayload.content, visualDirection: "random" } }));
});

test("fingerprints visual silhouettes and flags exact recent repetition", () => {
  const fingerprint = visualFingerprint("claim", { headline: "Name the exact claim", support: "Then inspect the source.", visualDirection: "bulletin" });
  assert.match(fingerprint.key, /claim:bulletin:signal_wash:headline:left:airy:frame/);
  assert.equal(visualSimilarityWarnings([{ visualFingerprint: fingerprint.key }], fingerprint.key).length, 1);
  assert.deepEqual(visualSimilarityWarnings([{ visualFingerprint: "different" }], fingerprint.key), []);
});

test("flags generic creative copy and anonymous evidence", () => {
  const warnings = creativeContentWarnings({ headline: "Three checks. Better context.", support: "Read the source.", evidence: { source: "Verified source" } });
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /generic/);
  assert.match(warnings[1], /marketing adjective/);
  assert.match(warnings[2], /primary source/);
});

test("creates carousel rhythm and feed diversity without new agent layout inputs", () => {
  assert.deepEqual([0, 1, 2, 3].map((index) => carouselSequenceRole(index, 4)), ["hook", "context", "evidence", "close"]);
  assert.deepEqual(["hook", "context", "evidence", "close"].map(carouselSequenceSurface), ["signal_wash", "paper", "ink", "signal_wash"]);
  assert.deepEqual(carouselStoryWarnings([
    { headline: "Name the claim" }, { headline: "Read the source" }, { headline: "Keep the receipt" },
  ]), []);
  assert.match(carouselStoryWarnings([
    { headline: "Check the date", backgroundStyle: "ink" },
    { headline: "Check the source", backgroundStyle: "ink" },
    { headline: "Keep the receipt", backgroundStyle: "ink" },
  ]).join(" "), /same surface.*same headline opening/i);
  const guidance = compositionDiversityGuidance([
    { compositionId: "claim", visualDirection: "bulletin", backgroundStyle: "ink", headline: "Check the date" },
    { compositionId: "receipt", visualDirection: "field_notes", backgroundStyle: "ink", headline: "Read the source" },
    { compositionId: "claim", visualDirection: "monument", backgroundStyle: "paper", headline: "Name the claim" },
  ]);
  assert.deepEqual(guidance.avoidCompositionIds, ["claim", "receipt"]);
  assert.deepEqual(guidance.avoidVisualDirections, ["bulletin", "field_notes", "monument"]);
  assert.deepEqual(guidance.avoidBackgroundStyles, ["ink"]);
  assert.ok(guidance.underusedCompositionIds.includes("product"));
});

test("keeps the Blindspot benchmark and approved visual references measurable", async () => {
  const benchmark = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1.json", import.meta.url), "utf8"));
  const cases = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1-cases.json", import.meta.url), "utf8"));
  const references = JSON.parse(await readFile(new URL("../benchmarks/blindspot-references.json", import.meta.url), "utf8"));
  assert.equal(benchmark.tasks.length, 20);
  assert.deepEqual(cases.cases.map((entry) => entry.id).sort(), benchmark.tasks.map((task) => task.id).sort());
  assert.ok(cases.evidenceLedger.length >= 8);
  assert.ok(Object.values(cases.assets).every((asset) => /^[a-f0-9]{64}$/.test(asset.sha256) && asset.path.startsWith("benchmarks/assets/")));
  for (const task of benchmark.tasks) {
    const benchmarkCase = cases.cases.find((entry) => entry.id === task.id);
    assert.equal(benchmarkCase.slides?.length ?? 1, task.slides ?? 1);
    assert.ok(benchmarkCase.evidence.length > 0);
  }
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
