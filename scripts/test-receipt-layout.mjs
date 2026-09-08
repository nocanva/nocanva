import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const output = process.env.NOCANVA_RECEIPT_FIXTURE_IMAGE ?? "/tmp/nocanva-receipt-v6.png";
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, CANVNAH_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-receipt-layout-fixture", version: "0.4.0" });

function structured(result) {
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

try {
  await client.connect(transport);
  const templates = structured(await client.callTool({ name: "nocanva_list_templates", arguments: { brandId: "blindspot" } }));
  assert.ok(templates.templates.some((template) => template.id === "receipt" && template.version === 6));

  const source = new URL("../benchmarks/assets/blindspot-home-product.png", import.meta.url);
  const bytes = await readFile(source);
  const uploaded = structured(await client.callTool({ name: "nocanva_upload_asset", arguments: { name: "Receipt v6 layout fixture", mimeType: "image/png", base64: bytes.toString("base64") } }));
  const inspectedAssetResult = await client.callTool({ name: "nocanva_get_asset", arguments: { assetId: uploaded.asset.id } });
  const inspectedAsset = structured(inspectedAssetResult);
  assert.equal(inspectedAsset.asset.sha256, uploaded.asset.sha256);
  assert.ok(inspectedAssetResult.content.some((item) => item.type === "image" && item.data === bytes.toString("base64")));
  const created = structured(await client.callTool({ name: "nocanva_create_draft", arguments: {
    brandId: "blindspot", compositionId: "receipt", format: "portrait", prompt: "Verify the unobscured Receipt v6 evidence layout.",
    content: {
      eyebrow: "SOURCE CHECK",
      headline: "The source stays whole and the annotation stays outside it.",
      support: "The evidence remains readable before any human approval.",
      visualDirection: "documentary",
      image: { assetId: uploaded.asset.id, alt: "Blindspot product evidence", fit: "contain", focalPoint: { x: .5, y: .5 }, zoom: 1, frame: "browser" },
      evidence: { source: "Blindspot product workspace", detail: "A real repository screenshot used only to exercise the deterministic evidence frame." },
    },
  } }));
  assert.equal(created.draft.templateVersionId, "receipt@6");

  const reviewResult = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, notes: "Fixture review only; do not approve or publish." } });
  const reviewed = structured(reviewResult);
  const failed = reviewed.review.checks.filter((check) => !check.passed);
  assert.deepEqual(failed, [], JSON.stringify(failed));
  const image = reviewResult.content.find((item) => item.type === "image");
  assert.ok(image?.data);
  await writeFile(output, Buffer.from(image.data, "base64"));
  await client.callTool({ name: "nocanva_archive_draft", arguments: { draftId: created.draft.id, archived: true } });
  process.stdout.write(`${JSON.stringify({ draftId: created.draft.id, templateVersionId: created.draft.templateVersionId, sha256: reviewed.review.sha256, output }, null, 2)}\n`);
} finally {
  await client.close();
}
