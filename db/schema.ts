import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const brands = sqliteTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  brandId: text("brand_id").notNull().references(() => brands.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  contentSchemaJson: text("content_schema_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_templates_brand_id").on(table.brandId)]);

export const templateVersions = sqliteTable("template_versions", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => templates.id),
  version: integer("version").notNull(),
  rendererKey: text("renderer_key").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_template_versions_template_version").on(table.templateId, table.version)]);

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  brandId: text("brand_id").notNull().references(() => brands.id),
  templateId: text("template_id").notNull().references(() => templates.id),
  prompt: text("prompt"),
  contentJson: text("content_json").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_posts_created_at").on(table.createdAt)]);

export const renders = sqliteTable("renders", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  templateVersionId: text("template_version_id").notNull().references(() => templateVersions.id),
  parentRenderId: text("parent_render_id"),
  assetKey: text("asset_key").notNull(),
  assetContentType: text("asset_content_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  inputSnapshotJson: text("input_snapshot_json").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_renders_created_at").on(table.createdAt),
  index("idx_renders_post_id").on(table.postId),
  index("idx_renders_parent_render_id").on(table.parentRenderId),
]);
