import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.env.NOCANVA_HTTP_FIXTURE_ENDPOINT;
const token = process.env.NOCANVA_HTTP_FIXTURE_TOKEN;
const appToken = process.env.NOCANVA_APP_TOKEN;
const appUrl = process.env.NOCANVA_BASE_URL;
const imageOutput = process.env.NOCANVA_HTTP_FIXTURE_IMAGE;
if (!endpoint || !token || !appToken || !appUrl) throw new Error("Hosted endpoint, MCP token, app token, and app URL are required.");

function structured(result) {
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

const client = new Client({ name: "nocanva-hosted-launch-proof", version: "0.4.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(`${endpoint.replace(/\/$/, "")}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 33);
  structured(await client.callTool({ name: "canvnah_create_brand", arguments: { id: "nocanva", name: "NoCanva", tagline: "IDEAS IN. BRAND-READY MEDIA OUT.", website: "nocanva.com", colors: { paper: "#F2F0E9", ink: "#171714", signal: "#E24A32", muted: "#66635C", accent: "#E9B949" }, safeArea: 64 } }));
  const templates = structured(await client.callTool({ name: "nocanva_list_templates", arguments: { brandId: "nocanva" } }));
  if (!templates.templates.some((template) => template.id === "nocanva-statement")) structured(await client.callTool({ name: "canvnah_create_template", arguments: { id: "nocanva-statement", brandId: "nocanva", name: "NoCanva statement", description: "A decisive product principle with real product imagery.", rendererKey: "statement" } }));
  const sourceImage = process.env.NOCANVA_FIXTURE_SOURCE_IMAGE ?? new URL("../public/og-nocanva.png", import.meta.url);
  const imageBytes = await readFile(sourceImage);
  const mimeType = String(sourceImage).toLowerCase().endsWith(".jpg") || String(sourceImage).toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  const uploaded = structured(await client.callTool({ name: "nocanva_upload_asset", arguments: { name: "NoCanva product workspace", mimeType, base64: imageBytes.toString("base64") } }));
  assert.ok(uploaded.asset.width >= 320);

  const created = structured(await client.callTool({ name: "nocanva_create_draft", arguments: {
    brandId: "nocanva", templateId: "nocanva-statement", format: "portrait",
    prompt: "Hosted launch proof using a real immutable product image.",
    content: {
      eyebrow: "NOCANVA / LAUNCH",
      headline: "Your agent made this. You still own the final cut.",
      support: "Review copy, adjust the crop, approve the exact revision, and export a deterministic PNG.",
      image: { assetId: uploaded.asset.id, alt: "NoCanva workspace preview", fit: "contain", focalPoint: { x: .5, y: .5 }, zoom: 1 },
    },
  } }));
  const reviewedResult = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, notes: "Hosted launch proof; PNG requires visual inspection." } });
  const reviewed = structured(reviewedResult);
  assert.equal(reviewed.review.passed, true);
  const image = reviewedResult.content?.find((item) => item.type === "image");
  assert.ok(image?.data);
  if (imageOutput) await writeFile(imageOutput, Buffer.from(image.data, "base64"));

  const approval = await fetch(`${appUrl}/api/drafts/${created.draft.id}/approval`, {
    method: "POST",
    headers: { authorization: `Bearer ${appToken}`, "content-type": "application/json", "x-nocanva-actor-id": "human:launch-reviewer" },
    body: JSON.stringify({ expectedRevision: created.draft.currentRevision, actor: "human:launch-reviewer", decision: "approved" }),
  });
  assert.equal(approval.status, 200, await approval.text());
  const rendered = structured(await client.callTool({ name: "nocanva_render", arguments: { draftId: created.draft.id } }));
  const inspected = structured(await client.callTool({ name: "nocanva_get_render", arguments: { renderId: rendered.render.id } }));
  assert.equal(inspected.render.sha256, reviewed.review.sha256);
  console.log(JSON.stringify({ tools: tools.tools.length, assetId: uploaded.asset.id, draftId: created.draft.id, renderId: rendered.render.id, workspaceUrl: rendered.render.workspaceUrl, assetUrl: rendered.render.assetUrl, templateVersionId: rendered.render.templateVersionId, dimensions: `${rendered.render.width}x${rendered.render.height}`, sha256: rendered.render.sha256 }, null, 2));
} finally {
  await client.close().catch(() => undefined);
}
