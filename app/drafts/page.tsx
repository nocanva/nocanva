import type { Metadata } from "next";
import Link from "next/link";
import { getBrandById, getTemplateVersionById, listDrafts } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { PostArtwork } from "../post-artwork";
import { AppShell } from "../workspace-shell";

export const metadata: Metadata = { title: "Drafts — NoCanva", description: "Stable agent and human media drafts." };

export default async function DraftsPage() {
  const principal = await requireNoCanvaViewer("/drafts");
  const drafts = await listDrafts(100, false, principal.workspaceId);
  const cards = await Promise.all(drafts.map(async (draft) => ({
    draft,
    brand: await getBrandById(draft.brandId, principal.workspaceId),
    template: await getTemplateVersionById(draft.templateVersionId, principal.workspaceId),
  })));
  return <AppShell><section className="collection-page page-frame">
    <div className="collection-heading"><p className="kicker">Shared drafts</p><h1>Agents create. Everyone can inspect.</h1><p>Every edit becomes a revision under one stable workspace URL.</p></div>
    {cards.length === 0 ? <div className="empty-history"><span>00</span><h2>No drafts yet.</h2><p>Create the first draft through the NoCanva MCP workflow.</p></div> : <div className="draft-grid">{cards.map(({ draft, brand, template }) => {
      if (!brand || !template) return null;
      return <Link className="draft-card" href={`/drafts/${draft.id}`} key={draft.id}>
        <span className="draft-card-preview"><PostArtwork payload={draft.payload} brandConfig={brand.config} template={template} mode="export" /></span>
        <span className="draft-card-copy"><small>{draft.status.replace("_", " ")} · revision {draft.currentRevision}</small><strong>{draft.payload.content.headline}</strong><em>{draft.brandName} · {draft.templateName} v{draft.templateVersion}</em></span>
      </Link>;
    })}</div>}
  </section></AppShell>;
}
