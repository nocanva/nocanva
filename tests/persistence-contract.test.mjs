import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("migration defines the durable media graph and query indexes", async () => {
  const sql = `${await readFile(new URL("drizzle/0000_flippant_omega_flight.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0001_trustworthy_drafts.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0002_workspace_events.sql", root), "utf8")}`;
  for (const table of ["brands", "templates", "template_versions", "posts", "renders"]) {
    assert.match(sql, new RegExp(`CREATE TABLE .${table}.`));
  }
  assert.match(sql, /input_snapshot_json/);
  assert.match(sql, /idx_renders_created_at/);
  assert.match(sql, /idx_renders_post_id/);
  assert.match(sql, /idx_template_versions_template_version/);
  for (const table of ["drafts", "draft_revisions", "draft_reviews", "draft_approvals"]) {
    assert.match(sql, new RegExp(`CREATE TABLE .${table}.`));
  }
  assert.match(sql, /idx_draft_revisions_draft_revision/);
  assert.match(sql, /draft_revision_id/);
  assert.match(sql, /CREATE TABLE .workspace_events./);
  assert.match(sql, /idx_workspace_events_created_at/);
});

test("hosting binds relational data and immutable assets", async () => {
  const hosting = JSON.parse(await readFile(new URL(".openai/hosting.json", root), "utf8"));
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "MEDIA");

  const repository = await readFile(new URL("lib/server/media-repository.ts", root), "utf8");
  assert.match(repository, /INSERT INTO renders/);
  assert.match(repository, /input_snapshot_json/);
  assert.match(repository, /max-age=31536000, immutable/);
  assert.doesNotMatch(repository, /UPDATE renders/);
  assert.doesNotMatch(repository, /\$\{payload\.templateId\}@1/);
  assert.match(repository, /draftForRender\.templateVersionId/);
  assert.match(repository, /NOCANVA_APPROVAL_MODE/);
  assert.match(repository, /requires a human approval actor/);
  assert.match(repository, /render_completed/);
});
