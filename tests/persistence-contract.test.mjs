import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("migration defines the durable media graph and query indexes", async () => {
  const sql = `${await readFile(new URL("drizzle/0000_flippant_omega_flight.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0001_trustworthy_drafts.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0002_workspace_events.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0004_review_artifacts.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0005_mcp_tokens.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0006_carousels.sql", root), "utf8")}\n${await readFile(new URL("drizzle/0007_workspace_assets.sql", root), "utf8")}`;
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
  assert.match(sql, /asset_key/);
  assert.match(sql, /review_id/);
  assert.match(sql, /idx_draft_approvals_review/);
  assert.match(sql, /CREATE TABLE .mcp_tokens./);
  assert.match(sql, /idx_mcp_tokens_hash/);
  for (const table of ["carousels", "carousel_revisions", "carousel_reviews", "carousel_approvals", "carousel_renders"]) {
    assert.match(sql, new RegExp(`CREATE TABLE .${table}.`));
  }
  assert.match(sql, /slides_json/);
  assert.match(sql, /artifacts_json/);
  assert.match(sql, /idx_carousel_approvals_review/);
  assert.match(sql, /CREATE TABLE .workspace_assets./);
  assert.match(sql, /idx_workspace_assets_sha/);
});

test("hosting binds relational data and immutable assets", async () => {
  const wrangler = JSON.parse(await readFile(new URL("wrangler.jsonc", root), "utf8"));
  assert.equal(wrangler.d1_databases[0].binding, "DB");
  assert.equal(wrangler.d1_databases[0].migrations_dir, "drizzle");
  assert.equal(wrangler.r2_buckets[0].binding, "MEDIA");

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
  assert.match(repository, /approval\.reviewId/);
  assert.match(repository, /approved review artifact failed its SHA-256 integrity check/);
  assert.match(repository, /serializeDraftSnapshot/);
  assert.match(repository, /parseDraftSnapshot/);
  const carouselRepository = await readFile(new URL("lib/server/carousel-repository.ts", root), "utf8");
  assert.match(carouselRepository, /carousel-reviews/);
  assert.match(carouselRepository, /carousel-renders/);
  assert.match(carouselRepository, /failed its SHA-256 integrity check/);
  const assetRepository = await readFile(new URL("lib/server/asset-repository.ts", root), "utf8");
  assert.match(assetRepository, /750 \* 1024/);
  assert.match(assetRepository, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(assetRepository, /workspace_id = \?/);
});
