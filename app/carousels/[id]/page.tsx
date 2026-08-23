import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCarouselById, getLatestCarouselRender, listCarouselRevisions } from "../../../lib/server/carousel-repository";
import { getBrandById, getTemplateVersionById } from "../../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../../lib/server/request-auth";
import { listWorkspaceAssets } from "../../../lib/server/asset-repository";
import { CarouselWorkspace } from "./workspace";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/carousels/${id}`);
  const carousel = await getCarouselById(id, principal.workspaceId);
  return carousel ? { title: `${carousel.slides[0].headline} — NoCanva carousel` } : { title: "Carousel not found — NoCanva" };
}

export default async function CarouselPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/carousels/${id}`);
  const carousel = await getCarouselById(id, principal.workspaceId);
  if (!carousel) notFound();
  const [brand, template, revisions, assets, latestRender] = await Promise.all([
    getBrandById(carousel.brandId, principal.workspaceId),
    getTemplateVersionById(carousel.templateVersionId, principal.workspaceId),
    listCarouselRevisions(carousel.id, principal.workspaceId),
    listWorkspaceAssets(principal.workspaceId),
    getLatestCarouselRender(carousel.id, principal.workspaceId),
  ]);
  if (!brand || !template) notFound();
  return <CarouselWorkspace key={carousel.revisionId} initialCarousel={carousel} initialRevisions={revisions} initialAssets={assets} initialRender={latestRender} brand={brand} template={template} />;
}
