import type { Metadata } from "next";
import "@puckeditor/core/puck.css";
import { notFound } from "next/navigation";
import { getBrandById, getDraftById, getTemplateVersionById, listDraftRevisions, listDrafts, recordDraftOpened } from "../../../lib/server/media-repository";
import { listCarousels } from "../../../lib/server/carousel-repository";
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
  const [brand, template, revisions, assets, recentDrafts, recentCarousels] = await Promise.all([getBrandById(draft.brandId, principal.workspaceId), getTemplateVersionById(draft.templateVersionId, principal.workspaceId), listDraftRevisions(draft.id, principal.workspaceId), listWorkspaceAssets(principal.workspaceId), listDrafts(20, false, principal.workspaceId), listCarousels(20, false, principal.workspaceId)]);
  if (!brand || !template) notFound();
  const recentCreative = [
    ...recentDrafts.filter((item) => item.id !== draft.id && item.brandId === draft.brandId).map((item) => ({ visualDirection: item.payload.content.visualDirection, compositionId: item.payload.compositionId, backgroundStyle: item.payload.content.backgroundStyle, headline: item.payload.content.headline, updatedAt: item.updatedAt })),
    ...recentCarousels.filter((item) => item.brandId === draft.brandId).map((item) => ({ visualDirection: item.slides[0]?.visualDirection, backgroundStyle: item.slides[0]?.backgroundStyle, headline: item.slides[0]?.headline, updatedAt: item.updatedAt })),
  ].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, 20);
  return <DraftWorkspace key={draft.revisionId} initialDraft={draft} initialRevisions={revisions} initialAssets={assets} brand={brand} template={template} recentCreative={recentCreative} />;
}
