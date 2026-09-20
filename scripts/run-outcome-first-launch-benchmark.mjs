import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const recordUrl = new URL("../benchmarks/creative-quality-v1/launch-runs/blindspot.json", import.meta.url);
const indexUrl = new URL("../benchmarks/creative-quality-v1/launch-runs/index.json", import.meta.url);
const artifactDirectory = new URL("../benchmarks/creative-quality-v1/launch-runs/artifacts/", import.meta.url);
const reviewImageUrl = new URL("blindspot-review.png", artifactDirectory);
const sourceImageUrl = new URL("../benchmarks/assets/blindspot-home-product.png", import.meta.url);
const sourceSha256 = "ba5e2cfce8358e1952dabf369c80fcf622e16a08a3ecce1cf7b88c5da388b14f";
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, NOCANVA_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-outcome-first-launch-benchmark", version: "1.0.0" });

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function now() { return new Date().toISOString(); }
function structured(result) {
  if (result.isError) throw new Error(result.content?.map((item) => item.type === "text" ? item.text : "").filter(Boolean).join("\n") || "NoCanva tool call failed.");
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}
async function call(name, args = {}) { return structured(await client.callTool({ name, arguments: args })); }
async function readJson(url) { return JSON.parse(await readFile(url, "utf8")); }
async function writeJson(url, value) { await writeFile(url, `${JSON.stringify(value, null, 2)}\n`); }
async function setIndexStatus(status) {
  const index = await readJson(indexUrl);
  const entry = index.runs.find((run) => run.runId === "BS-LAUNCH-01");
  assert.ok(entry);
  entry.status = status;
  await writeJson(indexUrl, index);
}

async function generate() {
  const record = await readJson(recordUrl);
  assert.ok(["planned", "reviewed", "rejected"].includes(record.status), `Cannot generate from status ${record.status}.`);
  if (record.lifecycle.draftId) await call("nocanva_archive_draft", { draftId: record.lifecycle.draftId, archived: true });
  const sourceBytes = await readFile(sourceImageUrl);
  assert.equal(sha256(sourceBytes), sourceSha256, "The pinned Blindspot source image changed.");
  const uploaded = await call("nocanva_upload_asset", { name: "Blindspot public link checker", mimeType: "image/png", base64: sourceBytes.toString("base64"), expectedSha256: sourceSha256 });
  const catalog = await call("nocanva_list_compositions", { brandId: "blindspot", candidate: "product", recentLimit: 20 });
  assert.ok(catalog.storyIntents.some((intent) => intent.id === "product_demonstration" && intent.compositionId === "product"));
  const startedAt = now();
  const created = await call("nocanva_create_draft", {
    brandId: "blindspot",
    compositionId: "product",
    format: "portrait",
    content: {
      eyebrow: "BLINDSPOT / PRODUCT",
      headline: "Paste a post. Get the receipts.",
      support: "Blindspot returns the short answer first, then keeps the checked claims and cited sources underneath.",
      cta: "Paste a public post",
      backgroundStyle: "ink",
      image: { assetId: uploaded.asset.id, alt: "Blindspot homepage with its public-link checker and cited-report preview", fit: "cover", focalPoint: { x: 0.5, y: 0.38 }, zoom: 1.05, frame: "browser" }
    },
    prompt: "Outcome-first launch benchmark: demonstrate the verified public-link-to-cited-report workflow using the real Blindspot product screenshot."
  });
  const raw = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, reviewer: "agent:outcome-first-benchmark", notes: "Mechanical review complete; eight-question visual inspection follows." } });
  const reviewed = structured(raw);
  const image = raw.content.find((item) => item.type === "image");
  assert.ok(image && image.type === "image", "Draft review did not return a PNG.");
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(reviewImageUrl, Buffer.from(image.data, "base64"));
  const reviewedAt = now();
  record.status = "reviewed";
  record.payload = reviewed.draft.payload;
  const reviewId = reviewed.review.id ?? reviewed.draft.review?.id;
  assert.ok(reviewId, "Reviewed draft did not expose its persisted review ID.");
  record.lifecycle = { kind: "draft", draftId: reviewed.draft.id, carouselId: null, revision: reviewed.draft.currentRevision, reviewId, renderId: null };
  record.process = { ...record.process, startedAt, firstReviewedAt: reviewedAt, firstPublishableAt: null, agentReviewIterations: 1, blockers: [] };
  record.review = { ...record.review, verdict: "pending", contentWarnings: [...(reviewed.contentWarnings ?? []), ...(reviewed.creativeReview?.warnings ?? [])], visualAnswers: [], assetFidelity: "pending", notes: ["Visual review PNG: benchmarks/creative-quality-v1/launch-runs/artifacts/blindspot-review.png"] };
  record.delivery = { ...record.delivery, workspaceUrl: reviewed.draft.workspaceUrl, dimensions: { width: reviewed.review.width, height: reviewed.review.height }, templateVersionId: reviewed.draft.templateVersionId, sha256: [reviewed.review.sha256] };
  await writeJson(recordUrl, record);
  await setIndexStatus("reviewed");
  process.stdout.write(`${JSON.stringify({ record: fileURLToPath(recordUrl), reviewImage: fileURLToPath(reviewImageUrl), draftId: reviewed.draft.id, revision: reviewed.draft.currentRevision, contentWarnings: record.review.contentWarnings, rubric: reviewed.visualReviewRubric }, null, 2)}\n`);
}

async function finalize() {
  const record = await readJson(recordUrl);
  assert.equal(record.status, "reviewed");
  assert.equal(record.review.visualAnswers.length, 8, "Record all eight visual-review answers before finalizing.");
  assert.ok(record.review.visualAnswers.every((answer) => answer.answer === "yes"), "Every visual-review answer must pass before approval.");
  assert.deepEqual(record.review.contentWarnings, [], "Resolve every content or similarity warning before approval.");
  const approved = await call("nocanva_approve_draft", { draftId: record.lifecycle.draftId, expectedRevision: record.lifecycle.revision, decision: "approved", actor: "agent:outcome-first-benchmark", notes: "All eight visual-review questions passed; claim and source-asset fidelity verified." });
  const rendered = await call("nocanva_render", { draftId: record.lifecycle.draftId });
  const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
  assert.equal(inspected.render.draftRevisionId, approved.draft.revisionId);
  assert.equal(inspected.render.sha256, record.delivery.sha256[0]);
  record.status = "rendered";
  record.lifecycle.renderId = inspected.render.id;
  record.process.firstPublishableAt = now();
  record.review.verdict = "publishable";
  record.review.assetFidelity = "pass";
  record.delivery = { ...record.delivery, renderUrl: inspected.render.workspaceUrl, assetUrls: [inspected.render.assetUrl], dimensions: { width: inspected.render.width, height: inspected.render.height }, templateVersionId: inspected.render.templateVersionId, sha256: [inspected.render.sha256] };
  await writeJson(recordUrl, record);
  await setIndexStatus("rendered");
  process.stdout.write(`${JSON.stringify({ renderId: inspected.render.id, workspaceUrl: inspected.render.workspaceUrl, assetUrl: inspected.render.assetUrl, sha256: inspected.render.sha256 }, null, 2)}\n`);
}

try {
  await client.connect(transport);
  if (process.argv.includes("--finalize")) await finalize();
  else await generate();
} finally {
  await client.close();
}
