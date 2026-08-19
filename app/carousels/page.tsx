import type { Metadata } from "next";
import Link from "next/link";
import { listCarousels } from "../../lib/server/carousel-repository";
import { getBrandById, getTemplateVersionById } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { PostArtwork } from "../post-artwork";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Carousels — NoCanva", description: "Stable, versioned multi-slide media workspaces." };

export default async function CarouselsPage() {
  const principal = await requireNoCanvaViewer("/carousels");
  const carousels = await listCarousels(100, false, principal.workspaceId);
  const cards = await Promise.all(carousels.map(async (carousel) => ({
    carousel,
    brand: await getBrandById(carousel.brandId, principal.workspaceId),
    template: await getTemplateVersionById(carousel.templateVersionId, principal.workspaceId),
  })));
  return <main className="studio-shell"><WorkspaceHeader active="carousels" /><section className="collection-page">
    <div className="collection-heading"><p className="kicker">Multi-slide workspaces</p><h1>One story. One system. Every slide inspected.</h1><p>Agents create 3–7 slide carousels under a single pinned brand and template version.</p></div>
    {cards.length === 0 ? <div className="empty-history"><span>00</span><h2>No carousels yet.</h2><p>Create the first carousel through the NoCanva MCP workflow.</p></div> : <div className="draft-grid">{cards.map(({ carousel, brand, template }) => {
      if (!brand || !template) return null;
      const payload = { brandId: carousel.brandId, templateId: carousel.templateId, format: carousel.format, content: carousel.slides[0] };
      return <Link className="draft-card carousel-card" href={`/carousels/${carousel.id}`} key={carousel.id}>
        <span className="draft-card-preview"><PostArtwork payload={payload} brandConfig={brand.config} template={template} mode="export" /><b className="slide-count">{carousel.slides.length} slides</b></span>
        <span className="draft-card-copy"><small>{carousel.status.replace("_", " ")} · revision {carousel.currentRevision}</small><strong>{carousel.slides[0].headline}</strong><em>{carousel.brandName} · {carousel.templateName} v{carousel.templateVersion}</em></span>
      </Link>;
    })}</div>}
  </section></main>;
}
