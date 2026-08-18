import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
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
  for (const name of ["canvnah_list_brands", "canvnah_list_templates", "canvnah_create_post", "canvnah_render_post", "canvnah_get_render", "canvnah_rerender"]) {
    assert.ok(toolNames.includes(name), `Missing MCP tool: ${name}`);
  }

  const brands = structured(await client.callTool({ name: "canvnah_list_brands", arguments: {} }));
  assert.equal(brands.brands[0].id, "blindspot");
  const templates = structured(await client.callTool({ name: "canvnah_list_templates", arguments: { brandId: "blindspot" } }));
  assert.ok(templates.templates.some((template) => template.id === "statement"));

  const created = structured(await client.callTool({
    name: "canvnah_create_post",
    arguments: {
      brandId: "blindspot",
      templateId: "statement",
      format: "portrait",
      prompt: "Create a Blindspot post explaining why context matters when evaluating screenshots.",
      content: {
        eyebrow: "CONTEXT / 01",
        headline: "A screenshot begins the investigation.",
        support: "Check the source, timestamp, and surrounding record before treating isolated pixels as proof.",
      },
    },
  }));
  assert.equal(created.post.createdBy, "agent:mcp");

  const rendered = structured(await client.callTool({ name: "canvnah_render_post", arguments: { postId: created.post.id } }));
  assert.equal(rendered.render.width, 1080);
  assert.equal(rendered.render.height, 1350);
  assert.match(rendered.render.assetUrl, /^http:\/\/localhost:3000\/api\/renders\//);
  assert.match(rendered.render.workspaceUrl, /^http:\/\/localhost:3000\/renders\//);

  const inspected = structured(await client.callTool({ name: "canvnah_get_render", arguments: { renderId: rendered.render.id } }));
  assert.equal(inspected.render.sha256, rendered.render.sha256);
  assert.equal(inspected.render.templateVersion, 1);

  const rerendered = structured(await client.callTool({ name: "canvnah_rerender", arguments: { renderId: rendered.render.id } }));
  assert.equal(rerendered.render.parentRenderId, rendered.render.id);
  assert.equal(rerendered.render.sha256, rendered.render.sha256);

  process.stdout.write(`${JSON.stringify({ tools: toolNames.length, postId: created.post.id, renderId: rendered.render.id, rerenderId: rerendered.render.id }, null, 2)}\n`);
} finally {
  await client.close();
}
