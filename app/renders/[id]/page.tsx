import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRenderById } from "../../../lib/server/media-repository";
import { WorkspaceHeader } from "../../workspace-header";

const getRender = cache(getRenderById);

function absoluteAssetUrl(host: string, protocol: string, id: string) {
  return `${protocol}://${host}/api/renders/${id}/asset`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const render = await getRender(id);
  if (!render) return { title: "Render not found — Framewise", description: "This Framewise render does not exist.", openGraph: { images: [] }, twitter: { images: [] } };
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = absoluteAssetUrl(host, protocol, id);
  const title = `${render.payload.content.headline} — Framewise`;
  const description = render.payload.content.support;
  return {
    title, description,
    openGraph: { title, description, images: [{ url: image, width: render.width, height: render.height, alt: render.payload.content.headline }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function RenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const render = await getRender(id);
  if (!render) notFound();
  return (
    <main className="studio-shell"><WorkspaceHeader active="renders" /><section className="render-detail-page">
      <div className="detail-breadcrumb"><Link href="/renders">← Render history</Link><span>Immutable record</span></div>
      <div className="render-detail-grid">
        <div className="detail-art-stage"><Image src={render.assetUrl} alt={render.payload.content.headline} width={render.width} height={render.height} unoptimized /></div>
        <aside className="detail-inspector">
          <p className="kicker">Render detail</p><h1>{render.payload.content.headline}</h1><p className="detail-support">{render.payload.content.support}</p>
          <div className="detail-actions"><a className="dark-link" href={render.assetUrl} download>Download PNG ↓</a><Link className="light-link" href={`/?rerender=${render.id}`}>Rerender →</Link></div>
          <dl className="record-list">
            <div><dt>Brand</dt><dd>{render.brandName}</dd></div><div><dt>Template</dt><dd>{render.templateName} · v{render.templateVersion}</dd></div>
            <div><dt>Dimensions</dt><dd>{render.width} × {render.height}</dd></div><div><dt>Created</dt><dd>{new Date(render.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div><dt>Render ID</dt><dd className="mono-value">{render.id}</dd></div><div><dt>SHA-256</dt><dd className="mono-value">{render.sha256}</dd></div>
          </dl>
          <section className="snapshot-panel"><span>Input snapshot</span><pre>{JSON.stringify(render.payload, null, 2)}</pre></section>
          {render.parentRenderId && <p className="iteration-link">Iteration of <Link href={`/renders/${render.parentRenderId}`}>{render.parentRenderId.slice(0, 8)}…</Link></p>}
        </aside>
      </div>
    </section></main>
  );
}
