import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarouselRenderById } from "../../../lib/server/carousel-repository";
import { requireNoCanvaViewer } from "../../../lib/server/request-auth";
import { WorkspaceHeader } from "../../workspace-header";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/carousel-renders/${id}`);
  const render = await getCarouselRenderById(id, principal.workspaceId);
  return render ? { title: `${render.slides[0].headline} — NoCanva carousel render` } : { title: "Carousel render not found — NoCanva" };
}

export default async function CarouselRenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireNoCanvaViewer(`/carousel-renders/${id}`);
  const render = await getCarouselRenderById(id, principal.workspaceId);
  if (!render) notFound();
  return <main className="studio-shell"><WorkspaceHeader active="carousels" /><section className="collection-page carousel-render-page">
    <div className="detail-breadcrumb"><Link href={`/carousels/${render.carouselId}`}>← Open editable carousel</Link><span>Immutable {render.artifacts.length}-slide record</span></div>
    <div className="history-heading collection-heading"><div><p className="kicker">Carousel render</p><h1>{render.slides[0].headline}</h1><p>Download every exact approved slide below, or get all {render.artifacts.length} PNGs in one ZIP.</p></div><a className="dark-link" href={render.zipUrl} download>Download all PNGs (.zip) ↓</a></div>
    <div className="carousel-render-grid">{render.artifacts.map((artifact, index) => <article className="carousel-render-slide" key={artifact.slideIndex}>
      <div className={`carousel-render-image ${render.format}`}><Image src={artifact.assetUrl} alt={`Slide ${index + 1}: ${render.slides[index].headline}`} width={artifact.width} height={artifact.height} unoptimized /></div>
      <div><span>Slide {String(index + 1).padStart(2, "0")}</span><strong>{render.slides[index].headline}</strong><a href={`${artifact.assetUrl}?download=1`} download={`nocanva-carousel-${render.id}-slide-${String(index + 1).padStart(2, "0")}.png`}>Download slide {String(index + 1).padStart(2, "0")} PNG ↓</a><small>{artifact.width} × {artifact.height}</small><code>{artifact.sha256}</code></div>
    </article>)}</div>
    <dl className="record-list carousel-render-meta"><div><dt>Brand</dt><dd>{render.brandName}</dd></div><div><dt>Template</dt><dd>{render.templateName} · v{render.templateVersion}</dd></div><div><dt>Template version</dt><dd className="mono-value">{render.templateVersionId}</dd></div><div><dt>Carousel revision</dt><dd className="mono-value">{render.carouselRevisionId}</dd></div><div><dt>Render ID</dt><dd className="mono-value">{render.id}</dd></div><div><dt>Created</dt><dd>{new Date(render.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl>
  </section></main>;
}
