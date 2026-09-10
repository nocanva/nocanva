import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const output = process.env.NOCANVA_PRODUCT_FIXTURE_IMAGE ?? "/tmp/nocanva-product-v6.png";
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, CANVNAH_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-product-layout-fixture", version: "0.4.0" });

function structured(result) {
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

try {
  await client.connect(transport);
  const templates = structured(await client.callTool({ name: "nocanva_list_templates", arguments: { brandId: "blindspot" } }));
  assert.ok(templates.templates.some((template) => template.id === "product" && template.version === 6));

  const validJpeg = await readFile(new URL("../benchmarks/assets/blindspot-DaSSoEnyxws-frame.jpg", import.meta.url));
  const truncatedJpeg = validJpeg.subarray(0, Math.floor(validJpeg.length * .65));
  const rejected = await client.callTool({ name: "nocanva_upload_asset", arguments: { name: "Corrupt JPEG rejection fixture", mimeType: "image/jpeg", base64: truncatedJpeg.toString("base64") } });
  assert.equal(rejected.isError, true);
  assert.match(rejected.content.find((item) => item.type === "text")?.text ?? "", /strict pixel decoding failed/);

  const bytes = await readFile(new URL("../benchmarks/assets/blindspot-home-product.png", import.meta.url));
  const expectedSha256 = createHash("sha256").update(bytes).digest("hex");
  const uploaded = structured(await client.callTool({ name: "nocanva_upload_asset", arguments: { name: "Product v6 screenshot fixture", mimeType: "image/png", base64: bytes.toString("base64"), expectedSha256 } }));
  assert.equal(uploaded.asset.sha256, expectedSha256);
  const created = structured(await client.callTool({ name: "nocanva_create_draft", arguments: {
    brandId: "blindspot", compositionId: "product", format: "portrait", prompt: "Verify transform-free screenshot rendering and a visible CTA.",
    content: {
      eyebrow: "PRODUCT UPDATE",
      headline: "Send a public Reel for a context check.",
      support: "The real interface remains upright, readable, and visually subordinate to the claim.",
      cta: "DM a reel to @blindspot.buzz",
      visualDirection: "interface",
      image: { assetId: uploaded.asset.id, alt: "Blindspot product screen", fit: "contain", focalPoint: { x: .5, y: .5 }, zoom: 1.15, frame: "browser" },
    },
  } }));
  assert.equal(created.draft.templateVersionId, "product@6");

  const reviewResult = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, notes: "Fixture review only; do not approve or publish." } });
  const reviewed = structured(reviewResult);
  const failed = reviewed.review.checks.filter((check) => !check.passed);
  assert.deepEqual(failed, [], JSON.stringify(failed));
  assert.match(reviewed.review.checks.find((check) => check.id === "structure").detail, /every supplied semantic field/);
  const image = reviewResult.content.find((item) => item.type === "image");
  assert.ok(image?.data);
  await writeFile(output, Buffer.from(image.data, "base64"));
  await client.callTool({ name: "nocanva_archive_draft", arguments: { draftId: created.draft.id, archived: true } });
  process.stdout.write(`${JSON.stringify({ draftId: created.draft.id, templateVersionId: created.draft.templateVersionId, sha256: reviewed.review.sha256, output }, null, 2)}\n`);
} finally {
  await client.close();
}
