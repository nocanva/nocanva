import { env } from "cloudflare:workers";
import type { PostContent } from "../media";
import { ensureMediaDatabase } from "./media-repository";

type D1Row = Record<string, unknown>;
export type WorkspaceAsset = {
  id: string; name: string; mimeType: "image/png" | "image/jpeg"; width: number; height: number;
  sha256: string; archivedAt: number | null; createdBy: string; createdAt: number; contentUrl: string;
};

const maxAssetBytes = 750 * 1024;

function database() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  return env.DB;
}

function mediaBucket() {
  if (!env.MEDIA) throw new Error("R2 binding MEDIA is unavailable.");
  return env.MEDIA;
}

function mapAsset(row: D1Row): WorkspaceAsset {
  const id = String(row.id);
  return {
    id,
    name: String(row.name),
    mimeType: row.mime_type === "image/jpeg" ? "image/jpeg" : "image/png",
    width: Number(row.width),
    height: Number(row.height),
    sha256: String(row.sha256),
    archivedAt: row.archived_at == null ? null : Number(row.archived_at),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    contentUrl: `/api/assets/${id}/content`,
  };
}

function imageMetadata(bytes: Uint8Array): { mimeType: "image/png" | "image/jpeg"; width: number; height: number; extension: "png" | "jpg" } {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { mimeType: "image/png", width: view.getUint32(16), height: view.getUint32(20), extension: "png" };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mimeType: "image/jpeg", height: view.getUint16(offset + 5), width: view.getUint16(offset + 7), extension: "jpg" };
      }
      offset += 2 + length;
    }
  }
  throw new Error("Upload a valid PNG or JPEG image.");
}

function validateDimensions(width: number, height: number) {
  if (width < 320 || height < 320) throw new Error("Images must be at least 320 × 320 pixels.");
  if (width > 8000 || height > 8000) throw new Error("Images cannot exceed 8000 × 8000 pixels.");
}

export async function listWorkspaceAssets(workspaceId: string, includeArchived = false): Promise<WorkspaceAsset[]> {
  await ensureMediaDatabase(workspaceId);
  const archivedClause = includeArchived ? "" : " AND archived_at IS NULL";
  const result = await database().prepare(`SELECT * FROM workspace_assets WHERE workspace_id = ?${archivedClause} ORDER BY created_at DESC`).bind(workspaceId).all<D1Row>();
  return result.results.map(mapAsset);
}

export async function getWorkspaceAsset(id: string, workspaceId: string): Promise<WorkspaceAsset | null> {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare("SELECT * FROM workspace_assets WHERE id = ? AND workspace_id = ? LIMIT 1").bind(id, workspaceId).first<D1Row>();
  return row ? mapAsset(row) : null;
}

export async function getWorkspaceAssetBody(id: string, workspaceId: string) {
  await ensureMediaDatabase(workspaceId);
  const row = await database().prepare("SELECT asset_key FROM workspace_assets WHERE id = ? AND workspace_id = ? AND archived_at IS NULL LIMIT 1").bind(id, workspaceId).first<{ asset_key: string }>();
  return row ? mediaBucket().get(row.asset_key) : null;
}

export async function createWorkspaceAsset(input: { name: string; bytes: ArrayBuffer; createdBy: string }, workspaceId: string): Promise<WorkspaceAsset> {
  await ensureMediaDatabase(workspaceId);
  if (!input.bytes.byteLength || input.bytes.byteLength > maxAssetBytes) throw new Error("Images must be between 1 byte and 750 KB. Compress large screenshots before upload.");
  const bytes = new Uint8Array(input.bytes);
  const metadata = imageMetadata(bytes);
  validateDimensions(metadata.width, metadata.height);
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", input.bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const existing = await database().prepare("SELECT * FROM workspace_assets WHERE workspace_id = ? AND sha256 = ? LIMIT 1").bind(workspaceId, sha256).first<D1Row>();
  if (existing) return mapAsset(existing);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const assetKey = `workspaces/${workspaceId}/assets/${id}/original.${metadata.extension}`;
  await mediaBucket().put(assetKey, input.bytes, { httpMetadata: { contentType: metadata.mimeType, cacheControl: "private, max-age=31536000, immutable" }, customMetadata: { sha256 } });
  await database().prepare("INSERT INTO workspace_assets (id, workspace_id, name, mime_type, width, height, sha256, asset_key, archived_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)")
    .bind(id, workspaceId, input.name.trim().slice(0, 120) || `Image ${id.slice(0, 8)}`, metadata.mimeType, metadata.width, metadata.height, sha256, assetKey, input.createdBy, createdAt).run();
  const asset = await getWorkspaceAsset(id, workspaceId);
  if (!asset) throw new Error("The image could not be read after upload.");
  return asset;
}

export async function archiveWorkspaceAsset(id: string, archived: boolean, workspaceId: string): Promise<WorkspaceAsset> {
  await ensureMediaDatabase(workspaceId);
  await database().prepare("UPDATE workspace_assets SET archived_at = ? WHERE id = ? AND workspace_id = ?").bind(archived ? Date.now() : null, id, workspaceId).run();
  const asset = await getWorkspaceAsset(id, workspaceId);
  if (!asset) throw new Error("Image not found.");
  return asset;
}

export async function validateContentAssets(contents: PostContent[], workspaceId: string) {
  const ids = [...new Set(contents.flatMap((content) => content.image ? [content.image.assetId] : []))];
  for (const id of ids) {
    const asset = await getWorkspaceAsset(id, workspaceId);
    if (!asset || asset.archivedAt) throw new Error(`Image ${id} is unavailable in this workspace.`);
  }
}
