import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const brands = sqliteTable("brands", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  name: text("name").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_brands_workspace").on(table.workspaceId, table.name)]);

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  brandId: text("brand_id").notNull().references(() => brands.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  contentSchemaJson: text("content_schema_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_templates_brand_id").on(table.brandId), index("idx_templates_workspace").on(table.workspaceId, table.brandId)]);

export const templateVersions = sqliteTable("template_versions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  templateId: text("template_id").notNull().references(() => templates.id),
  version: integer("version").notNull(),
  rendererKey: text("renderer_key").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_template_versions_template_version").on(table.templateId, table.version)]);

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  brandId: text("brand_id").notNull().references(() => brands.id),
  templateId: text("template_id").notNull().references(() => templates.id),
  prompt: text("prompt"),
  contentJson: text("content_json").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_posts_created_at").on(table.createdAt), index("idx_posts_workspace").on(table.workspaceId, table.createdAt)]);

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  brandId: text("brand_id").notNull().references(() => brands.id),
  templateId: text("template_id").notNull().references(() => templates.id),
  currentRevision: integer("current_revision").notNull(),
  status: text("status").notNull(),
  archivedAt: integer("archived_at"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_drafts_updated_at").on(table.updatedAt),
  index("idx_drafts_brand_id").on(table.brandId),
  index("idx_drafts_workspace").on(table.workspaceId, table.updatedAt),
]);

export const draftRevisions = sqliteTable("draft_revisions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  draftId: text("draft_id").notNull().references(() => drafts.id),
  revision: integer("revision").notNull(),
  templateVersionId: text("template_version_id").notNull().references(() => templateVersions.id),
  format: text("format").notNull(),
  contentJson: text("content_json").notNull(),
  prompt: text("prompt"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_draft_revisions_draft_revision").on(table.draftId, table.revision)]);

export const draftReviews = sqliteTable("draft_reviews", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  draftRevisionId: text("draft_revision_id").notNull().references(() => draftRevisions.id),
  reviewer: text("reviewer").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  checksJson: text("checks_json").notNull(),
  assetKey: text("asset_key"),
  assetContentType: text("asset_content_type"),
  width: integer("width"),
  height: integer("height"),
  sha256: text("sha256"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_draft_reviews_revision").on(table.draftRevisionId)]);

export const draftApprovals = sqliteTable("draft_approvals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  draftRevisionId: text("draft_revision_id").notNull().references(() => draftRevisions.id),
  reviewId: text("review_id").references(() => draftReviews.id),
  actor: text("actor").notNull(),
  decision: text("decision").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_draft_approvals_revision").on(table.draftRevisionId), index("idx_draft_approvals_review").on(table.reviewId)]);

export const workspaceEvents = sqliteTable("workspace_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  actor: text("actor").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_workspace_events_created_at").on(table.workspaceId, table.createdAt)]);

export const mcpTokens = sqliteTable("mcp_tokens", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at"),
  revokedAt: integer("revoked_at"),
}, (table) => [uniqueIndex("idx_mcp_tokens_hash").on(table.tokenHash), index("idx_mcp_tokens_workspace").on(table.workspaceId, table.createdAt)]);

export const workspaceAssets = sqliteTable("workspace_assets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sha256: text("sha256").notNull(),
  assetKey: text("asset_key").notNull(),
  archivedAt: integer("archived_at"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_workspace_assets_workspace").on(table.workspaceId, table.createdAt),
  uniqueIndex("idx_workspace_assets_sha").on(table.workspaceId, table.sha256),
]);

export const carousels = sqliteTable("carousels", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), brandId: text("brand_id").notNull().references(() => brands.id),
  templateId: text("template_id").notNull().references(() => templates.id), currentRevision: integer("current_revision").notNull(), status: text("status").notNull(),
  archivedAt: integer("archived_at"), createdBy: text("created_by").notNull(), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [index("idx_carousels_workspace").on(table.workspaceId, table.updatedAt)]);

export const carouselRevisions = sqliteTable("carousel_revisions", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), carouselId: text("carousel_id").notNull().references(() => carousels.id),
  revision: integer("revision").notNull(), templateVersionId: text("template_version_id").notNull().references(() => templateVersions.id), format: text("format").notNull(),
  slidesJson: text("slides_json").notNull(), prompt: text("prompt"), createdBy: text("created_by").notNull(), createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("idx_carousel_revisions_revision").on(table.carouselId, table.revision)]);

export const carouselReviews = sqliteTable("carousel_reviews", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), carouselRevisionId: text("carousel_revision_id").notNull().references(() => carouselRevisions.id),
  reviewer: text("reviewer").notNull(), status: text("status").notNull(), notes: text("notes"), checksJson: text("checks_json").notNull(), artifactsJson: text("artifacts_json").notNull(), createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_carousel_reviews_revision").on(table.carouselRevisionId)]);

export const carouselApprovals = sqliteTable("carousel_approvals", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), carouselRevisionId: text("carousel_revision_id").notNull().references(() => carouselRevisions.id),
  reviewId: text("review_id").references(() => carouselReviews.id), actor: text("actor").notNull(), decision: text("decision").notNull(), notes: text("notes"), createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_carousel_approvals_revision").on(table.carouselRevisionId), index("idx_carousel_approvals_review").on(table.reviewId)]);

export const carouselRenders = sqliteTable("carousel_renders", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), carouselRevisionId: text("carousel_revision_id").notNull().references(() => carouselRevisions.id),
  templateVersionId: text("template_version_id").notNull().references(() => templateVersions.id), reviewId: text("review_id").notNull().references(() => carouselReviews.id),
  artifactsJson: text("artifacts_json").notNull(), createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_carousel_renders_workspace").on(table.workspaceId, table.createdAt), index("idx_carousel_renders_revision").on(table.carouselRevisionId)]);

export const renders = sqliteTable("renders", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default"),
  postId: text("post_id").notNull().references(() => posts.id),
  draftRevisionId: text("draft_revision_id").references(() => draftRevisions.id),
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
  index("idx_renders_workspace").on(table.workspaceId, table.createdAt),
]);
