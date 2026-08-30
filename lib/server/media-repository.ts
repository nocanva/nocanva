import { env } from "cloudflare:workers";
import { compositionFromTemplateId, compositionTemplateIds, compositions, visualDirections, type CompositionId } from "../compositions";
import { brand, brandConfigSchema, draftCreateInputSchema, draftDecisionSchema, draftLayoutSchema, draftStatusSchema, draftUpdateInputSchema, formats, postPayloadSchema, posterLayoutSchema, rendererKeySchema, templateCreateSchema, templates, type BrandConfig, type DraftLayout, type DraftStatus, type PostPayload, type PosterLayout, type RendererKey, type TemplateInput } from "../media";
import { validateContentAssets } from "./asset-repository";

type D1Row = Record<string, unknown>;

export type BrandRecord = { id: string; name: string; config: BrandConfig; createdAt: number };
export type TemplateRecord = { id: string; brandId: string; name: string; description: string; type: string; version: number; rendererKey: RendererKey; layout?: PosterLayout; contentSchema: Record<string, unknown>; createdAt: number };
export type PostRecord = {
  id: string; brandId: string; templateId: string; prompt: string | null; payload: PostPayload;
  createdBy: string; createdAt: number;
};
export type DraftCheck = { id: string; passed: boolean; detail: string };
export type DraftReviewRecord = { id: string; reviewer: string; status: "passed" | "changes_requested"; notes: string | null; checks: DraftCheck[]; width: number; height: number; sha256: string; createdAt: number };
export type DraftApprovalRecord = { id: string; reviewId: string | null; actor: string; decision: "approved" | "rejected"; notes: string | null; createdAt: number };
export type DraftRecord = {
  id: string; brandId: string; brandName: string; templateId: string; templateName: string;
  templateVersionId: string; templateVersion: number; currentRevision: number; revisionId: string;
  status: DraftStatus; approvalPolicy: "agent_allowed" | "human_required"; archivedAt: number | null; prompt: string | null; payload: PostPayload;
  createdBy: string; revisionCreatedBy: string; createdAt: number; updatedAt: number;
  review: DraftReviewRecord | null; approval: DraftApprovalRecord | null;
};
export type DraftRevisionRecord = { id: string; revision: number; templateVersionId: string; format: PostPayload["format"]; content: PostPayload["content"]; layout?: DraftLayout; prompt: string | null; createdBy: string; createdAt: number };
export type RenderRecord = {
  id: string; postId: string; draftRevisionId: string | null; parentRenderId: string | null; brandName: string; templateName: string;
  templateVersionId: string; templateVersion: number; payload: PostPayload; width: number; height: number; sha256: string;
  createdAt: number; assetUrl: string;
};
export type ActivationSummary = {
  brandCount: number; templateCount: number; agentActivity: boolean; draftsCreated: number; draftsOpened: number; rendersCompleted: number;
  firstDraftAt: number | null; firstRenderAt: number | null; timeToFirstRenderMs: number | null;
};
export type ManagedMcpToken = { id: string; name: string; tokenPrefix: string; createdBy: string; createdAt: number; lastUsedAt: number | null; revokedAt: number | null };

let initialized: Promise<void> | undefined;
const seededWorkspaces = new Map<string, Promise<void>>();

function defaultWorkspaceId() {
  return env.NOCANVA_WORKSPACE_ID ?? "default";
}

function physicalId(workspaceId: string, logicalId: string) {
  return workspaceId === "default" ? logicalId : `${workspaceId}::${logicalId}`;
}

function logicalId(workspaceId: string, storedId: unknown) {
  const value = String(storedId);
  const prefix = `${workspaceId}::`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  return env.DB;
}

function mediaBucket(): R2Bucket {
  if (!env.MEDIA) throw new Error("R2 binding MEDIA is unavailable.");
  return env.MEDIA;
}

function approvalPolicy(): "agent_allowed" | "human_required" {
  return env.NOCANVA_APPROVAL_MODE === "human_required" ? "human_required" : "agent_allowed";
}

export async function ensureMediaDatabase(workspaceId = defaultWorkspaceId()): Promise<void> {
  initialized ??= initializeDatabase();
  await initialized;
  let seed = seededWorkspaces.get(workspaceId);
  if (!seed) {
    seed = seedWorkspace(workspaceId);
    seededWorkspaces.set(workspaceId, seed);
  }
  await seed;
}

export async function checkMediaHealth() {
  await ensureMediaDatabase();
  await database().prepare("SELECT 1 AS ok").first();
  await mediaBucket().head("__nocanva_healthcheck__");
  return { database: "ok" as const, objectStorage: "ok" as const };
}

async function initializeDatabase() {
  const db = database();
  const statements = [
    `CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', name TEXT NOT NULL, config_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', brand_id TEXT NOT NULL REFERENCES brands(id), name TEXT NOT NULL, type TEXT NOT NULL, content_schema_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS template_versions (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', template_id TEXT NOT NULL REFERENCES templates(id), version INTEGER NOT NULL, renderer_key TEXT NOT NULL, config_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', brand_id TEXT NOT NULL REFERENCES brands(id), template_id TEXT NOT NULL REFERENCES templates(id), prompt TEXT, content_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', brand_id TEXT NOT NULL REFERENCES brands(id), template_id TEXT NOT NULL REFERENCES templates(id), current_revision INTEGER NOT NULL, status TEXT NOT NULL, archived_at INTEGER, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS draft_revisions (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', draft_id TEXT NOT NULL REFERENCES drafts(id), revision INTEGER NOT NULL, template_version_id TEXT NOT NULL REFERENCES template_versions(id), format TEXT NOT NULL, content_json TEXT NOT NULL, prompt TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS draft_reviews (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', draft_revision_id TEXT NOT NULL REFERENCES draft_revisions(id), reviewer TEXT NOT NULL, status TEXT NOT NULL, notes TEXT, checks_json TEXT NOT NULL, asset_key TEXT, asset_content_type TEXT, width INTEGER, height INTEGER, sha256 TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS draft_approvals (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', draft_revision_id TEXT NOT NULL REFERENCES draft_revisions(id), review_id TEXT REFERENCES draft_reviews(id), actor TEXT NOT NULL, decision TEXT NOT NULL, notes TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS workspace_events (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, actor TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS mcp_tokens (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL, token_prefix TEXT NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, last_used_at INTEGER, revoked_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS workspace_assets (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, name TEXT NOT NULL, mime_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, sha256 TEXT NOT NULL, asset_key TEXT NOT NULL, archived_at INTEGER, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS renders (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default', post_id TEXT NOT NULL REFERENCES posts(id), draft_revision_id TEXT REFERENCES draft_revisions(id), template_version_id TEXT NOT NULL REFERENCES template_versions(id), parent_render_id TEXT, asset_key TEXT NOT NULL, asset_content_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, input_snapshot_json TEXT NOT NULL, sha256 TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_templates_brand_id ON templates(brand_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_template_version ON template_versions(template_id, version)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_drafts_brand_id ON drafts(brand_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_revisions_draft_revision ON draft_revisions(draft_id, revision)`,
    `CREATE INDEX IF NOT EXISTS idx_draft_reviews_revision ON draft_reviews(draft_revision_id)`,
    `CREATE INDEX IF NOT EXISTS idx_draft_approvals_revision ON draft_approvals(draft_revision_id)`,
    `CREATE INDEX IF NOT EXISTS idx_workspace_events_created_at ON workspace_events(workspace_id, created_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tokens_hash ON mcp_tokens(token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_mcp_tokens_workspace ON mcp_tokens(workspace_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_workspace_assets_workspace ON workspace_assets(workspace_id, created_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_assets_sha ON workspace_assets(workspace_id, sha256)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_created_at ON renders(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_post_id ON renders(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_parent_render_id ON renders(parent_render_id)`,
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));
  for (const table of ["brands", "templates", "template_versions", "posts", "drafts", "draft_revisions", "draft_reviews", "draft_approvals", "renders"]) {
    const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    if (!columns.results.some((column) => column.name === "workspace_id")) {
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'`).run();
    }
  }
  const renderColumns = await db.prepare("PRAGMA table_info(renders)").all<{ name: string }>();
  if (!renderColumns.results.some((column) => column.name === "draft_revision_id")) {
    await db.prepare("ALTER TABLE renders ADD COLUMN draft_revision_id TEXT REFERENCES draft_revisions(id)").run();
  }
  const reviewColumns = await db.prepare("PRAGMA table_info(draft_reviews)").all<{ name: string }>();
  for (const [name, type] of [["asset_key", "TEXT"], ["asset_content_type", "TEXT"], ["width", "INTEGER"], ["height", "INTEGER"], ["sha256", "TEXT"]] as const) {
    if (!reviewColumns.results.some((column) => column.name === name)) await db.prepare(`ALTER TABLE draft_reviews ADD COLUMN ${name} ${type}`).run();
  }
  const approvalColumns = await db.prepare("PRAGMA table_info(draft_approvals)").all<{ name: string }>();
  if (!approvalColumns.results.some((column) => column.name === "review_id")) await db.prepare("ALTER TABLE draft_approvals ADD COLUMN review_id TEXT REFERENCES draft_reviews(id)").run();

  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS idx_brands_workspace ON brands(workspace_id, name)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_templates_workspace ON templates(workspace_id, brand_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_posts_workspace ON posts(workspace_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_drafts_workspace ON drafts(workspace_id, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_renders_workspace ON renders(workspace_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_draft_approvals_review ON draft_approvals(review_id)"),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

async function seedWorkspace(workspaceId: string) {
  const db = database();
  const createdAt = Date.UTC(2026, 7, 18);
  const contentSchema = JSON.stringify({ eyebrow: { type: "string", maxLength: 28 }, headline: { type: "string", maxLength: 84 }, support: { type: "string", maxLength: 150 } });
  const brandId = physicalId(workspaceId, brand.id);
  const statementId = physicalId(workspaceId, "statement");
  const signalId = physicalId(workspaceId, "signal");
  const compositionStatements = (Object.entries(compositionTemplateIds) as Array<[CompositionId, string]>).flatMap(([compositionId, templateId]) => {
    const definition = compositions[compositionId];
    const storedTemplateId = physicalId(workspaceId, templateId);
    const schema = JSON.stringify({ required: definition.requiredFields, optional: definition.optionalFields, blocks: definition.blocks });
    return [
      db.prepare("INSERT OR IGNORE INTO templates (id, workspace_id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(storedTemplateId, workspaceId, brandId, definition.name, compositionId, schema, createdAt),
      db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@1`, workspaceId, storedTemplateId, 1, compositionId, JSON.stringify({ description: definition.purpose, composition: definition }), createdAt),
      db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@2`, workspaceId, storedTemplateId, 2, compositionId, JSON.stringify({ description: definition.purpose, composition: definition, designRevision: "blindspot-quality-pass-v2" }), createdAt + 1),
      db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@3`, workspaceId, storedTemplateId, 3, compositionId, JSON.stringify({ description: definition.purpose, composition: definition, designRevision: "object-led-beta-v3" }), createdAt + 2),
      db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@4`, workspaceId, storedTemplateId, 4, compositionId, JSON.stringify({ description: definition.purpose, composition: definition, designRevision: "deterministic-surfaces-and-contrast-v4" }), createdAt + 3),
      db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@5`, workspaceId, storedTemplateId, 5, compositionId, JSON.stringify({ description: definition.purpose, composition: definition, designRevision: "responsive-headline-fit-v5" }), createdAt + 4),
    ];
  });
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO brands (id, workspace_id, name, config_json, created_at) VALUES (?, ?, ?, ?, ?)").bind(brandId, workspaceId, brand.name, JSON.stringify(brand), createdAt),
    db.prepare("INSERT OR IGNORE INTO templates (id, workspace_id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(statementId, workspaceId, brandId, templates.statement.name, "statement", contentSchema, createdAt),
    db.prepare("INSERT OR IGNORE INTO templates (id, workspace_id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(signalId, workspaceId, brandId, templates.signal.name, "signal", contentSchema, createdAt),
    db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${statementId}@1`, workspaceId, statementId, 1, "statement", JSON.stringify(templates.statement), createdAt),
    db.prepare("INSERT OR IGNORE INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${signalId}@1`, workspaceId, signalId, 1, "signal", JSON.stringify(templates.signal), createdAt),
    ...compositionStatements,
  ]);
  const seededBrand = await db.prepare("SELECT config_json FROM brands WHERE id = ? AND workspace_id = ? LIMIT 1").bind(brandId, workspaceId).first<{ config_json: string }>();
  if (seededBrand) {
    const existingConfig = JSON.parse(String(seededBrand.config_json)) as Partial<BrandConfig>;
    const expandedConfig = brandConfigSchema.parse({ ...brand, ...existingConfig });
    await db.prepare("UPDATE brands SET config_json = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify(expandedConfig), brandId, workspaceId).run();
  }
}

async function recordWorkspaceEvent(workspaceId: string, action: string, entityType: string, entityId: string, actor: string, metadata: Record<string, unknown> = {}) {
  const createdAt = Date.now();
  await database().prepare("INSERT INTO workspace_events (id, workspace_id, action, entity_type, entity_id, actor, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), workspaceId, action, entityType, entityId, actor, JSON.stringify(metadata), createdAt).run();
  console.log(JSON.stringify({ timestamp: new Date(createdAt).toISOString(), service: "nocanva", event: action, workspaceId, entityType, entityId, actor, ...metadata }));
}

export async function recordDraftOpened(id: string, actor: string, workspaceId = defaultWorkspaceId()) {
  await ensureMediaDatabase(workspaceId);
  const draft = await getDraftById(id, workspaceId);
  if (!draft) return;
  await recordWorkspaceEvent(workspaceId, "draft_opened", "draft", id, actor, { revision: draft.currentRevision, status: draft.status });
}

export async function getActivationSummary(workspaceId = defaultWorkspaceId()): Promise<ActivationSummary> {
  await ensureMediaDatabase(workspaceId);
  const [counts, events] = await Promise.all([
    database().prepare("SELECT (SELECT COUNT(*) FROM brands WHERE workspace_id = ?) AS brand_count, (SELECT COUNT(*) FROM templates WHERE workspace_id = ?) AS template_count").bind(workspaceId, workspaceId).first<D1Row>(),
    database().prepare(`SELECT
      COUNT(DISTINCT CASE WHEN action = 'draft_created' THEN entity_id END) AS drafts_created,
      COUNT(DISTINCT CASE WHEN action = 'draft_opened' THEN entity_id END) AS drafts_opened,
      COUNT(DISTINCT CASE WHEN action = 'render_completed' THEN entity_id END) AS renders_completed,
      MIN(CASE WHEN action = 'draft_created' THEN created_at END) AS first_draft_at,
      MIN(CASE WHEN action = 'render_completed' AND created_at >= (SELECT MIN(created_at) FROM workspace_events draft_events WHERE draft_events.workspace_id = ? AND draft_events.action = 'draft_created') THEN created_at END) AS first_render_at,
      MAX(CASE WHEN actor LIKE 'agent:%' THEN 1 ELSE 0 END) AS agent_activity
      FROM workspace_events WHERE workspace_id = ?`).bind(workspaceId, workspaceId).first<D1Row>(),
  ]);
  const firstDraftAt = events?.first_draft_at == null ? null : Number(events.first_draft_at);
  const firstRenderAt = events?.first_render_at == null ? null : Number(events.first_render_at);
  return {
    brandCount: Number(counts?.brand_count ?? 0), templateCount: Number(counts?.template_count ?? 0), agentActivity: Number(events?.agent_activity ?? 0) === 1,
    draftsCreated: Number(events?.drafts_created ?? 0), draftsOpened: Number(events?.drafts_opened ?? 0), rendersCompleted: Number(events?.renders_completed ?? 0),
    firstDraftAt, firstRenderAt, timeToFirstRenderMs: firstDraftAt != null && firstRenderAt != null && firstRenderAt >= firstDraftAt ? firstRenderAt - firstDraftAt : null,
  };
}

export async function listManagedMcpTokens(workspaceId = defaultWorkspaceId()): Promise<ManagedMcpToken[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare("SELECT id, name, token_prefix, created_by, created_at, last_used_at, revoked_at FROM mcp_tokens WHERE workspace_id = ? ORDER BY created_at DESC").bind(workspaceId).all<D1Row>();
  return result.results.map(mapManagedMcpToken);
}

export async function createManagedMcpToken(name: string, actor: string, workspaceId = defaultWorkspaceId()): Promise<{ token: string; record: ManagedMcpToken }> {
  await ensureMediaDatabase(workspaceId);
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 60) throw new Error("Token name must contain 1 to 60 characters.");
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = `ncv_${bytesToBase64Url(random)}`;
  const tokenHash = await sha256Text(token);
  const id = crypto.randomUUID();
  const now = Date.now();
  await database().prepare("INSERT INTO mcp_tokens (id, workspace_id, name, token_hash, token_prefix, created_by, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)")
    .bind(id, workspaceId, normalizedName, tokenHash, `${token.slice(0, 12)}…`, actor, now).run();
  await recordWorkspaceEvent(workspaceId, "mcp_token_created", "mcp_token", id, actor, { name: normalizedName });
  return { token, record: { id, name: normalizedName, tokenPrefix: `${token.slice(0, 12)}…`, createdBy: actor, createdAt: now, lastUsedAt: null, revokedAt: null } };
}

export async function revokeManagedMcpToken(id: string, actor: string, workspaceId = defaultWorkspaceId()): Promise<ManagedMcpToken> {
  await ensureMediaDatabase(workspaceId);
  const now = Date.now();
  await database().prepare("UPDATE mcp_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ? AND workspace_id = ?").bind(now, id, workspaceId).run();
  const row = await database().prepare("SELECT id, name, token_prefix, created_by, created_at, last_used_at, revoked_at FROM mcp_tokens WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, workspaceId).first<D1Row>();
  if (!row) throw new Error("The MCP token does not exist.");
  await recordWorkspaceEvent(workspaceId, "mcp_token_revoked", "mcp_token", id, actor);
  return mapManagedMcpToken(row);
}

export async function authenticateManagedMcpToken(token: string): Promise<{ id: string; workspaceId: string } | null> {
  await ensureMediaDatabase();
  if (token.length < 24) return null;
  const tokenHash = await sha256Text(token);
  const row = await database().prepare("SELECT id, workspace_id FROM mcp_tokens WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1").bind(tokenHash).first<D1Row>();
  if (!row) return null;
  await database().prepare("UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?").bind(Date.now(), row.id).run();
  return { id: String(row.id), workspaceId: String(row.workspace_id) };
}

function mapManagedMcpToken(row: D1Row): ManagedMcpToken {
  return { id: String(row.id), name: String(row.name), tokenPrefix: String(row.token_prefix), createdBy: String(row.created_by), createdAt: Number(row.created_at), lastUsedAt: row.last_used_at == null ? null : Number(row.last_used_at), revokedAt: row.revoked_at == null ? null : Number(row.revoked_at) };
}

export async function listBrands(workspaceId = defaultWorkspaceId()): Promise<BrandRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare("SELECT id, name, config_json, created_at FROM brands WHERE workspace_id = ? ORDER BY name").bind(workspaceId).all<D1Row>();
  return result.results.map((row) => ({ id: logicalId(workspaceId, row.id), name: String(row.name), config: brandConfigSchema.parse(JSON.parse(String(row.config_json))), createdAt: Number(row.created_at) }));
}

export async function getBrandById(id: string, workspaceId = defaultWorkspaceId()): Promise<BrandRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare("SELECT id, name, config_json, created_at FROM brands WHERE id = ? AND workspace_id = ? LIMIT 1").bind(physicalId(workspaceId, id), workspaceId).first<D1Row>();
  return row ? { id: logicalId(workspaceId, row.id), name: String(row.name), config: brandConfigSchema.parse(JSON.parse(String(row.config_json))), createdAt: Number(row.created_at) } : null;
}

export async function createBrand(value: unknown, workspaceId = defaultWorkspaceId()): Promise<BrandRecord> {
  await ensureMediaDatabase(workspaceId);
  const config = brandConfigSchema.parse(value);
  const now = Date.now();
  await database().prepare("INSERT INTO brands (id, workspace_id, name, config_json, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, config_json = excluded.config_json").bind(physicalId(workspaceId, config.id), workspaceId, config.name, JSON.stringify(config), now).run();
  const record = await getBrandById(config.id, workspaceId);
  if (!record) throw new Error("The brand record could not be read after creation.");
  return record;
}

export async function listTemplates(workspaceId = defaultWorkspaceId()): Promise<TemplateRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare(`SELECT t.id, t.brand_id, t.name, t.type, t.content_schema_json, t.created_at, tv.version, tv.renderer_key, tv.config_json FROM templates t JOIN template_versions tv ON tv.template_id = t.id WHERE t.workspace_id = ? AND tv.workspace_id = ? ORDER BY t.name, tv.version DESC`).bind(workspaceId, workspaceId).all<D1Row>();
  return result.results.map((row) => mapTemplate(row, workspaceId));
}

export async function getTemplateById(id: string, workspaceId = defaultWorkspaceId()): Promise<TemplateRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare(`SELECT t.id, t.brand_id, t.name, t.type, t.content_schema_json, t.created_at, tv.version, tv.renderer_key, tv.config_json FROM templates t JOIN template_versions tv ON tv.template_id = t.id WHERE t.id = ? AND t.workspace_id = ? AND tv.workspace_id = ? ORDER BY tv.version DESC LIMIT 1`).bind(physicalId(workspaceId, id), workspaceId, workspaceId).first<D1Row>();
  return row ? mapTemplate(row, workspaceId) : null;
}

export async function getTemplateVersionById(id: string, workspaceId = defaultWorkspaceId()): Promise<TemplateRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const separator = id.lastIndexOf("@");
  const storedId = separator < 0 ? physicalId(workspaceId, id) : `${physicalId(workspaceId, id.slice(0, separator))}${id.slice(separator)}`;
  const row = await database().prepare(`SELECT t.id, t.brand_id, t.name, t.type, t.content_schema_json, t.created_at, tv.version, tv.renderer_key, tv.config_json FROM templates t JOIN template_versions tv ON tv.template_id = t.id WHERE tv.id = ? AND t.workspace_id = ? AND tv.workspace_id = ? LIMIT 1`).bind(storedId, workspaceId, workspaceId).first<D1Row>();
  return row ? mapTemplate(row, workspaceId) : null;
}

function mapTemplate(row: D1Row, workspaceId: string): TemplateRecord {
  const config = JSON.parse(String(row.config_json)) as { description?: unknown; layout?: unknown };
  return {
    id: logicalId(workspaceId, row.id), brandId: logicalId(workspaceId, row.brand_id), name: String(row.name), type: String(row.type),
    description: String(config.description ?? "Structured editorial template."),
    version: Number(row.version), rendererKey: rendererKeySchema.parse(row.renderer_key), layout: config.layout ? posterLayoutSchema.parse(config.layout) : undefined,
    contentSchema: JSON.parse(String(row.content_schema_json)), createdAt: Number(row.created_at),
  };
}

export async function createTemplate(value: unknown, workspaceId = defaultWorkspaceId()): Promise<TemplateRecord> {
  await ensureMediaDatabase(workspaceId);
  const input: TemplateInput = templateCreateSchema.parse(value);
  const brandRecord = await getBrandById(input.brandId, workspaceId);
  if (!brandRecord) throw new Error("Create the brand before creating its template.");
  const db = database();
  const storedTemplateId = physicalId(workspaceId, input.id);
  const storedBrandId = physicalId(workspaceId, input.brandId);
  const existing = await db.prepare("SELECT id, brand_id FROM templates WHERE id = ? AND workspace_id = ? LIMIT 1").bind(storedTemplateId, workspaceId).first<D1Row>();
  if (existing && String(existing.brand_id) !== storedBrandId) throw new Error("That template ID belongs to another brand.");
  const latest = await db.prepare("SELECT MAX(version) AS version FROM template_versions WHERE template_id = ? AND workspace_id = ?").bind(storedTemplateId, workspaceId).first<{ version: number | null }>();
  const version = Number(latest?.version ?? 0) + 1;
  const now = Date.now();
  const contentSchema = JSON.stringify({ eyebrow: { type: "string", maxLength: 28 }, headline: { type: "string", maxLength: 84 }, support: { type: "string", maxLength: 150 } });
  const statements = [
    db.prepare("INSERT INTO template_versions (id, workspace_id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${storedTemplateId}@${version}`, workspaceId, storedTemplateId, version, input.rendererKey, JSON.stringify({ description: input.description, layout: input.layout }), now),
  ];
  if (existing) {
    statements.unshift(db.prepare("UPDATE templates SET name = ?, type = ?, content_schema_json = ? WHERE id = ? AND workspace_id = ?").bind(input.name, input.rendererKey, contentSchema, storedTemplateId, workspaceId));
  } else {
    statements.unshift(db.prepare("INSERT INTO templates (id, workspace_id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(storedTemplateId, workspaceId, storedBrandId, input.name, input.rendererKey, contentSchema, now));
  }
  await db.batch(statements);
  const record = await getTemplateById(input.id, workspaceId);
  if (!record) throw new Error("The template record could not be read after creation.");
  return record;
}

async function validatePayloadReferences(payload: PostPayload, workspaceId: string) {
  const [brandRecord, templateRecord] = await Promise.all([getBrandById(payload.brandId, workspaceId), getTemplateById(payload.templateId, workspaceId)]);
  if (!brandRecord) throw new Error("The selected brand does not exist.");
  if (!templateRecord) throw new Error("The selected template does not exist.");
  if (templateRecord.brandId !== brandRecord.id) throw new Error("The selected template does not belong to the selected brand.");
  const composition = compositionFromTemplateId(templateRecord.id);
  if (payload.compositionId && payload.compositionId !== composition) throw new Error("The composition ID does not match the selected template.");
  const direction = payload.content.visualDirection ? visualDirections[payload.content.visualDirection] : undefined;
  if (direction && composition && !direction.compatibleCompositions.includes(composition)) throw new Error(`Visual direction ${direction.id} is not compatible with composition ${composition}.`);
  if (direction?.requiresImage && !payload.content.image) throw new Error(`Visual direction ${direction.id} requires a source image or screenshot.`);
  if (composition === "real_but" && !payload.content.image) throw new Error("The Real, but… composition requires a source image.");
  if (composition === "receipt" && (!payload.content.image || !payload.content.evidence)) throw new Error("The Receipt composition requires both an evidence image and source detail.");
  if (composition === "product" && !payload.content.image) throw new Error("The Product composition requires a real product screenshot.");
  if (composition === "whats_missing" && payload.format !== "portrait") throw new Error("The What’s missing composition is a portrait carousel narrative.");
  if (composition === "explainer" && (payload.format !== "portrait" || !payload.content.steps)) throw new Error("The Explainer composition requires portrait format and three to five steps.");
  await validateContentAssets([payload.content], workspaceId);
}

const draftSelect = `SELECT d.id, d.brand_id, d.template_id, d.current_revision, d.status, d.archived_at, d.created_by, d.created_at, d.updated_at, dr.id AS revision_id, dr.template_version_id, dr.format, dr.content_json, dr.prompt, dr.created_by AS revision_created_by, tv.version AS template_version, b.name AS brand_name, t.name AS template_name FROM drafts d JOIN draft_revisions dr ON dr.draft_id = d.id AND dr.revision = d.current_revision JOIN template_versions tv ON tv.id = dr.template_version_id JOIN brands b ON b.id = d.brand_id JOIN templates t ON t.id = d.template_id`;

function parseDraftSnapshot(value: string): { content: PostPayload["content"]; layout?: DraftLayout } {
  const stored = JSON.parse(value) as { content?: unknown; layout?: unknown } | PostPayload["content"];
  if (stored && typeof stored === "object" && "content" in stored) {
    return {
      content: postPayloadSchema.shape.content.parse(stored.content),
      ...(stored.layout ? { layout: draftLayoutSchema.parse(stored.layout) } : {}),
    };
  }
  return { content: postPayloadSchema.shape.content.parse(stored) };
}

function serializeDraftSnapshot(payload: PostPayload) {
  return JSON.stringify({ content: payload.content, ...(payload.layout ? { layout: draftLayoutSchema.parse(payload.layout) } : {}) });
}

async function mapDraft(row: D1Row, workspaceId: string): Promise<DraftRecord> {
  const revisionId = String(row.revision_id);
  const snapshot = parseDraftSnapshot(String(row.content_json));
  const [reviewRow, approvalRow] = await Promise.all([
    database().prepare("SELECT id, reviewer, status, notes, checks_json, width, height, sha256, created_at FROM draft_reviews WHERE draft_revision_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1").bind(revisionId, workspaceId).first<D1Row>(),
    database().prepare("SELECT id, review_id, actor, decision, notes, created_at FROM draft_approvals WHERE draft_revision_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1").bind(revisionId, workspaceId).first<D1Row>(),
  ]);
  const payload = postPayloadSchema.parse({
    brandId: logicalId(workspaceId, row.brand_id),
    templateId: logicalId(workspaceId, row.template_id),
    compositionId: compositionFromTemplateId(logicalId(workspaceId, row.template_id)),
    format: row.format,
    content: snapshot.content,
    ...(snapshot.layout ? { layout: snapshot.layout } : {}),
  });
  return {
    id: String(row.id), brandId: payload.brandId, brandName: String(row.brand_name), templateId: payload.templateId,
    templateName: String(row.template_name), templateVersionId: logicalId(workspaceId, row.template_version_id), templateVersion: Number(row.template_version),
    currentRevision: Number(row.current_revision), revisionId, status: draftStatusSchema.parse(row.status), approvalPolicy: approvalPolicy(),
    archivedAt: row.archived_at == null ? null : Number(row.archived_at), prompt: row.prompt ? String(row.prompt) : null, payload,
    createdBy: String(row.created_by), revisionCreatedBy: String(row.revision_created_by), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
    review: reviewRow ? {
      id: String(reviewRow.id), reviewer: String(reviewRow.reviewer), status: reviewRow.status === "passed" ? "passed" : "changes_requested",
      notes: reviewRow.notes ? String(reviewRow.notes) : null, checks: JSON.parse(String(reviewRow.checks_json)) as DraftCheck[],
      width: Number(reviewRow.width), height: Number(reviewRow.height), sha256: String(reviewRow.sha256 ?? ""), createdAt: Number(reviewRow.created_at),
    } : null,
    approval: approvalRow ? {
      id: String(approvalRow.id), reviewId: approvalRow.review_id ? String(approvalRow.review_id) : null, actor: String(approvalRow.actor), decision: approvalRow.decision === "approved" ? "approved" : "rejected",
      notes: approvalRow.notes ? String(approvalRow.notes) : null, createdAt: Number(approvalRow.created_at),
    } : null,
  };
}

export async function listDrafts(limit = 30, includeArchived = false, workspaceId = defaultWorkspaceId()): Promise<DraftRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const where = includeArchived ? " WHERE d.workspace_id = ?" : " WHERE d.workspace_id = ? AND d.archived_at IS NULL";
  const result = await database().prepare(`${draftSelect}${where} ORDER BY d.updated_at DESC LIMIT ?`).bind(workspaceId, Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return Promise.all(result.results.map((row) => mapDraft(row, workspaceId)));
}

export async function getDraftById(id: string, workspaceId = defaultWorkspaceId()): Promise<DraftRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare(`${draftSelect} WHERE d.id = ? AND d.workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<D1Row>();
  return row ? mapDraft(row, workspaceId) : null;
}

export async function listDraftRevisions(id: string, workspaceId = defaultWorkspaceId()): Promise<DraftRevisionRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare("SELECT id, revision, template_version_id, format, content_json, prompt, created_by, created_at FROM draft_revisions WHERE draft_id = ? AND workspace_id = ? ORDER BY revision DESC").bind(id, workspaceId).all<D1Row>();
  return result.results.map((row) => {
    const snapshot = parseDraftSnapshot(String(row.content_json));
    return {
      id: String(row.id), revision: Number(row.revision), templateVersionId: logicalId(workspaceId, row.template_version_id),
      format: postPayloadSchema.shape.format.parse(row.format), content: snapshot.content, ...(snapshot.layout ? { layout: snapshot.layout } : {}),
      prompt: row.prompt ? String(row.prompt) : null, createdBy: String(row.created_by), createdAt: Number(row.created_at),
    };
  });
}

export async function createDraft(input: { value: unknown; createdBy?: string }, workspaceId = defaultWorkspaceId()): Promise<DraftRecord> {
  await ensureMediaDatabase(workspaceId);
  const parsed = draftCreateInputSchema.parse(input.value);
  await validatePayloadReferences(parsed.payload, workspaceId);
  const template = await getTemplateById(parsed.payload.templateId, workspaceId);
  if (!template) throw new Error("The selected template does not exist.");
  const id = crypto.randomUUID();
  const revision = 1;
  const now = Date.now();
  const actor = input.createdBy ?? "human:workspace";
  await database().batch([
    database().prepare("INSERT INTO drafts (id, workspace_id, brand_id, template_id, current_revision, status, archived_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, workspaceId, physicalId(workspaceId, parsed.payload.brandId), physicalId(workspaceId, parsed.payload.templateId), revision, "draft", null, actor, now, now),
    database().prepare("INSERT INTO draft_revisions (id, workspace_id, draft_id, revision, template_version_id, format, content_json, prompt, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`${id}@${revision}`, workspaceId, id, revision, `${physicalId(workspaceId, template.id)}@${template.version}`, parsed.payload.format, serializeDraftSnapshot(parsed.payload), parsed.prompt?.trim() || null, actor, now),
  ]);
  const record = await getDraftById(id, workspaceId);
  if (!record) throw new Error("The draft could not be read after creation.");
  await recordWorkspaceEvent(workspaceId, "draft_created", "draft", id, actor, { revision, templateVersionId: record.templateVersionId });
  return record;
}

export async function updateDraft(id: string, input: { value: unknown; createdBy?: string }, workspaceId = defaultWorkspaceId()): Promise<DraftRecord> {
  await ensureMediaDatabase(workspaceId);
  const parsed = draftUpdateInputSchema.parse(input.value);
  const current = await getDraftById(id, workspaceId);
  if (!current) throw new Error("The draft does not exist.");
  if (current.archivedAt) throw new Error("Restore the draft before editing it.");
  if (parsed.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${parsed.expectedRevision}, current revision is ${current.currentRevision}.`);
  await validatePayloadReferences(parsed.payload, workspaceId);
  const template = await getTemplateById(parsed.payload.templateId, workspaceId);
  if (!template) throw new Error("The selected template does not exist.");
  const revision = current.currentRevision + 1;
  const now = Date.now();
  const actor = input.createdBy ?? "human:workspace";
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO draft_revisions (id, workspace_id, draft_id, revision, template_version_id, format, content_json, prompt, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`${id}@${revision}`, workspaceId, id, revision, `${physicalId(workspaceId, template.id)}@${template.version}`, parsed.payload.format, serializeDraftSnapshot(parsed.payload), parsed.prompt?.trim() || null, actor, now),
    db.prepare("UPDATE drafts SET brand_id = ?, template_id = ?, current_revision = ?, status = 'draft', updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(physicalId(workspaceId, parsed.payload.brandId), physicalId(workspaceId, parsed.payload.templateId), revision, now, id, workspaceId, current.currentRevision),
  ]);
  const record = await getDraftById(id, workspaceId);
  if (!record || record.currentRevision !== revision) throw new Error("The draft changed while the update was being saved.");
  await recordWorkspaceEvent(workspaceId, "draft_updated", "draft", id, actor, { revision, templateVersionId: record.templateVersionId });
  return record;
}

export async function recordDraftReview(id: string, input: { expectedRevision: number; reviewer: string; notes?: string | null; checks: DraftCheck[]; png: ArrayBuffer }, workspaceId = defaultWorkspaceId()): Promise<DraftRecord> {
  await ensureMediaDatabase(workspaceId);
  const current = await getDraftById(id, workspaceId);
  if (!current) throw new Error("The draft does not exist.");
  if (current.archivedAt) throw new Error("Restore the draft before reviewing it.");
  if (input.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${input.expectedRevision}, current revision is ${current.currentRevision}.`);
  if (!input.checks.length) throw new Error("Review checks are required.");
  const dimensions = formats[current.payload.format];
  validatePng(input.png, dimensions.width, dimensions.height);
  const passed = input.checks.every((check) => check.passed);
  const now = Date.now();
  const db = database();
  const reviewId = crypto.randomUUID();
  const assetKey = `workspaces/${workspaceId}/reviews/${current.revisionId}/${reviewId}.png`;
  const sha256 = await sha256Hex(input.png);
  await mediaBucket().put(assetKey, input.png, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { sha256 } });
  try {
    await db.batch([
      db.prepare("INSERT INTO draft_reviews (id, workspace_id, draft_revision_id, reviewer, status, notes, checks_json, asset_key, asset_content_type, width, height, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(reviewId, workspaceId, current.revisionId, input.reviewer, passed ? "passed" : "changes_requested", input.notes?.trim() || null, JSON.stringify(input.checks), assetKey, "image/png", dimensions.width, dimensions.height, sha256, now),
      db.prepare("UPDATE drafts SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(passed ? "in_review" : "draft", now, id, workspaceId, current.currentRevision),
    ]);
  } catch (error) {
    await mediaBucket().delete(assetKey);
    throw error;
  }
  const record = await getDraftById(id, workspaceId);
  if (!record) throw new Error("The reviewed draft could not be read.");
  await recordWorkspaceEvent(workspaceId, "draft_reviewed", "draft", id, input.reviewer, { revision: current.currentRevision, reviewId, passed, sha256, width: dimensions.width, height: dimensions.height });
  return record;
}

export async function decideDraft(id: string, input: { expectedRevision: number; actor: string; decision: unknown; notes?: string | null }, workspaceId = defaultWorkspaceId()): Promise<DraftRecord> {
  await ensureMediaDatabase(workspaceId);
  const decision = draftDecisionSchema.parse(input.decision);
  const current = await getDraftById(id, workspaceId);
  if (!current) throw new Error("The draft does not exist.");
  if (current.archivedAt) throw new Error("Restore the draft before approving it.");
  if (input.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${input.expectedRevision}, current revision is ${current.currentRevision}.`);
  if (decision === "approved" && current.review?.status !== "passed") throw new Error("A passing mechanical review is required before approval.");
  if (decision === "approved" && approvalPolicy() === "human_required" && !input.actor.startsWith("human:")) throw new Error("This workspace requires a human approval actor.");
  const now = Date.now();
  const db = database();
  await db.batch([
    db.prepare("INSERT INTO draft_approvals (id, workspace_id, draft_revision_id, review_id, actor, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), workspaceId, current.revisionId, current.review?.id ?? null, input.actor, decision, input.notes?.trim() || null, now),
    db.prepare("UPDATE drafts SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(decision === "approved" ? "approved" : "draft", now, id, workspaceId, current.currentRevision),
  ]);
  const record = await getDraftById(id, workspaceId);
  if (!record) throw new Error("The approved draft could not be read.");
  await recordWorkspaceEvent(workspaceId, "draft_decided", "draft", id, input.actor, { revision: current.currentRevision, decision });
  return record;
}

export async function setDraftArchived(id: string, archived: boolean, actor = "human:workspace", workspaceId = defaultWorkspaceId()): Promise<DraftRecord> {
  await ensureMediaDatabase(workspaceId);
  const current = await getDraftById(id, workspaceId);
  if (!current) throw new Error("The draft does not exist.");
  const now = Date.now();
  await database().prepare("UPDATE drafts SET archived_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(archived ? now : null, now, id, workspaceId).run();
  const record = await getDraftById(id, workspaceId);
  if (!record) throw new Error("The archived draft could not be read.");
  await recordWorkspaceEvent(workspaceId, archived ? "draft_archived" : "draft_restored", "draft", id, actor);
  return record;
}

const postSelect = `SELECT id, brand_id, template_id, prompt, content_json, created_by, created_at FROM posts`;

function mapPost(row: D1Row, workspaceId: string): PostRecord {
  const stored = JSON.parse(String(row.content_json)) as { format?: unknown; content?: unknown; layout?: unknown } | PostPayload["content"];
  const payload = postPayloadSchema.parse({
    brandId: logicalId(workspaceId, row.brand_id),
    templateId: logicalId(workspaceId, row.template_id),
    format: "format" in stored ? stored.format : "portrait",
    content: "content" in stored ? stored.content : stored,
    ...(stored && typeof stored === "object" && "layout" in stored && stored.layout ? { layout: stored.layout } : {}),
  });
  return {
    id: String(row.id), brandId: payload.brandId, templateId: payload.templateId,
    prompt: row.prompt ? String(row.prompt) : null, payload, createdBy: String(row.created_by), createdAt: Number(row.created_at),
  };
}

export async function listPosts(limit = 30, workspaceId = defaultWorkspaceId()): Promise<PostRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare(`${postSelect} WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`).bind(workspaceId, Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return result.results.map((row) => mapPost(row, workspaceId));
}

export async function getPostById(id: string, workspaceId = defaultWorkspaceId()): Promise<PostRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare(`${postSelect} WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<D1Row>();
  return row ? mapPost(row, workspaceId) : null;
}

export async function createPost(input: { payload: unknown; prompt?: string | null; createdBy?: string }, workspaceId = defaultWorkspaceId()): Promise<PostRecord> {
  await ensureMediaDatabase(workspaceId);
  const payload = postPayloadSchema.parse(input.payload);
  await validatePayloadReferences(payload, workspaceId);
  const id = crypto.randomUUID();
  const now = Date.now();
  await database().prepare("INSERT INTO posts (id, workspace_id, brand_id, template_id, prompt, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, workspaceId, physicalId(workspaceId, payload.brandId), physicalId(workspaceId, payload.templateId), input.prompt?.trim() || null, JSON.stringify({ format: payload.format, content: payload.content, ...(payload.layout ? { layout: payload.layout } : {}) }), input.createdBy ?? "human:workspace", now)
    .run();
  const record = await getPostById(id, workspaceId);
  if (!record) throw new Error("The post record could not be read after creation.");
  return record;
}

const renderSelect = `SELECT r.id, r.post_id, r.draft_revision_id, r.template_version_id, r.parent_render_id, r.width, r.height, r.sha256, r.created_at, r.input_snapshot_json, b.name AS brand_name, t.name AS template_name, tv.version AS template_version FROM renders r JOIN posts p ON p.id = r.post_id JOIN brands b ON b.id = p.brand_id JOIN templates t ON t.id = p.template_id JOIN template_versions tv ON tv.id = r.template_version_id`;

function mapRender(row: D1Row, workspaceId: string): RenderRecord {
  const payload = postPayloadSchema.parse(JSON.parse(String(row.input_snapshot_json)));
  const id = String(row.id);
  return {
    id, postId: String(row.post_id), draftRevisionId: row.draft_revision_id ? String(row.draft_revision_id) : null,
    templateVersionId: logicalId(workspaceId, row.template_version_id), parentRenderId: row.parent_render_id ? String(row.parent_render_id) : null,
    brandName: String(row.brand_name), templateName: String(row.template_name), templateVersion: Number(row.template_version),
    payload, width: Number(row.width), height: Number(row.height), sha256: String(row.sha256), createdAt: Number(row.created_at),
    assetUrl: `/api/renders/${id}/asset`,
  };
}

export async function listRenders(limit = 30, workspaceId = defaultWorkspaceId()): Promise<RenderRecord[]> {
  await ensureMediaDatabase(workspaceId);
  const result = await database().prepare(`${renderSelect} WHERE r.workspace_id = ? ORDER BY r.created_at DESC LIMIT ?`).bind(workspaceId, Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return result.results.map((row) => mapRender(row, workspaceId));
}

export async function getRenderById(id: string, workspaceId = defaultWorkspaceId()): Promise<RenderRecord | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare(`${renderSelect} WHERE r.id = ? AND r.workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<D1Row>();
  return row ? mapRender(row, workspaceId) : null;
}

export async function createRender(input: { payload: unknown; png?: ArrayBuffer; postId?: string | null; draftRevisionId?: string | null; templateVersionId?: string | null; parentRenderId?: string | null; createdBy?: string }, workspaceId = defaultWorkspaceId()): Promise<RenderRecord> {
  await ensureMediaDatabase(workspaceId);
  const payload = postPayloadSchema.parse(input.payload);
  await validatePayloadReferences(payload, workspaceId);
  const dimensions = formats[payload.format];

  const now = Date.now();
  const postId = input.postId ?? crypto.randomUUID();
  const renderId = crypto.randomUUID();
  const assetKey = `workspaces/${workspaceId}/renders/${renderId}.png`;
  const db = database();
  const currentTemplate = await getTemplateById(payload.templateId, workspaceId);
  const logicalTemplateVersionId = input.templateVersionId ?? (currentTemplate ? `${currentTemplate.id}@${currentTemplate.version}` : null);
  if (!logicalTemplateVersionId) throw new Error("The selected template version does not exist.");
  const templateVersion = await getTemplateVersionById(logicalTemplateVersionId, workspaceId);
  if (!templateVersion || templateVersion.id !== payload.templateId) throw new Error("The pinned template version does not belong to the render payload.");
  const separator = logicalTemplateVersionId.lastIndexOf("@");
  const templateVersionId = `${physicalId(workspaceId, logicalTemplateVersionId.slice(0, separator))}${logicalTemplateVersionId.slice(separator)}`;
  let draftForRender: DraftRecord | null = null;
  let png = input.png;
  if (input.draftRevisionId) {
    const revision = await db.prepare("SELECT draft_id FROM draft_revisions WHERE id = ? AND workspace_id = ? LIMIT 1").bind(input.draftRevisionId, workspaceId).first<{ draft_id: string }>();
    if (!revision) throw new Error("The draft revision does not exist.");
    draftForRender = await getDraftById(revision.draft_id, workspaceId);
    if (!draftForRender || draftForRender.revisionId !== input.draftRevisionId) throw new Error("Only the current draft revision can be rendered.");
    if (!['approved', 'rendered'].includes(draftForRender.status)) throw new Error("Approve the current draft revision before rendering it.");
    if (draftForRender.templateVersionId !== logicalTemplateVersionId) throw new Error("The render must use the draft's pinned template version.");
    if (JSON.stringify(draftForRender.payload) !== JSON.stringify(payload)) throw new Error("The render payload must match the stored draft revision.");
    if (draftForRender.approval?.decision !== "approved" || !draftForRender.approval.reviewId) throw new Error("Review and approve this revision again before rendering it.");
    if (!draftForRender.review || draftForRender.review.id !== draftForRender.approval.reviewId) throw new Error("The approval does not pin the current review artifact.");
    const reviewArtifact = await db.prepare("SELECT asset_key, width, height, sha256 FROM draft_reviews WHERE id = ? AND draft_revision_id = ? AND workspace_id = ? LIMIT 1")
      .bind(draftForRender.approval.reviewId, input.draftRevisionId, workspaceId).first<{ asset_key: string | null; width: number | null; height: number | null; sha256: string | null }>();
    if (!reviewArtifact?.asset_key || !reviewArtifact.sha256) throw new Error("The approved review has no immutable PNG artifact. Review and approve this revision again.");
    if (reviewArtifact.width !== dimensions.width || reviewArtifact.height !== dimensions.height) throw new Error("The approved review artifact dimensions do not match the draft format.");
    const storedArtifact = await mediaBucket().get(reviewArtifact.asset_key);
    if (!storedArtifact) throw new Error("The approved review artifact is unavailable.");
    png = await storedArtifact.arrayBuffer();
    validatePng(png, dimensions.width, dimensions.height);
    if (await sha256Hex(png) !== reviewArtifact.sha256) throw new Error("The approved review artifact failed its SHA-256 integrity check.");
  }
  if (!png) throw new Error("A PNG is required when rendering without an approved draft review artifact.");
  validatePng(png, dimensions.width, dimensions.height);
  const sha256 = await sha256Hex(png);
  if (input.postId) {
    const post = await getPostById(input.postId, workspaceId);
    if (!post) throw new Error("The post does not exist.");
    if (JSON.stringify(post.payload) !== JSON.stringify(payload)) throw new Error("The render payload must match the stored post.");
  }
  if (input.parentRenderId) {
    const parent = await db.prepare("SELECT id FROM renders WHERE id = ? AND workspace_id = ? LIMIT 1").bind(input.parentRenderId, workspaceId).first();
    if (!parent) throw new Error("The parent render does not exist.");
  }

  await mediaBucket().put(assetKey, png, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { sha256 } });
  try {
    const statements = [
      db.prepare("INSERT INTO renders (id, workspace_id, post_id, draft_revision_id, template_version_id, parent_render_id, asset_key, asset_content_type, width, height, input_snapshot_json, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(renderId, workspaceId, postId, input.draftRevisionId ?? null, templateVersionId, input.parentRenderId ?? null, assetKey, "image/png", dimensions.width, dimensions.height, JSON.stringify(payload), sha256, now),
    ];
    if (!input.postId) {
      statements.unshift(db.prepare("INSERT INTO posts (id, workspace_id, brand_id, template_id, prompt, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(postId, workspaceId, physicalId(workspaceId, payload.brandId), physicalId(workspaceId, payload.templateId), null, JSON.stringify({ format: payload.format, content: payload.content, ...(payload.layout ? { layout: payload.layout } : {}) }), input.createdBy ?? "human:workspace", now));
    }
    if (draftForRender) statements.push(db.prepare("UPDATE drafts SET status = 'rendered', updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(now, draftForRender.id, workspaceId, draftForRender.currentRevision));
    await db.batch(statements);
  } catch (error) {
    await mediaBucket().delete(assetKey);
    throw error;
  }

  const record = await getRenderById(renderId, workspaceId);
  if (!record) throw new Error("The render record could not be read after creation.");
  await recordWorkspaceEvent(workspaceId, "render_completed", "render", renderId, input.createdBy ?? "human:workspace", { draftRevisionId: input.draftRevisionId ?? null, sha256, width: dimensions.width, height: dimensions.height });
  return record;
}

export async function getRenderAsset(id: string, workspaceId = defaultWorkspaceId()): Promise<R2ObjectBody | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare("SELECT asset_key FROM renders WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, workspaceId).first<{ asset_key: string }>();
  return row ? mediaBucket().get(row.asset_key) : null;
}

function validatePng(buffer: ArrayBuffer, width: number, height: number) {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error("A valid PNG file is required.");
  const view = new DataView(buffer);
  if (view.getUint32(16) !== width || view.getUint32(20) !== height) throw new Error(`PNG dimensions must be ${width} × ${height}.`);
}

async function sha256Hex(buffer: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(value: string) {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
