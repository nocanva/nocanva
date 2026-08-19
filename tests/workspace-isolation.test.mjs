import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;

test("durable records and render assets are workspace scoped", async () => {
  const repository = await readFile(join(root, "lib/server/media-repository.ts"), "utf8");
  const schema = await readFile(join(root, "db/schema.ts"), "utf8");
  const migration = await readFile(join(root, "drizzle/0003_workspace_isolation.sql"), "utf8");

  for (const table of ["brands", "templates", "template_versions", "posts", "drafts", "draft_revisions", "draft_reviews", "draft_approvals", "renders"]) {
    assert.ok(migration.includes(`ALTER TABLE \`${table}\` ADD \`workspace_id\``), `${table} is missing workspace_id migration`);
  }
  assert.match(schema, /workspaceId: text\("workspace_id"\)/);
  assert.match(repository, /workspaces\/\$\{workspaceId\}\/renders\/\$\{renderId\}\.png/);
  assert.match(repository, /WHERE r\.id = \? AND r\.workspace_id = \?/);
  assert.match(repository, /WHERE d\.id = \? AND d\.workspace_id = \?/);
  assert.match(repository, /physicalId\(workspaceId, config\.id\)/);
});

test("authenticated API routes pass the principal workspace to storage", async () => {
  const routeFiles = [
    "app/api/brands/route.ts", "app/api/brands/[id]/route.ts", "app/api/templates/route.ts",
    "app/api/posts/route.ts", "app/api/posts/[id]/route.ts", "app/api/drafts/route.ts",
    "app/api/drafts/[id]/route.ts", "app/api/drafts/[id]/revisions/route.ts",
    "app/api/drafts/[id]/review/route.ts", "app/api/drafts/[id]/approval/route.ts",
    "app/api/drafts/[id]/archive/route.ts", "app/api/renders/route.ts",
    "app/api/renders/[id]/route.ts", "app/api/renders/[id]/asset/route.ts",
  ];
  for (const file of routeFiles) {
    const source = await readFile(join(root, file), "utf8");
    assert.match(source, /authorization\.principal\.workspaceId/, `${file} does not pass the authenticated workspace`);
  }
});
