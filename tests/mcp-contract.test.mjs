import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("local MCP exposes the agent-native NoCanva workflow", async () => {
  const [server, client, nodeRenderer, worker, fixture, draftFixture, agentInstructions, packageJson] = await Promise.all([
    readFile(new URL("mcp/server.ts", root), "utf8"),
    readFile(new URL("mcp/canvnah-client.ts", root), "utf8"),
    readFile(new URL("mcp/node-renderer.ts", root), "utf8"),
    readFile(new URL("mcp/worker.ts", root), "utf8"),
    readFile(new URL("scripts/test-mcp-fixture.mjs", root), "utf8"),
    readFile(new URL("scripts/test-draft-lifecycle.mjs", root), "utf8"),
    readFile(new URL("FORTWIN_SPROUT_AGENTS.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  for (const tool of ["canvnah_list_brands", "canvnah_create_brand", "canvnah_list_templates", "canvnah_create_template", "canvnah_review_template", "canvnah_create_post", "canvnah_list_posts", "canvnah_render_post", "canvnah_list_renders", "canvnah_get_render", "canvnah_rerender"]) {
    assert.match(server, new RegExp(`registerTool\\(\\"${tool}\\"`));
  }
  for (const tool of ["nocanva_get_brand", "nocanva_list_templates", "nocanva_list_compositions", "nocanva_list_drafts", "nocanva_get_draft", "nocanva_create_draft", "nocanva_update_draft", "nocanva_review_draft", "nocanva_approve_draft", "nocanva_archive_draft", "nocanva_render", "nocanva_get_render"]) {
    assert.match(server, new RegExp(`registerTool\\(\\"${tool}\\"`));
  }
  for (const tool of ["nocanva_list_carousels", "nocanva_get_carousel", "nocanva_create_carousel", "nocanva_update_carousel", "nocanva_review_carousel", "nocanva_approve_carousel", "nocanva_archive_carousel", "nocanva_render_carousel", "nocanva_get_carousel_render"]) {
    assert.match(server, new RegExp(`registerTool\\(\\"${tool}\\"`));
  }
  for (const tool of ["nocanva_list_assets", "nocanva_upload_asset"]) assert.match(server, new RegExp(`registerTool\\(\\"${tool}\\"`));
  assert.match(nodeRenderer, /chromium\.launch/);
  assert.match(client, /Repeated PNG hashes match/);
  assert.match(client, /NOCANVA_ALLOW_REMOTE_APP_URL/);
  assert.match(client, /non-loopback NoCanva application URL/);
  assert.match(worker, /createMcpHandler/);
  assert.match(worker, /createCloudflareRenderer/);
  assert.match(server, /Primary workflow/);
  assert.match(server, /visualReviewRubric/);
  assert.match(server, /contentWarnings: creativeContentWarnings/);
  assert.match(server, /Blindspot beta work requires a semantic compositionId/);
  assert.match(server, /maxAgentIterations: 3/);
  assert.match(fixture, /Create a Sprout post from the Fortwin AI product repository/);
  assert.match(draftFixture, /stale\.isError/);
  assert.match(draftFixture, /pinnedTemplateVersionId/);
  assert.match(agentInstructions, /Codex discovers this file automatically/);
  assert.match(agentInstructions, /@AGENTS\.md/);
  assert.match(agentInstructions, /codex mcp add nocanva/);
  assert.match(agentInstructions, /claude mcp add nocanva/);
  assert.match(packageJson, /"mcp:fixture"/);
  assert.match(packageJson, /"mcp:draft-fixture"/);
  assert.match(packageJson, /"mcp:carousel-fixture"/);
});
