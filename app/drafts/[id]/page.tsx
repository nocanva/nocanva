import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrandById, getDraftById, getTemplateVersionById, listDraftRevisions, recordDraftOpened } from "../../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../../lib/server/request-auth";
import { listWorkspaceAssets } from "../../../lib/server/asset-repository";
import { DraftWorkspace } from "./workspace";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/drafts/${id}`);
  const draft = await getDraftById(id, principal.workspaceId);
  return draft ? { title: `${draft.payload.content.headline} — NoCanva draft` } : { title: "Draft not found — NoCanva" };
}

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/drafts/${id}`);
  const draft = await getDraftById(id, principal.workspaceId);
  if (!draft) notFound();
  await recordDraftOpened(id, principal.actor, principal.workspaceId);
  const [brand, template, revisions, assets] = await Promise.all([getBrandById(draft.brandId, principal.workspaceId), getTemplateVersionById(draft.templateVersionId, principal.workspaceId), listDraftRevisions(draft.id, principal.workspaceId), listWorkspaceAssets(principal.workspaceId)]);
  if (!brand || !template) notFound();
  return <DraftWorkspace key={draft.revisionId} initialDraft={draft} initialRevisions={revisions} initialAssets={assets} brand={brand} template={template} />;
}
