import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
const appToken = process.env.NOCANVA_APP_TOKEN;
const workspaceId = process.env.NOCANVA_WORKSPACE_ID;
const externalEndpoint = process.env.NOCANVA_HTTP_FIXTURE_ENDPOINT;
const remoteToken = process.env.NOCANVA_HTTP_FIXTURE_TOKEN;
const transport = externalEndpoint
  ? new StreamableHTTPClientTransport(new URL(`${externalEndpoint.replace(/\/$/, "").replace(/\/mcp$/, "")}/mcp`), { authProvider: { token: async () => {
      if (!remoteToken) throw new Error("NOCANVA_HTTP_FIXTURE_TOKEN is required for a remote carousel fixture.");
      return remoteToken;
    } } })
  : new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, CANVNAH_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-carousel-lifecycle-fixture", version: "0.1.0" });

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) {
  return structured(await client.callTool({ name, arguments: args }));
}

const slides = [
  { eyebrow: "NOCANVA / CAROUSEL", headline: "One release note becomes a complete story.", support: "The agent structures the message while NoCanva locks the brand and layout system." },
  { eyebrow: "02 / CONSISTENCY", headline: "One template version. Every slide.", support: "Format, typography, safe areas, and design tokens remain consistent across the set." },
  { eyebrow: "03 / HANDOFF", headline: "Review once. Export the exact approved pixels.", support: "Every slide is checked, visually inspected, approved, and promoted into an immutable render." },
];

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const required = ["nocanva_list_carousels", "nocanva_get_carousel", "nocanva_create_carousel", "nocanva_update_carousel", "nocanva_review_carousel", "nocanva_approve_carousel", "nocanva_archive_carousel", "nocanva_render_carousel", "nocanva_get_carousel_render"];
  for (const name of required) assert.ok(listed.tools.some((tool) => tool.name === name), `Missing MCP tool: ${name}`);

  await call("canvnah_create_brand", {
    id: "carousel-fixture", name: "Carousel Fixture", tagline: "ONE STORY. ONE SYSTEM.", website: "carousel.local",
    colors: { paper: "#F1EFE8", ink: "#171714", signal: "#C43B31", muted: "#64645E" }, safeArea: 64,
  });
  const templates = await call("nocanva_list_templates", { brandId: "carousel-fixture" });
  if (!templates.templates.some((template) => template.id === "carousel-fixture-statement")) {
    await call("canvnah_create_template", { id: "carousel-fixture-statement", brandId: "carousel-fixture", name: "Carousel statement", description: "Pinned multi-slide lifecycle fixture.", rendererKey: "statement" });
  }

  const created = await call("nocanva_create_carousel", { brandId: "carousel-fixture", templateId: "carousel-fixture-statement", format: "square", slides, prompt: "Prove the complete 3-slide carousel lifecycle." });
  assert.equal(created.carousel.currentRevision, 1);
  assert.equal(created.carousel.slides.length, 3);
  assert.match(new URL(created.carousel.workspaceUrl).pathname, /^\/carousels\//);
  const pinnedTemplateVersionId = created.carousel.templateVersionId;

  const stale = await client.callTool({ name: "nocanva_update_carousel", arguments: { carouselId: created.carousel.id, expectedRevision: 0, brandId: "carousel-fixture", templateId: "carousel-fixture-statement", format: "square", slides } });
  assert.equal(stale.isError, true);

  const reviewed = await call("nocanva_review_carousel", { carouselId: created.carousel.id, reviewer: "agent:fixture", notes: "Fixture agent inspected all three full-frame PNGs." });
  assert.equal(reviewed.carousel.status, "in_review");
  assert.equal(reviewed.review.status, "passed");
  assert.equal(reviewed.review.artifacts.length, 3);
  for (const artifact of reviewed.review.artifacts) assert.match(artifact.sha256, /^[a-f0-9]{64}$/);

  const approved = await call("nocanva_approve_carousel", { carouselId: created.carousel.id, expectedRevision: 1, decision: "approved", actor: "agent:fixture" });
  assert.equal(approved.carousel.status, "approved");
  assert.equal(approved.carousel.approval.reviewId, reviewed.review.id);

  const rendered = await call("nocanva_render_carousel", { carouselId: created.carousel.id });
  assert.equal(rendered.render.templateVersionId, pinnedTemplateVersionId);
  assert.equal(rendered.render.carouselRevisionId, approved.carousel.revisionId);
  assert.deepEqual(rendered.render.artifacts.map((artifact) => artifact.sha256), reviewed.review.artifacts.map((artifact) => artifact.sha256));
  assert.match(new URL(rendered.render.workspaceUrl).pathname, /^\/carousel-renders\//);

  const inspected = await call("nocanva_get_carousel_render", { renderId: rendered.render.id });
  assert.deepEqual(inspected.render.artifacts.map((artifact) => artifact.sha256), rendered.render.artifacts.map((artifact) => artifact.sha256));
  const zipResponse = externalEndpoint ? null : await fetch(inspected.render.zipUrl, { headers: {
    ...(appToken ? { authorization: `Bearer ${appToken}` } : {}),
    ...(workspaceId ? { "x-nocanva-workspace-id": workspaceId } : {}),
  } });
  if (zipResponse) {
    assert.equal(zipResponse.status, 200);
    assert.match(zipResponse.headers.get("content-type") ?? "", /application\/zip/);
    assert.ok((await zipResponse.arrayBuffer()).byteLength > 1_000);
  }

  const edited = await call("nocanva_update_carousel", { carouselId: created.carousel.id, expectedRevision: 1, brandId: "carousel-fixture", templateId: "carousel-fixture-statement", format: "square", slides: slides.map((slide, index) => index === 2 ? { ...slide, headline: "A new revision invalidates the whole approval set." } : slide) });
  assert.equal(edited.carousel.currentRevision, 2);
  assert.equal(edited.carousel.status, "draft");
  assert.equal(edited.carousel.approval, null);

  const archived = await call("nocanva_archive_carousel", { carouselId: created.carousel.id, archived: true });
  assert.ok(archived.carousel.archivedAt);
  const restored = await call("nocanva_archive_carousel", { carouselId: created.carousel.id, archived: false });
  assert.equal(restored.carousel.archivedAt, null);

  process.stdout.write(`${JSON.stringify({ tools: listed.tools.length, carouselId: created.carousel.id, slides: rendered.render.artifacts.length, pinnedTemplateVersionId, renderId: rendered.render.id, sha256: rendered.render.artifacts.map((artifact) => artifact.sha256), zipUrl: rendered.render.zipUrl }, null, 2)}\n`);
} finally {
  await client.close();
}
