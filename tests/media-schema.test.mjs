import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultPostPayload, draftLayoutSchema, draftUpdateInputSchema, formats, parsePostPayload, posterLayoutSchema, renderFilename, templateCreateSchema, templates } from "../lib/media.ts";
import { carouselSequenceRole, carouselSequenceSurface, carouselStoryWarnings, chooseVisualDirection, compositionDiversityGuidance, compositionForStoryIntent, compositions, compositionFromTemplateId, creativeContentWarnings, nextVisualDirection, rankVisualDirections, recentCompositionWarnings, storyIntentForComposition, storyIntents, visualDirections, visualFingerprint, visualReviewRubric, visualSimilarityWarnings } from "../lib/compositions.ts";

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

test("preserves template pins unless a revision explicitly upgrades", () => {
  const base = { expectedRevision: 2, payload: defaultPostPayload };
  assert.equal(draftUpdateInputSchema.parse(base).upgradeTemplateVersion, false);
  assert.equal(draftUpdateInputSchema.parse({ ...base, upgradeTemplateVersion: true }).upgradeTemplateVersion, true);
  assert.equal(templates.receipt.version, 7);
  assert.equal(templates.product.version, 6);
});

test("exposes six semantic compositions and the fixed visual review rubric", () => {
  assert.deepEqual(Object.keys(compositions), ["claim", "real_but", "receipt", "whats_missing", "product", "explainer"]);
  assert.equal(compositionFromTemplateId("real-but"), "real_but");
  assert.equal(visualReviewRubric.length, 8);
  assert.match(visualReviewRubric[0], /subject and hook.*under one second/i);
  assert.match(visualReviewRubric[5], /story intent and approved brand/i);
  assert.match(visualReviewRubric[7], /brand continuity/i);
  assert.match(recentCompositionWarnings([{ compositionId: "claim" }], "claim")[0], /previous three/);
  const repeatedSurface = [{ backgroundStyle: "signal_wash" }, { backgroundStyle: "signal_wash" }];
  assert.match(recentCompositionWarnings(repeatedSurface, undefined, undefined, "signal_wash")[0], /change the background/);
  assert.deepEqual(recentCompositionWarnings(repeatedSurface, undefined, undefined, "ink"), []);
});

test("maps outcome-first story intents onto existing semantic compositions without changing payloads", () => {
  assert.deepEqual(Object.keys(storyIntents), ["announcement", "contradiction", "evidence", "omitted_context", "product_demonstration", "feature_education"]);
  assert.equal(compositionForStoryIntent("announcement"), "claim");
  assert.equal(compositionForStoryIntent("product_demonstration"), "product");
  assert.equal(storyIntentForComposition("receipt"), "evidence");
  assert.equal(storyIntentForComposition("explainer"), "feature_education");
  assert.ok(Object.values(storyIntents).every((intent) => intent.requiredProof.length > 10));
  assert.equal("storyIntent" in parsePostPayload({ ...defaultPostPayload, storyIntent: "announcement" }), false);
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
  assert.equal(nextVisualDirection({ compositionId: "claim", content: { headline: "One precise claim" } }, "monument"), "bulletin");
  assert.notEqual(chooseVisualDirection({ compositionId: "whats_missing", content: { headline: "The missing date", image: {} }, sequenceRole: "hook" }), "monument");
  assert.equal(nextVisualDirection({ compositionId: "product", content: { headline: "Public links open a cited report", image: {} } }, "interface"), "documentary");
  assert.equal(nextVisualDirection({ compositionId: "product", content: { headline: "Public links open a cited report" } }, "editorial"), "bulletin");
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
  assert.equal(benchmark.success.publishableWithoutDesignEditsPercent, 90);
  assert.equal(benchmark.success.medianHumanSecondsMaximum, 60);
  assert.ok(references.references.length <= references.maximumApproved);
  if (references.references.length < references.minimumApproved) assert.match(references.status, /awaiting real Blindspot source material/);
  assert.equal(references.qaCandidates.length, 5);
  assert.ok([...references.references, ...references.qaCandidates].every((reference) => reference.width === 1080 && reference.height === 1350 && /^[a-f0-9]{64}$/.test(reference.sha256)));
  assert.ok(references.qaCandidates.every((reference) => reference.templateVersionId.endsWith("@2")));
});

test("defines five outcome-first launch runs and a complete reproducibility contract", async () => {
  const schema = JSON.parse(await readFile(new URL("../benchmarks/creative-quality-v1/launch-runs/schema.json", import.meta.url), "utf8"));
  const index = JSON.parse(await readFile(new URL("../benchmarks/creative-quality-v1/launch-runs/index.json", import.meta.url), "utf8"));
  assert.equal(schema.properties.version.const, 1);
  assert.deepEqual(schema.properties.plan.properties.storyIntent.enum, Object.keys(storyIntents));
  assert.deepEqual(schema.properties.plan.properties.compositionId.enum, Object.keys(compositions));
  assert.ok(schema.required.includes("evidence"));
  assert.ok(schema.required.includes("review"));
  assert.ok(schema.required.includes("delivery"));
  assert.ok(schema.required.includes("lifecycle"));
  assert.equal(index.runs.length, 5);
  assert.deepEqual(index.runs.map((run) => run.product), ["nocanva", "blindspot", "cloudflare-agents-sdk", "framework-laptop-13", "olipop-classic-grape"]);
  const allowedStatuses = schema.properties.status.enum;
  assert.ok(index.runs.every((run) => allowedStatuses.includes(run.status)));
  assert.equal(index.runs.filter((run) => run.status === "source-blocked").length, 4);
  assert.ok(index.runs.every((run) => run.record.endsWith(".json")));
  for (const entry of index.runs) {
    const record = JSON.parse(await readFile(new URL(`../benchmarks/creative-quality-v1/launch-runs/${entry.record}`, import.meta.url), "utf8"));
    assert.equal(record.version, 1);
    assert.equal(record.runId, entry.runId);
    assert.equal(record.product, entry.product);
    assert.equal(record.status, entry.status);
    assert.equal(compositionForStoryIntent(record.plan.storyIntent), record.plan.compositionId);
    assert.ok(record.evidence.length > 0);
    assert.ok(record.evidence.every((item) => item.status === "verified"));
    if (record.status === "source-blocked") {
      assert.equal(record.lifecycle.renderId, null);
      assert.ok(record.process.blockers.length > 0);
    }
    if (record.status === "rendered") {
      assert.ok(record.lifecycle.draftId || record.lifecycle.carouselId);
      assert.ok(record.lifecycle.reviewId);
      assert.ok(record.lifecycle.renderId);
      assert.equal(record.review.visualAnswers.length, 8);
      assert.ok(record.review.visualAnswers.every((answer) => answer.answer === "yes"));
      assert.equal(record.review.verdict, "publishable");
      assert.ok(record.delivery.sha256.every((hash) => /^[a-f0-9]{64}$/.test(hash)));
    }
  }
});

test("accepts bounded HTML/CSS layout templates and rejects incomplete generic layouts", () => {
  const layout = posterLayoutSchema.parse({ family: "grid", mediaPosition: "left", alignment: "right", headlineScale: 1.12, mediaSplit: .42, signature: "rail" });
  assert.equal(layout.family, "grid");
  assert.equal(layout.mediaSplit, .42);
  assert.throws(() => templateCreateSchema.parse({ id: "grid", brandId: "blindspot", name: "Evidence grid", description: "A split evidence poster.", rendererKey: "layout" }));
  assert.doesNotThrow(() => templateCreateSchema.parse({ id: "grid", brandId: "blindspot", name: "Evidence grid", description: "A split evidence poster.", rendererKey: "layout", layout }));
});
