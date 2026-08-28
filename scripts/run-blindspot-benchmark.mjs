import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const rootUrl = new URL("../", import.meta.url);
const root = fileURLToPath(rootUrl);
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const outputDirectory = fileURLToPath(new URL("../outputs/blindspot-benchmark-v1/", import.meta.url));
const manifestPath = `${outputDirectory}manifest.json`;
const qualityReviewPath = `${outputDirectory}quality-reviews.json`;
const resultsPath = `${outputDirectory}results.json`;
const benchmark = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1.json", import.meta.url), "utf8"));
const fixture = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1-cases.json", import.meta.url), "utf8"));
const taskById = new Map(benchmark.tasks.map((task) => [task.id, task]));
const caseById = new Map(fixture.cases.map((entry) => [entry.id, entry]));
const compositionTemplateIds = { claim: "claim", real_but: "real-but", receipt: "receipt", whats_missing: "whats-missing", product: "product", explainer: "explainer" };
const rubricKeys = ["hookUnderOneSecond", "clearHierarchy", "phoneReadable", "textDensityAcceptable", "mediaCropCorrect", "unmistakablyOnBrand", "professionallyDesigned", "distinctFromRecentPosts"];
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, NOCANVA_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-blindspot-benchmark", version: "1.0.0" });

function structured(result) {
  if (result.isError) throw new Error(result.content?.map((item) => item.type === "text" ? item.text : "").filter(Boolean).join("\n") || "NoCanva tool call failed.");
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) { return structured(await client.callTool({ name, arguments: args })); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function absoluteUrl(value) { return new URL(value, baseUrl).toString(); }

function assertFixture() {
  assert.equal(caseById.size, benchmark.tasks.length, "The concrete benchmark must contain exactly one case per task.");
  assert.deepEqual([...caseById.keys()].sort(), [...taskById.keys()].sort(), "Concrete benchmark case IDs must match blindspot-v1.json.");
  for (const task of benchmark.tasks) {
    const entry = caseById.get(task.id);
    assert.ok(entry.evidence?.length, `${task.id} needs at least one evidence-ledger entry.`);
    for (const evidenceId of entry.evidence) assert.ok(fixture.evidenceLedger.some((item) => item.id === evidenceId), `${task.id} references unknown evidence ${evidenceId}.`);
    if (task.slides) assert.equal(entry.slides?.length, task.slides, `${task.id} must contain ${task.slides} slides.`);
    else assert.ok(entry.content && !entry.slides, `${task.id} must contain one post payload.`);
    if (entry.asset) assert.ok(fixture.assets[entry.asset], `${task.id} references unknown asset ${entry.asset}.`);
  }
}

async function uploadAssets() {
  const uploaded = {};
  for (const [assetKey, asset] of Object.entries(fixture.assets)) {
    const bytes = await readFile(new URL(`../${asset.path}`, import.meta.url));
    assert.equal(sha256(bytes), asset.sha256, `${assetKey} bytes changed; inspect the source and update its pinned hash deliberately.`);
    const result = await call("nocanva_upload_asset", { name: asset.name, mimeType: asset.mimeType, base64: bytes.toString("base64") });
    uploaded[assetKey] = result.asset;
  }
  return uploaded;
}

function withAsset(content, asset) {
  if (!content.image) return content;
  assert.ok(asset, "Image content requires a fixture asset.");
  return { ...content, image: { ...content.image, assetId: asset.id } };
}

function promptFor(task, entry) {
  const sources = entry.evidence.map((id) => fixture.evidenceLedger.find((item) => item.id === id).source).join(" · ");
  return `Benchmark ${task.id}: ${task.brief} Use only verified evidence from ${sources}`.slice(0, 500);
}

async function archivePrevious() {
  try {
    const previous = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const item of previous.items ?? []) {
      if (item.kind === "carousel" && item.carouselId) await call("nocanva_archive_carousel", { carouselId: item.carouselId, archived: true });
      if (item.kind === "draft" && item.draftId) await call("nocanva_archive_draft", { draftId: item.draftId, archived: true });
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function generate() {
  assertFixture();
  await mkdir(outputDirectory, { recursive: true });
  await archivePrevious();
  const brand = await call("nocanva_get_brand", { brandId: "blindspot" });
  assert.equal(brand.brand.id, "blindspot");
  const uploaded = await uploadAssets();
  const items = [];

  for (const task of benchmark.tasks) {
    const entry = caseById.get(task.id);
    const asset = entry.asset ? uploaded[entry.asset] : undefined;
    const catalog = await call("nocanva_list_compositions", { brandId: "blindspot", candidate: task.composition, recentLimit: 20 });
    const requiredComposition = catalog.compositions.find((item) => item.id === task.composition);
    assert.ok(requiredComposition, `Composition ${task.composition} is unavailable.`);

    if (entry.slides) {
      const slides = entry.slides.map((slide) => withAsset(slide, asset));
      const created = await call("nocanva_create_carousel", {
        brandId: "blindspot", templateId: compositionTemplateIds[task.composition], format: task.format, slides,
        prompt: promptFor(task, entry),
      });
      const raw = await client.callTool({ name: "nocanva_review_carousel", arguments: { carouselId: created.carousel.id, reviewer: "agent:blindspot-benchmark", notes: "Mechanical review complete. Full-slide visual review pending." } });
      const reviewed = structured(raw);
      const images = raw.content.filter((item) => item.type === "image");
      assert.equal(images.length, task.slides, `${task.id} review did not return every slide PNG.`);
      assert.equal(reviewed.review.status, "passed", `${task.id} failed mechanical review.`);
      const reviewPaths = [];
      for (let index = 0; index < images.length; index += 1) {
        const reviewPath = `${outputDirectory}${task.id}-slide-${index + 1}-review.png`;
        await writeFile(reviewPath, Buffer.from(images[index].data, "base64"));
        reviewPaths.push(reviewPath);
      }
      items.push({ id: task.id, kind: "carousel", category: task.category, composition: task.composition, format: task.format, evidence: entry.evidence, asset: entry.asset ?? null, compositionWarnings: catalog.warnings, carouselId: reviewed.carousel.id, currentRevision: reviewed.carousel.currentRevision, templateVersionId: reviewed.carousel.templateVersionId, workspaceUrl: reviewed.carousel.workspaceUrl, reviewId: reviewed.review.id, mechanicalPassed: reviewed.review.status === "passed", mechanicalChecks: reviewed.review.checks, contentWarnings: [], artifacts: reviewed.review.artifacts, reviewPaths });
      continue;
    }

    const created = await call("nocanva_create_draft", {
      brandId: "blindspot", compositionId: task.composition, format: task.format, content: withAsset(entry.content, asset),
      prompt: promptFor(task, entry),
    });
    const raw = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, reviewer: "agent:blindspot-benchmark", notes: "Mechanical review complete. Eight-part visual review pending." } });
    const reviewed = structured(raw);
    const image = raw.content.find((item) => item.type === "image");
    assert.ok(image && image.type === "image", `${task.id} review did not return a PNG.`);
    const reviewPath = `${outputDirectory}${task.id}-review.png`;
    await writeFile(reviewPath, Buffer.from(image.data, "base64"));
    items.push({ id: task.id, kind: "draft", category: task.category, composition: task.composition, format: task.format, evidence: entry.evidence, asset: entry.asset ?? null, compositionWarnings: catalog.warnings, draftId: reviewed.draft.id, currentRevision: reviewed.draft.currentRevision, templateVersionId: reviewed.draft.templateVersionId, workspaceUrl: reviewed.draft.workspaceUrl, reviewId: reviewed.review.id, mechanicalPassed: reviewed.review.passed, mechanicalChecks: reviewed.review.checks, contentWarnings: reviewed.contentWarnings, artifacts: [{ width: reviewed.review.width, height: reviewed.review.height, sha256: reviewed.review.sha256 }], reviewPaths: [reviewPath] });
  }

  const manifest = { benchmark: benchmark.name, generatedAt: new Date().toISOString(), status: "mechanically-reviewed", baseUrl, evidenceLedger: fixture.evidenceLedger, assets: uploaded, items };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(resultsPath, { force: true });
  process.stdout.write(`${JSON.stringify({ manifestPath, tasks: items.length, reviewPngs: items.reduce((total, item) => total + item.reviewPaths.length, 0), mechanicalFailures: items.filter((item) => !item.mechanicalPassed).map((item) => item.id), contentWarningTasks: items.filter((item) => item.contentWarnings.length).map((item) => item.id) }, null, 2)}\n`);
}

function validateVisualReview(item, review) {
  assert.ok(review, `Missing visual review for ${item.id}.`);
  assert.equal(typeof review.publishableWithoutDesignEdits, "boolean", `${item.id} needs a publishableWithoutDesignEdits decision.`);
  assert.equal(Number.isFinite(review.humanEditSeconds) && review.humanEditSeconds >= 0, true, `${item.id} needs non-negative humanEditSeconds.`);
  assert.equal(review.notes?.trim().length > 0, true, `${item.id} needs visual review notes.`);
  const slideReviews = item.kind === "carousel" ? review.slides : [review];
  assert.equal(slideReviews?.length, item.reviewPaths.length, `${item.id} needs one visual rubric per PNG.`);
  for (const [index, slideReview] of slideReviews.entries()) {
    assert.equal(slideReview.notes?.trim().length > 0, true, `${item.id} slide ${index + 1} needs notes.`);
    for (const key of rubricKeys) assert.equal(typeof slideReview[key], "boolean", `${item.id} slide ${index + 1} needs ${key}.`);
  }
  const allRubricPassed = slideReviews.every((slideReview) => rubricKeys.every((key) => slideReview[key] === true));
  if (review.publishableWithoutDesignEdits) {
    assert.equal(item.mechanicalPassed, true, `${item.id} cannot be publishable after a mechanical failure.`);
    assert.deepEqual(item.contentWarnings, [], `${item.id} cannot be publishable with content warnings.`);
    assert.equal(allRubricPassed, true, `${item.id} is marked publishable but failed a visual rubric item.`);
  }
  return { slideReviews, allRubricPassed };
}

async function downloadArtifact(url, outputPath) {
  const response = await fetch(absoluteUrl(url));
  assert.equal(response.ok, true, `Could not download ${url}.`);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

async function finalize() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const quality = JSON.parse(await readFile(qualityReviewPath, "utf8"));
  assert.equal(quality.manifestGeneratedAt, manifest.generatedAt, "quality-reviews.json belongs to a different benchmark run. Review the current PNGs and copy manifest.generatedAt exactly.");
  assert.equal(Number.isFinite(Date.parse(quality.reviewedAt)) && Date.parse(quality.reviewedAt) >= Date.parse(manifest.generatedAt), true, "quality-reviews.json needs a reviewedAt timestamp after the current benchmark was generated.");
  assert.equal(quality.reviewedBy?.trim().length > 0, true, "quality-reviews.json must name the visual reviewer.");
  const results = [];

  for (const item of manifest.items) {
    const review = quality.results?.[item.id];
    const { slideReviews } = validateVisualReview(item, review);
    const aggregateRubric = Object.fromEntries(rubricKeys.map((key) => [key, slideReviews.every((slideReview) => slideReview[key] === true)]));
    const result = { id: item.id, composition: item.composition, format: item.format, publishableWithoutDesignEdits: review.publishableWithoutDesignEdits, humanEditSeconds: review.humanEditSeconds, reviewer: quality.reviewedBy, notes: review.notes, mechanicalPassed: item.mechanicalPassed, contentWarnings: item.contentWarnings, rubric: aggregateRubric, slideRubrics: item.kind === "carousel" ? slideReviews : undefined, artifacts: [], workspaceUrl: item.workspaceUrl, templateVersionId: item.templateVersionId };

    if (!review.publishableWithoutDesignEdits) {
      if (item.kind === "carousel") await call("nocanva_approve_carousel", { carouselId: item.carouselId, expectedRevision: item.currentRevision, decision: "rejected", actor: quality.reviewedBy, notes: review.notes });
      else await call("nocanva_approve_draft", { draftId: item.draftId, expectedRevision: item.currentRevision, decision: "rejected", actor: quality.reviewedBy, notes: review.notes });
      result.artifacts = item.artifacts.map((artifact, index) => ({ ...artifact, reviewPath: item.reviewPaths[index] }));
      results.push(result);
      continue;
    }

    if (item.kind === "carousel") {
      const approved = await call("nocanva_approve_carousel", { carouselId: item.carouselId, expectedRevision: item.currentRevision, decision: "approved", actor: quality.reviewedBy, notes: review.notes });
      const rendered = await call("nocanva_render_carousel", { carouselId: item.carouselId });
      const inspected = await call("nocanva_get_carousel_render", { renderId: rendered.render.id });
      assert.equal(inspected.render.carouselRevisionId, approved.carousel.revisionId);
      for (const [index, artifact] of inspected.render.artifacts.entries()) {
        const outputPath = `${outputDirectory}${item.id}-slide-${index + 1}.png`;
        await downloadArtifact(artifact.assetUrl, outputPath);
        result.artifacts.push({ ...artifact, outputPath });
      }
      result.renderId = inspected.render.id;
      result.renderWorkspaceUrl = inspected.render.workspaceUrl;
      result.zipUrl = inspected.render.zipUrl;
      results.push(result);
      continue;
    }

    const current = await call("nocanva_get_draft", { draftId: item.draftId });
    assert.equal(current.draft.currentRevision, item.currentRevision);
    const approved = await call("nocanva_approve_draft", { draftId: item.draftId, expectedRevision: item.currentRevision, decision: "approved", actor: quality.reviewedBy, notes: review.notes });
    const rendered = await call("nocanva_render", { draftId: item.draftId });
    const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
    assert.equal(inspected.render.draftRevisionId, approved.draft.revisionId);
    assert.equal(inspected.render.sha256, item.artifacts[0].sha256);
    const outputPath = `${outputDirectory}${item.id}.${extname(new URL(absoluteUrl(inspected.render.assetUrl)).pathname).slice(1) || "png"}`;
    await downloadArtifact(inspected.render.assetUrl, outputPath);
    result.artifacts.push({ width: inspected.render.width, height: inspected.render.height, sha256: inspected.render.sha256, assetUrl: inspected.render.assetUrl, outputPath });
    result.renderId = inspected.render.id;
    result.renderWorkspaceUrl = inspected.render.workspaceUrl;
    results.push(result);
  }

  const completed = { benchmark: benchmark.name, finalizedAt: new Date().toISOString(), reviewedBy: quality.reviewedBy, results };
  await writeFile(resultsPath, `${JSON.stringify(completed, null, 2)}\n`);
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, status: "finalized", finalizedAt: completed.finalizedAt, qualityReviewPath, resultsPath }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ resultsPath, publishable: results.filter((item) => item.publishableWithoutDesignEdits).length, tasks: results.length, renders: results.filter((item) => item.renderId).length }, null, 2)}\n`);
}

try {
  await client.connect(transport);
  if (process.argv.includes("--finalize")) await finalize();
  else await generate();
} finally {
  await client.close();
}
