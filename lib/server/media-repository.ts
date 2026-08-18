import { env } from "cloudflare:workers";
import { brand, formats, postPayloadSchema, templates, type PostPayload } from "../media";

type D1Row = Record<string, unknown>;

export type BrandRecord = { id: string; name: string; config: typeof brand; createdAt: number };
export type TemplateRecord = { id: string; brandId: string; name: string; type: string; version: number; rendererKey: string; contentSchema: Record<string, unknown>; createdAt: number };
export type PostRecord = {
  id: string; brandId: string; templateId: string; prompt: string | null; payload: PostPayload;
  createdBy: string; createdAt: number;
};
export type RenderRecord = {
  id: string; postId: string; parentRenderId: string | null; brandName: string; templateName: string;
  templateVersion: number; payload: PostPayload; width: number; height: number; sha256: string;
  createdAt: number; assetUrl: string;
};

let initialized: Promise<void> | undefined;

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  return env.DB;
}

function mediaBucket(): R2Bucket {
  if (!env.MEDIA) throw new Error("R2 binding MEDIA is unavailable.");
  return env.MEDIA;
}

export function ensureMediaDatabase(): Promise<void> {
  initialized ??= initializeDatabase();
  return initialized;
}

async function initializeDatabase() {
  const db = database();
  const statements = [
    `CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, config_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY NOT NULL, brand_id TEXT NOT NULL REFERENCES brands(id), name TEXT NOT NULL, type TEXT NOT NULL, content_schema_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS template_versions (id TEXT PRIMARY KEY NOT NULL, template_id TEXT NOT NULL REFERENCES templates(id), version INTEGER NOT NULL, renderer_key TEXT NOT NULL, config_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY NOT NULL, brand_id TEXT NOT NULL REFERENCES brands(id), template_id TEXT NOT NULL REFERENCES templates(id), prompt TEXT, content_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS renders (id TEXT PRIMARY KEY NOT NULL, post_id TEXT NOT NULL REFERENCES posts(id), template_version_id TEXT NOT NULL REFERENCES template_versions(id), parent_render_id TEXT, asset_key TEXT NOT NULL, asset_content_type TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, input_snapshot_json TEXT NOT NULL, sha256 TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_templates_brand_id ON templates(brand_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_template_version ON template_versions(template_id, version)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_created_at ON renders(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_post_id ON renders(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_renders_parent_render_id ON renders(parent_render_id)`,
  ];
  await db.batch(statements.map((statement) => db.prepare(statement)));

  const createdAt = Date.UTC(2026, 7, 18);
  const contentSchema = JSON.stringify({ eyebrow: { type: "string", maxLength: 28 }, headline: { type: "string", maxLength: 84 }, support: { type: "string", maxLength: 150 } });
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO brands (id, name, config_json, created_at) VALUES (?, ?, ?, ?)").bind(brand.id, brand.name, JSON.stringify(brand), createdAt),
    db.prepare("INSERT OR IGNORE INTO templates (id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("statement", brand.id, templates.statement.name, "statement", contentSchema, createdAt),
    db.prepare("INSERT OR IGNORE INTO templates (id, brand_id, name, type, content_schema_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("signal", brand.id, templates.signal.name, "signal", contentSchema, createdAt),
    db.prepare("INSERT OR IGNORE INTO template_versions (id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("statement@1", "statement", 1, "statement", JSON.stringify(templates.statement), createdAt),
    db.prepare("INSERT OR IGNORE INTO template_versions (id, template_id, version, renderer_key, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("signal@1", "signal", 1, "signal", JSON.stringify(templates.signal), createdAt),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

export async function listBrands(): Promise<BrandRecord[]> {
  await ensureMediaDatabase();
  const result = await database().prepare("SELECT id, name, config_json, created_at FROM brands ORDER BY name").all<D1Row>();
  return result.results.map((row) => ({ id: String(row.id), name: String(row.name), config: JSON.parse(String(row.config_json)), createdAt: Number(row.created_at) }));
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  await ensureMediaDatabase();
  const result = await database().prepare(`SELECT t.id, t.brand_id, t.name, t.type, t.content_schema_json, t.created_at, tv.version, tv.renderer_key FROM templates t JOIN template_versions tv ON tv.template_id = t.id ORDER BY t.name, tv.version DESC`).all<D1Row>();
  return result.results.map((row) => ({
    id: String(row.id), brandId: String(row.brand_id), name: String(row.name), type: String(row.type),
    version: Number(row.version), rendererKey: String(row.renderer_key), contentSchema: JSON.parse(String(row.content_schema_json)), createdAt: Number(row.created_at),
  }));
}

const postSelect = `SELECT id, brand_id, template_id, prompt, content_json, created_by, created_at FROM posts`;

function mapPost(row: D1Row): PostRecord {
  const stored = JSON.parse(String(row.content_json)) as { format?: unknown; content?: unknown } | PostPayload["content"];
  const payload = postPayloadSchema.parse({
    brandId: row.brand_id,
    templateId: row.template_id,
    format: "format" in stored ? stored.format : "portrait",
    content: "content" in stored ? stored.content : stored,
  });
  return {
    id: String(row.id), brandId: payload.brandId, templateId: payload.templateId,
    prompt: row.prompt ? String(row.prompt) : null, payload, createdBy: String(row.created_by), createdAt: Number(row.created_at),
  };
}

export async function listPosts(limit = 30): Promise<PostRecord[]> {
  await ensureMediaDatabase();
  const result = await database().prepare(`${postSelect} ORDER BY created_at DESC LIMIT ?`).bind(Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return result.results.map(mapPost);
}

export async function getPostById(id: string): Promise<PostRecord | null> {
  await ensureMediaDatabase();
  const row = await database().prepare(`${postSelect} WHERE id = ? LIMIT 1`).bind(id).first<D1Row>();
  return row ? mapPost(row) : null;
}

export async function createPost(input: { payload: unknown; prompt?: string | null; createdBy?: string }): Promise<PostRecord> {
  await ensureMediaDatabase();
  const payload = postPayloadSchema.parse(input.payload);
  const id = crypto.randomUUID();
  const now = Date.now();
  await database().prepare("INSERT INTO posts (id, brand_id, template_id, prompt, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, payload.brandId, payload.templateId, input.prompt?.trim() || null, JSON.stringify({ format: payload.format, content: payload.content }), input.createdBy ?? "human:workspace", now)
    .run();
  const record = await getPostById(id);
  if (!record) throw new Error("The post record could not be read after creation.");
  return record;
}

const renderSelect = `SELECT r.id, r.post_id, r.parent_render_id, r.width, r.height, r.sha256, r.created_at, r.input_snapshot_json, b.name AS brand_name, t.name AS template_name, tv.version AS template_version FROM renders r JOIN posts p ON p.id = r.post_id JOIN brands b ON b.id = p.brand_id JOIN templates t ON t.id = p.template_id JOIN template_versions tv ON tv.id = r.template_version_id`;

function mapRender(row: D1Row): RenderRecord {
  const payload = postPayloadSchema.parse(JSON.parse(String(row.input_snapshot_json)));
  const id = String(row.id);
  return {
    id, postId: String(row.post_id), parentRenderId: row.parent_render_id ? String(row.parent_render_id) : null,
    brandName: String(row.brand_name), templateName: String(row.template_name), templateVersion: Number(row.template_version),
    payload, width: Number(row.width), height: Number(row.height), sha256: String(row.sha256), createdAt: Number(row.created_at),
    assetUrl: `/api/renders/${id}/asset`,
  };
}

export async function listRenders(limit = 30): Promise<RenderRecord[]> {
  await ensureMediaDatabase();
  const result = await database().prepare(`${renderSelect} ORDER BY r.created_at DESC LIMIT ?`).bind(Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return result.results.map(mapRender);
}

export async function getRenderById(id: string): Promise<RenderRecord | null> {
  await ensureMediaDatabase();
  const row = await database().prepare(`${renderSelect} WHERE r.id = ? LIMIT 1`).bind(id).first<D1Row>();
  return row ? mapRender(row) : null;
}

export async function createRender(input: { payload: unknown; png: ArrayBuffer; postId?: string | null; parentRenderId?: string | null; createdBy?: string }): Promise<RenderRecord> {
  await ensureMediaDatabase();
  const payload = postPayloadSchema.parse(input.payload);
  const dimensions = formats[payload.format];
  validatePng(input.png, dimensions.width, dimensions.height);

  const now = Date.now();
  const postId = input.postId ?? crypto.randomUUID();
  const renderId = crypto.randomUUID();
  const assetKey = `renders/${renderId}.png`;
  const hash = await crypto.subtle.digest("SHA-256", input.png);
  const sha256 = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const db = database();
  if (input.postId) {
    const post = await getPostById(input.postId);
    if (!post) throw new Error("The post does not exist.");
    if (JSON.stringify(post.payload) !== JSON.stringify(payload)) throw new Error("The render payload must match the stored post.");
  }
  if (input.parentRenderId) {
    const parent = await db.prepare("SELECT id FROM renders WHERE id = ? LIMIT 1").bind(input.parentRenderId).first();
    if (!parent) throw new Error("The parent render does not exist.");
  }

  await mediaBucket().put(assetKey, input.png, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { sha256 } });
  try {
    const statements = [
      db.prepare("INSERT INTO renders (id, post_id, template_version_id, parent_render_id, asset_key, asset_content_type, width, height, input_snapshot_json, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(renderId, postId, `${payload.templateId}@1`, input.parentRenderId ?? null, assetKey, "image/png", dimensions.width, dimensions.height, JSON.stringify(payload), sha256, now),
    ];
    if (!input.postId) {
      statements.unshift(db.prepare("INSERT INTO posts (id, brand_id, template_id, prompt, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(postId, payload.brandId, payload.templateId, null, JSON.stringify({ format: payload.format, content: payload.content }), input.createdBy ?? "human:workspace", now));
    }
    await db.batch(statements);
  } catch (error) {
    await mediaBucket().delete(assetKey);
    throw error;
  }

  const record = await getRenderById(renderId);
  if (!record) throw new Error("The render record could not be read after creation.");
  return record;
}

export async function getRenderAsset(id: string): Promise<R2ObjectBody | null> {
  await ensureMediaDatabase();
  const row = await database().prepare("SELECT asset_key FROM renders WHERE id = ? LIMIT 1").bind(id).first<{ asset_key: string }>();
  return row ? mediaBucket().get(row.asset_key) : null;
}

function validatePng(buffer: ArrayBuffer, width: number, height: number) {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error("A valid PNG file is required.");
  const view = new DataView(buffer);
  if (view.getUint32(16) !== width || view.getUint32(20) !== height) throw new Error(`PNG dimensions must be ${width} × ${height}.`);
}
