import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listRenders } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Render history — NoCanva", description: "Immutable NoCanva render history." };

export default async function RendersPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const principal = await requireNoCanvaViewer("/renders");
  const renders = await listRenders(30, principal.workspaceId);
  const { brand: requestedBrand } = await searchParams;
  const brands = Array.from(new Map(renders.map((render) => [render.payload.brandId, render.brandName])).entries());
  const selectedBrand = requestedBrand ?? (brands.some(([id]) => id === "blindspot") ? "blindspot" : "all");
  const visibleRenders = selectedBrand === "all" ? renders : renders.filter((render) => render.payload.brandId === selectedBrand);
  return (
    <main className="studio-shell"><WorkspaceHeader active="renders" /><section className="collection-page">
      <div className="collection-heading history-heading"><div><p className="kicker">Immutable history</p><h1>Reviewed output, by brand.</h1><p>Compare one brand at a time. Every asset keeps its exact content, template version, dimensions, and hash.</p></div><Link className="dark-link" href="/create">Create render →</Link></div>
      {brands.length > 1 && <nav className="brand-filter" aria-label="Filter renders by brand"><Link className={selectedBrand === "all" ? "active" : ""} href="/renders?brand=all">All brands</Link>{brands.map(([id, name]) => <Link className={selectedBrand === id ? "active" : ""} href={`/renders?brand=${encodeURIComponent(id)}`} key={id}>{name}</Link>)}</nav>}
      {visibleRenders.length === 0 ? <div className="empty-history"><span>00</span><h2>No renders for this brand</h2><p>Create its first reviewed PNG and it will appear here.</p><Link href="/create">Open Studio</Link></div> : <div className="render-history-grid">{visibleRenders.map((render) => <Link className="history-card" href={`/renders/${render.id}`} key={render.id}>
        <span className={`history-art ${render.payload.format}`}><Image src={render.assetUrl} alt="" width={render.width} height={render.height} unoptimized /></span>
        <span><small>{render.brandName} · {render.templateName} v{render.templateVersion}</small><strong>{render.payload.content.headline}</strong><em>{new Date(render.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</em></span>
      </Link>)}</div>}
    </section></main>
  );
}
