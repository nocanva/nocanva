import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("local MCP exposes the agent-native Canvnah workflow", async () => {
  const [server, client, fixture, packageJson] = await Promise.all([
    readFile(new URL("mcp/server.ts", root), "utf8"),
    readFile(new URL("mcp/canvnah-client.ts", root), "utf8"),
    readFile(new URL("scripts/test-mcp-fixture.mjs", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  for (const tool of ["canvnah_list_brands", "canvnah_create_brand", "canvnah_list_templates", "canvnah_create_template", "canvnah_review_template", "canvnah_create_post", "canvnah_list_posts", "canvnah_render_post", "canvnah_list_renders", "canvnah_get_render", "canvnah_rerender"]) {
    assert.match(server, new RegExp(`registerTool\\(\\"${tool}\\"`));
  }
  assert.match(client, /chromium\.launch/);
  assert.match(client, /Repeated PNG hashes match/);
  assert.match(client, /only connects to a loopback Canvnah URL/);
  assert.match(fixture, /Create a Sprout post from the Fortwin AI product repository/);
  assert.match(packageJson, /"mcp:fixture"/);
});
