import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("migration defines the durable media graph and query indexes", async () => {
  const sql = await readFile(new URL("drizzle/0000_flippant_omega_flight.sql", root), "utf8");
  for (const table of ["brands", "templates", "template_versions", "posts", "renders"]) {
    assert.match(sql, new RegExp(`CREATE TABLE .${table}.`));
  }
  assert.match(sql, /input_snapshot_json/);
  assert.match(sql, /idx_renders_created_at/);
  assert.match(sql, /idx_renders_post_id/);
  assert.match(sql, /idx_template_versions_template_version/);
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
});
