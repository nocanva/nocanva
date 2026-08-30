import { env } from "cloudflare:workers";
import { carouselCreateInputSchema, carouselUpdateInputSchema, draftDecisionSchema, draftStatusSchema, formats, postContentSchema, type DraftStatus, type PostContent } from "../media";
import { compositionFromTemplateId, visualDirections } from "../compositions";
import { ensureMediaDatabase, getBrandById, getTemplateById, type DraftCheck } from "./media-repository";
import { validateContentAssets } from "./asset-repository";

type D1Row = Record<string, unknown>;
type StoredArtifact = { slideIndex: number; assetKey: string; width: number; height: number; sha256: string };
export type CarouselArtifact = Omit<StoredArtifact, "assetKey"> & { assetUrl: string };
export type CarouselReviewRecord = { id: string; reviewer: string; status: "passed" | "changes_requested"; notes: string | null; checks: DraftCheck[][]; artifacts: CarouselArtifact[]; createdAt: number };
export type CarouselApprovalRecord = { id: string; reviewId: string | null; actor: string; decision: "approved" | "rejected"; notes: string | null; createdAt: number };
export type CarouselRecord = {
  id: string; brandId: string; brandName: string; templateId: string; templateName: string; templateVersionId: string; templateVersion: number;
  currentRevision: number; revisionId: string; status: DraftStatus; approvalPolicy: "agent_allowed" | "human_required"; archivedAt: number | null;
  format: "portrait" | "square"; slides: PostContent[]; prompt: string | null; createdBy: string; revisionCreatedBy: string; createdAt: number; updatedAt: number;
  review: CarouselReviewRecord | null; approval: CarouselApprovalRecord | null;
};
export type CarouselRevisionRecord = { id: string; revision: number; templateVersionId: string; format: "portrait" | "square"; slides: PostContent[]; prompt: string | null; createdBy: string; createdAt: number };
export type CarouselRenderRecord = {
  id: string; carouselId: string; carouselRevisionId: string; templateVersionId: string; templateVersion: number; brandName: string; templateName: string;
  format: "portrait" | "square"; slides: PostContent[]; artifacts: CarouselArtifact[]; createdAt: number; zipUrl: string;
};

let carouselInitialized: Promise<void> | undefined;

function database() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  return env.DB;
}

function mediaBucket() {
  if (!env.MEDIA) throw new Error("R2 binding MEDIA is unavailable.");
  return env.MEDIA;
}

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

function approvalPolicy(): "agent_allowed" | "human_required" {
  return env.NOCANVA_APPROVAL_MODE === "human_required" ? "human_required" : "agent_allowed";
}

async function ensureCarouselDatabase(workspaceId = defaultWorkspaceId()) {
  await ensureMediaDatabase(workspaceId);
  carouselInitialized ??= initializeCarouselDatabase();
  await carouselInitialized;
}

async function initializeCarouselDatabase() {
  const db = database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS carousels (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, brand_id TEXT NOT NULL REFERENCES brands(id), template_id TEXT NOT NULL REFERENCES templates(id), current_revision INTEGER NOT NULL, status TEXT NOT NULL, archived_at INTEGER, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS carousel_revisions (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, carousel_id TEXT NOT NULL REFERENCES carousels(id), revision INTEGER NOT NULL, template_version_id TEXT NOT NULL REFERENCES template_versions(id), format TEXT NOT NULL, slides_json TEXT NOT NULL, prompt TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS carousel_reviews (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, carousel_revision_id TEXT NOT NULL REFERENCES carousel_revisions(id), reviewer TEXT NOT NULL, status TEXT NOT NULL, notes TEXT, checks_json TEXT NOT NULL, artifacts_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS carousel_approvals (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, carousel_revision_id TEXT NOT NULL REFERENCES carousel_revisions(id), review_id TEXT REFERENCES carousel_reviews(id), actor TEXT NOT NULL, decision TEXT NOT NULL, notes TEXT, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS carousel_renders (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, carousel_revision_id TEXT NOT NULL REFERENCES carousel_revisions(id), template_version_id TEXT NOT NULL REFERENCES template_versions(id), review_id TEXT NOT NULL REFERENCES carousel_reviews(id), artifacts_json TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousels_workspace ON carousels(workspace_id, updated_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_carousel_revisions_revision ON carousel_revisions(carousel_id, revision)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousel_reviews_revision ON carousel_reviews(carousel_revision_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousel_approvals_revision ON carousel_approvals(carousel_revision_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousel_approvals_review ON carousel_approvals(review_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousel_renders_workspace ON carousel_renders(workspace_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_carousel_renders_revision ON carousel_renders(carousel_revision_id)"),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

async function recordEvent(workspaceId: string, action: string, entityType: string, entityId: string, actor: string, metadata: Record<string, unknown> = {}) {
  const createdAt = Date.now();
  await database().prepare("INSERT INTO workspace_events (id, workspace_id, action, entity_type, entity_id, actor, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), workspaceId, action, entityType, entityId, actor, JSON.stringify(metadata), createdAt).run();
  console.log(JSON.stringify({ timestamp: new Date(createdAt).toISOString(), service: "nocanva", event: action, workspaceId, entityType, entityId, actor, ...metadata }));
}

const carouselSelect = `SELECT c.id, c.brand_id, c.template_id, c.current_revision, c.status, c.archived_at, c.created_by, c.created_at, c.updated_at, cr.id AS revision_id, cr.template_version_id, cr.format, cr.slides_json, cr.prompt, cr.created_by AS revision_created_by, tv.version AS template_version, b.name AS brand_name, t.name AS template_name FROM carousels c JOIN carousel_revisions cr ON cr.carousel_id = c.id AND cr.revision = c.current_revision JOIN template_versions tv ON tv.id = cr.template_version_id JOIN brands b ON b.id = c.brand_id JOIN templates t ON t.id = c.template_id`;

async function mapCarousel(row: D1Row, workspaceId: string): Promise<CarouselRecord> {
  const revisionId = String(row.revision_id);
  const [reviewRow, approvalRow] = await Promise.all([
    database().prepare("SELECT id, reviewer, status, notes, checks_json, artifacts_json, created_at FROM carousel_reviews WHERE carousel_revision_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1").bind(revisionId, workspaceId).first<D1Row>(),
    database().prepare("SELECT id, review_id, actor, decision, notes, created_at FROM carousel_approvals WHERE carousel_revision_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1").bind(revisionId, workspaceId).first<D1Row>(),
  ]);
  const format = row.format === "square" ? "square" : "portrait";
  const slides = postContentSchema.array().min(3).max(7).parse(JSON.parse(String(row.slides_json)));
  return {
    id: String(row.id), brandId: logicalId(workspaceId, row.brand_id), brandName: String(row.brand_name), templateId: logicalId(workspaceId, row.template_id), templateName: String(row.template_name),
    templateVersionId: logicalId(workspaceId, row.template_version_id), templateVersion: Number(row.template_version), currentRevision: Number(row.current_revision), revisionId,
    status: draftStatusSchema.parse(row.status), approvalPolicy: approvalPolicy(), archivedAt: row.archived_at == null ? null : Number(row.archived_at), format, slides,
    prompt: row.prompt ? String(row.prompt) : null, createdBy: String(row.created_by), revisionCreatedBy: String(row.revision_created_by), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
    review: reviewRow ? mapReview(reviewRow) : null,
    approval: approvalRow ? { id: String(approvalRow.id), reviewId: approvalRow.review_id ? String(approvalRow.review_id) : null, actor: String(approvalRow.actor), decision: approvalRow.decision === "approved" ? "approved" : "rejected", notes: approvalRow.notes ? String(approvalRow.notes) : null, createdAt: Number(approvalRow.created_at) } : null,
  };
}

function mapReview(row: D1Row): CarouselReviewRecord {
  const id = String(row.id);
  const artifacts = JSON.parse(String(row.artifacts_json)) as StoredArtifact[];
  return { id, reviewer: String(row.reviewer), status: row.status === "passed" ? "passed" : "changes_requested", notes: row.notes ? String(row.notes) : null, checks: JSON.parse(String(row.checks_json)) as DraftCheck[][], artifacts: artifacts.map((artifact) => ({ slideIndex: artifact.slideIndex, width: artifact.width, height: artifact.height, sha256: artifact.sha256, assetUrl: `/api/carousels/reviews/${id}/assets/${artifact.slideIndex}` })), createdAt: Number(row.created_at) };
}

export async function listCarousels(limit = 30, includeArchived = false, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const archived = includeArchived ? "" : " AND c.archived_at IS NULL";
  const result = await database().prepare(`${carouselSelect} WHERE c.workspace_id = ?${archived} ORDER BY c.updated_at DESC LIMIT ?`).bind(workspaceId, Math.min(Math.max(limit, 1), 100)).all<D1Row>();
  return Promise.all(result.results.map((row) => mapCarousel(row, workspaceId)));
}

export async function getCarouselById(id: string, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const row = await database().prepare(`${carouselSelect} WHERE c.id = ? AND c.workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<D1Row>();
  return row ? mapCarousel(row, workspaceId) : null;
}

export async function listCarouselRevisions(id: string, workspaceId = defaultWorkspaceId()): Promise<CarouselRevisionRecord[]> {
  await ensureCarouselDatabase(workspaceId);
  const result = await database().prepare("SELECT id, revision, template_version_id, format, slides_json, prompt, created_by, created_at FROM carousel_revisions WHERE carousel_id = ? AND workspace_id = ? ORDER BY revision DESC").bind(id, workspaceId).all<D1Row>();
  return result.results.map((row) => ({ id: String(row.id), revision: Number(row.revision), templateVersionId: logicalId(workspaceId, row.template_version_id), format: row.format === "square" ? "square" : "portrait", slides: postContentSchema.array().min(3).max(7).parse(JSON.parse(String(row.slides_json))), prompt: row.prompt ? String(row.prompt) : null, createdBy: String(row.created_by), createdAt: Number(row.created_at) }));
}

async function validateReferences(brandId: string, templateId: string, workspaceId: string) {
  const [brand, template] = await Promise.all([getBrandById(brandId, workspaceId), getTemplateById(templateId, workspaceId)]);
  if (!brand) throw new Error("The selected brand does not exist.");
  if (!template) throw new Error("The selected template does not exist.");
  if (template.brandId !== brand.id) throw new Error("The selected template does not belong to the selected brand.");
  return template;
}

function validateVisualDirections(templateId: string, slides: PostContent[]) {
  const composition = compositionFromTemplateId(templateId);
  if (!composition) return;
  for (const [index, slide] of slides.entries()) {
    if (!slide.visualDirection) continue;
    const direction = visualDirections[slide.visualDirection];
    if (!direction.compatibleCompositions.includes(composition)) throw new Error(`Slide ${index + 1} visual direction ${direction.id} is not compatible with composition ${composition}.`);
    if (direction.requiresImage && !slide.image) throw new Error(`Slide ${index + 1} visual direction ${direction.id} requires a source image or screenshot.`);
  }
}

export async function createCarousel(value: unknown, actor = "agent:mcp", workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const input = carouselCreateInputSchema.parse(value);
  const template = await validateReferences(input.brandId, input.templateId, workspaceId);
  validateVisualDirections(input.templateId, input.slides);
  await validateContentAssets(input.slides, workspaceId);
  const id = crypto.randomUUID();
  const now = Date.now();
  const revisionId = `${id}@1`;
  await database().batch([
    database().prepare("INSERT INTO carousels (id, workspace_id, brand_id, template_id, current_revision, status, archived_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 'draft', NULL, ?, ?, ?)").bind(id, workspaceId, physicalId(workspaceId, input.brandId), physicalId(workspaceId, input.templateId), actor, now, now),
    database().prepare("INSERT INTO carousel_revisions (id, workspace_id, carousel_id, revision, template_version_id, format, slides_json, prompt, created_by, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)").bind(revisionId, workspaceId, id, `${physicalId(workspaceId, template.id)}@${template.version}`, input.format, JSON.stringify(input.slides), input.prompt?.trim() || null, actor, now),
  ]);
  const record = await getCarouselById(id, workspaceId);
  if (!record) throw new Error("The carousel could not be read after creation.");
  await recordEvent(workspaceId, "carousel_created", "carousel", id, actor, { revision: 1, slideCount: input.slides.length, templateVersionId: record.templateVersionId });
  return record;
}

export async function updateCarousel(id: string, value: unknown, actor = "agent:mcp", workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const input = carouselUpdateInputSchema.parse(value);
  const current = await getCarouselById(id, workspaceId);
  if (!current) throw new Error("The carousel does not exist.");
  if (current.archivedAt) throw new Error("Restore the carousel before editing it.");
  if (input.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${input.expectedRevision}, current revision is ${current.currentRevision}.`);
  const template = await validateReferences(input.brandId, input.templateId, workspaceId);
  validateVisualDirections(input.templateId, input.slides);
  await validateContentAssets(input.slides, workspaceId);
  const revision = current.currentRevision + 1;
  const now = Date.now();
  await database().batch([
    database().prepare("INSERT INTO carousel_revisions (id, workspace_id, carousel_id, revision, template_version_id, format, slides_json, prompt, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`${id}@${revision}`, workspaceId, id, revision, `${physicalId(workspaceId, template.id)}@${template.version}`, input.format, JSON.stringify(input.slides), input.prompt?.trim() || null, actor, now),
    database().prepare("UPDATE carousels SET brand_id = ?, template_id = ?, current_revision = ?, status = 'draft', updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(physicalId(workspaceId, input.brandId), physicalId(workspaceId, input.templateId), revision, now, id, workspaceId, current.currentRevision),
  ]);
  const record = await getCarouselById(id, workspaceId);
  if (!record || record.currentRevision !== revision) throw new Error("The carousel changed while the update was being saved.");
  await recordEvent(workspaceId, "carousel_updated", "carousel", id, actor, { revision, slideCount: input.slides.length, templateVersionId: record.templateVersionId });
  return record;
}

export async function reviewCarousel(id: string, input: { expectedRevision: number; reviewer: string; notes?: string | null; slides: Array<{ png: ArrayBuffer; checks: DraftCheck[] }> }, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const current = await getCarouselById(id, workspaceId);
  if (!current) throw new Error("The carousel does not exist.");
  if (current.archivedAt) throw new Error("Restore the carousel before reviewing it.");
  if (input.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${input.expectedRevision}, current revision is ${current.currentRevision}.`);
  if (input.slides.length !== current.slides.length || input.slides.some((slide) => !slide.checks.length)) throw new Error("Every carousel slide requires a PNG and review checks.");
  const dimensions = formats[current.format];
  const reviewId = crypto.randomUUID();
  const stored: StoredArtifact[] = [];
  try {
    for (let slideIndex = 0; slideIndex < input.slides.length; slideIndex += 1) {
      const slide = input.slides[slideIndex];
      validatePng(slide.png, dimensions.width, dimensions.height);
      const sha256 = await sha256Hex(slide.png);
      const assetKey = `workspaces/${workspaceId}/carousel-reviews/${current.revisionId}/${reviewId}/${slideIndex}.png`;
      await mediaBucket().put(assetKey, slide.png, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { sha256, slideIndex: String(slideIndex) } });
      stored.push({ slideIndex, assetKey, width: dimensions.width, height: dimensions.height, sha256 });
    }
    const passed = input.slides.every((slide) => slide.checks.every((check) => check.passed));
    const now = Date.now();
    await database().batch([
      database().prepare("INSERT INTO carousel_reviews (id, workspace_id, carousel_revision_id, reviewer, status, notes, checks_json, artifacts_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(reviewId, workspaceId, current.revisionId, input.reviewer, passed ? "passed" : "changes_requested", input.notes?.trim() || null, JSON.stringify(input.slides.map((slide) => slide.checks)), JSON.stringify(stored), now),
      database().prepare("UPDATE carousels SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(passed ? "in_review" : "draft", now, id, workspaceId, current.currentRevision),
    ]);
    const record = await getCarouselById(id, workspaceId);
    if (!record) throw new Error("The reviewed carousel could not be read.");
    await recordEvent(workspaceId, "carousel_reviewed", "carousel", id, input.reviewer, { revision: current.currentRevision, reviewId, passed, slideCount: stored.length, sha256: stored.map((artifact) => artifact.sha256) });
    return record;
  } catch (error) {
    await Promise.all(stored.map((artifact) => mediaBucket().delete(artifact.assetKey)));
    throw error;
  }
}

export async function decideCarousel(id: string, input: { expectedRevision: number; actor: string; decision: unknown; notes?: string | null }, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const decision = draftDecisionSchema.parse(input.decision);
  const current = await getCarouselById(id, workspaceId);
  if (!current) throw new Error("The carousel does not exist.");
  if (current.archivedAt) throw new Error("Restore the carousel before approving it.");
  if (input.expectedRevision !== current.currentRevision) throw new Error(`Revision conflict: expected ${input.expectedRevision}, current revision is ${current.currentRevision}.`);
  if (decision === "approved" && current.review?.status !== "passed") throw new Error("A passing review of every slide is required before approval.");
  if (decision === "approved" && approvalPolicy() === "human_required" && !input.actor.startsWith("human:")) throw new Error("This workspace requires a human approval actor.");
  const now = Date.now();
  await database().batch([
    database().prepare("INSERT INTO carousel_approvals (id, workspace_id, carousel_revision_id, review_id, actor, decision, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), workspaceId, current.revisionId, current.review?.id ?? null, input.actor, decision, input.notes?.trim() || null, now),
    database().prepare("UPDATE carousels SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(decision === "approved" ? "approved" : "draft", now, id, workspaceId, current.currentRevision),
  ]);
  const record = await getCarouselById(id, workspaceId);
  if (!record) throw new Error("The decided carousel could not be read.");
  await recordEvent(workspaceId, "carousel_decided", "carousel", id, input.actor, { revision: current.currentRevision, decision, reviewId: current.review?.id ?? null });
  return record;
}

export async function archiveCarousel(id: string, archived: boolean, actor: string, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const current = await getCarouselById(id, workspaceId);
  if (!current) throw new Error("The carousel does not exist.");
  const now = Date.now();
  await database().prepare("UPDATE carousels SET archived_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(archived ? now : null, now, id, workspaceId).run();
  const record = await getCarouselById(id, workspaceId);
  if (!record) throw new Error("The carousel could not be read after archiving.");
  await recordEvent(workspaceId, archived ? "carousel_archived" : "carousel_restored", "carousel", id, actor);
  return record;
}

const renderSelect = `SELECT rr.id, rr.carousel_revision_id, rr.template_version_id, rr.review_id, rr.artifacts_json, rr.created_at, cr.carousel_id, cr.format, cr.slides_json, tv.version AS template_version, b.name AS brand_name, t.name AS template_name FROM carousel_renders rr JOIN carousel_revisions cr ON cr.id = rr.carousel_revision_id JOIN template_versions tv ON tv.id = rr.template_version_id JOIN templates t ON t.id = tv.template_id JOIN brands b ON b.id = t.brand_id`;

function mapRender(row: D1Row, workspaceId: string): CarouselRenderRecord {
  const id = String(row.id);
  const artifacts = JSON.parse(String(row.artifacts_json)) as StoredArtifact[];
  return { id, carouselId: String(row.carousel_id), carouselRevisionId: String(row.carousel_revision_id), templateVersionId: logicalId(workspaceId, row.template_version_id), templateVersion: Number(row.template_version), brandName: String(row.brand_name), templateName: String(row.template_name), format: row.format === "square" ? "square" : "portrait", slides: postContentSchema.array().min(3).max(7).parse(JSON.parse(String(row.slides_json))), artifacts: artifacts.map((artifact) => ({ slideIndex: artifact.slideIndex, width: artifact.width, height: artifact.height, sha256: artifact.sha256, assetUrl: `/api/carousel-renders/${id}/assets/${artifact.slideIndex}` })), createdAt: Number(row.created_at), zipUrl: `/api/carousel-renders/${id}/zip` };
}

export async function createCarouselRender(id: string, actor = "agent:mcp", workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const current = await getCarouselById(id, workspaceId);
  if (!current) throw new Error("The carousel does not exist.");
  if (!['approved', 'rendered'].includes(current.status) || current.approval?.decision !== "approved" || !current.approval.reviewId) throw new Error("Review and approve the current carousel revision before rendering it.");
  if (!current.review || current.review.id !== current.approval.reviewId) throw new Error("The approval does not pin the current carousel review artifacts.");
  const existing = await getCarouselRenderForRevision(current.revisionId, current.approval.reviewId, workspaceId);
  if (existing) return existing;
  const reviewRow = await database().prepare("SELECT artifacts_json FROM carousel_reviews WHERE id = ? AND carousel_revision_id = ? AND workspace_id = ? LIMIT 1").bind(current.approval.reviewId, current.revisionId, workspaceId).first<{ artifacts_json: string }>();
  if (!reviewRow) throw new Error("The approved carousel review artifacts are unavailable.");
  const reviewedArtifacts = JSON.parse(reviewRow.artifacts_json) as StoredArtifact[];
  if (reviewedArtifacts.length !== current.slides.length) throw new Error("The approved carousel review artifact set is incomplete.");
  const renderId = crypto.randomUUID();
  const rendered: StoredArtifact[] = [];
  try {
    for (const artifact of reviewedArtifacts) {
      const stored = await mediaBucket().get(artifact.assetKey);
      if (!stored) throw new Error(`Approved slide ${artifact.slideIndex + 1} is unavailable.`);
      const bytes = await stored.arrayBuffer();
      if (await sha256Hex(bytes) !== artifact.sha256) throw new Error(`Approved slide ${artifact.slideIndex + 1} failed its SHA-256 integrity check.`);
      const assetKey = `workspaces/${workspaceId}/carousel-renders/${renderId}/${artifact.slideIndex}.png`;
      await mediaBucket().put(assetKey, bytes, { httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { sha256: artifact.sha256, slideIndex: String(artifact.slideIndex), reviewId: current.review.id } });
      rendered.push({ ...artifact, assetKey });
    }
    const now = Date.now();
    const separator = current.templateVersionId.lastIndexOf("@");
    const storedTemplateVersionId = `${physicalId(workspaceId, current.templateVersionId.slice(0, separator))}${current.templateVersionId.slice(separator)}`;
    await database().batch([
      database().prepare("INSERT INTO carousel_renders (id, workspace_id, carousel_revision_id, template_version_id, review_id, artifacts_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(renderId, workspaceId, current.revisionId, storedTemplateVersionId, current.review.id, JSON.stringify(rendered), now),
      database().prepare("UPDATE carousels SET status = 'rendered', updated_at = ? WHERE id = ? AND workspace_id = ? AND current_revision = ?").bind(now, id, workspaceId, current.currentRevision),
    ]);
    const record = await getCarouselRenderById(renderId, workspaceId);
    if (!record) throw new Error("The carousel render could not be read after creation.");
    await recordEvent(workspaceId, "carousel_render_completed", "carousel_render", renderId, actor, { carouselId: id, carouselRevisionId: current.revisionId, reviewId: current.review.id, slideCount: rendered.length, sha256: rendered.map((artifact) => artifact.sha256) });
    return record;
  } catch (error) {
    await Promise.all(rendered.map((artifact) => mediaBucket().delete(artifact.assetKey)));
    throw error;
  }
}

export async function getCarouselRenderById(id: string, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const row = await database().prepare(`${renderSelect} WHERE rr.id = ? AND rr.workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<D1Row>();
  return row ? mapRender(row, workspaceId) : null;
}

export async function getLatestCarouselRender(carouselId: string, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const row = await database().prepare(`${renderSelect} WHERE cr.carousel_id = ? AND rr.workspace_id = ? ORDER BY rr.created_at DESC LIMIT 1`).bind(carouselId, workspaceId).first<D1Row>();
  return row ? mapRender(row, workspaceId) : null;
}

async function getCarouselRenderForRevision(carouselRevisionId: string, reviewId: string, workspaceId: string) {
  const row = await database().prepare(`${renderSelect} WHERE rr.carousel_revision_id = ? AND rr.review_id = ? AND rr.workspace_id = ? ORDER BY rr.created_at DESC LIMIT 1`).bind(carouselRevisionId, reviewId, workspaceId).first<D1Row>();
  return row ? mapRender(row, workspaceId) : null;
}

export async function getCarouselRenderAsset(id: string, slideIndex: number, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const row = await database().prepare("SELECT artifacts_json FROM carousel_renders WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, workspaceId).first<{ artifacts_json: string }>();
  if (!row) return null;
  const artifact = (JSON.parse(row.artifacts_json) as StoredArtifact[]).find((item) => item.slideIndex === slideIndex);
  return artifact ? mediaBucket().get(artifact.assetKey) : null;
}

export async function getCarouselReviewAsset(reviewId: string, slideIndex: number, workspaceId = defaultWorkspaceId()) {
  await ensureCarouselDatabase(workspaceId);
  const row = await database().prepare("SELECT artifacts_json FROM carousel_reviews WHERE id = ? AND workspace_id = ? LIMIT 1").bind(reviewId, workspaceId).first<{ artifacts_json: string }>();
  if (!row) return null;
  const artifact = (JSON.parse(row.artifacts_json) as StoredArtifact[]).find((item) => item.slideIndex === slideIndex);
  return artifact ? mediaBucket().get(artifact.assetKey) : null;
}

function validatePng(buffer: ArrayBuffer, width: number, height: number) {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error("A valid PNG file is required for every slide.");
  const view = new DataView(buffer);
  if (view.getUint32(16) !== width || view.getUint32(20) !== height) throw new Error(`Every carousel PNG must be ${width} × ${height}.`);
}

async function sha256Hex(buffer: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
