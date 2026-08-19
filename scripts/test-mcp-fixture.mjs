import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [tsx, "mcp/server.ts"],
  cwd: root,
  env: { ...process.env, CANVNAH_BASE_URL: baseUrl },
  stderr: "inherit",
});
const client = new Client({ name: "canvnah-mcp-fixture", version: "0.1.0" });

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const toolNames = listed.tools.map((tool) => tool.name);
  for (const name of ["canvnah_list_brands", "canvnah_create_brand", "canvnah_list_templates", "canvnah_create_template", "canvnah_review_template", "canvnah_create_post", "canvnah_render_post", "canvnah_get_render", "canvnah_rerender"]) {
    assert.ok(toolNames.includes(name), `Missing MCP tool: ${name}`);
  }

  const brand = structured(await client.callTool({
    name: "canvnah_create_brand",
    arguments: {
      id: "sprout", name: "Sprout", tagline: "GROW WITH CLARITY.", website: "sprout.example",
      colors: { paper: "#F3F7EF", ink: "#17351F", signal: "#69A84F", muted: "#637266" }, safeArea: 72,
    },
  }));
  assert.equal(brand.brand.id, "sprout");
  const template = structured(await client.callTool({
    name: "canvnah_create_template",
    arguments: { id: "sprout-statement", brandId: "sprout", name: "Sprout statement", description: "A clear product insight with concise supporting evidence.", rendererKey: "statement" },
  }));
  assert.equal(template.template.brandId, "sprout");

  const sampleContent = {
    eyebrow: "SPROUT / PRODUCT",
    headline: "Turn scattered signals into clear action.",
    support: "Sprout helps teams organize what matters, understand the context, and move forward with confidence.",
  };
  const reviewed = structured(await client.callTool({
    name: "canvnah_review_template",
    arguments: { brandId: "sprout", templateId: "sprout-statement", format: "portrait", content: sampleContent },
  }));
  assert.equal(reviewed.review.passed, true);
  const squareReview = structured(await client.callTool({
    name: "canvnah_review_template",
    arguments: { brandId: "sprout", templateId: "sprout-statement", format: "square", content: sampleContent },
  }));
  assert.equal(squareReview.review.passed, true);

  const created = structured(await client.callTool({
    name: "canvnah_create_post",
    arguments: {
      brandId: "sprout",
      templateId: "sprout-statement",
      format: "portrait",
      prompt: "Create a Sprout post from the Fortwin AI product repository.",
      content: sampleContent,
    },
  }));
  assert.equal(created.post.createdBy, process.env.NOCANVA_ACTOR_ID ?? "agent:mcp");

  const rendered = structured(await client.callTool({ name: "canvnah_render_post", arguments: { postId: created.post.id } }));
  assert.equal(rendered.render.width, 1080);
  assert.equal(rendered.render.height, 1350);
  assert.equal(new URL(rendered.render.assetUrl).origin, new URL(baseUrl).origin);
  assert.match(new URL(rendered.render.assetUrl).pathname, /^\/api\/renders\//);
  assert.equal(new URL(rendered.render.workspaceUrl).origin, new URL(baseUrl).origin);
  assert.match(new URL(rendered.render.workspaceUrl).pathname, /^\/renders\//);

  const inspected = structured(await client.callTool({ name: "canvnah_get_render", arguments: { renderId: rendered.render.id } }));
  assert.equal(inspected.render.sha256, rendered.render.sha256);
  assert.equal(inspected.render.templateVersion, template.template.version);
  assert.equal(inspected.render.templateVersionId, `${template.template.id}@${template.template.version}`);

  const rerendered = structured(await client.callTool({ name: "canvnah_rerender", arguments: { renderId: rendered.render.id } }));
  assert.equal(rerendered.render.parentRenderId, rendered.render.id);
  assert.equal(rerendered.render.sha256, rendered.render.sha256);

  process.stdout.write(`${JSON.stringify({ tools: toolNames.length, brandId: brand.brand.id, templateId: template.template.id, postId: created.post.id, renderId: rendered.render.id, rerenderId: rerendered.render.id }, null, 2)}\n`);
} finally {
  await client.close();
}
