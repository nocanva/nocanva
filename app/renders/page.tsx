import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listRenders } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Render history — NoCanva", description: "Immutable NoCanva render history." };

export default async function RendersPage() {
  const principal = await requireNoCanvaViewer("/renders");
  const renders = await listRenders(30, principal.workspaceId);
  return (
    <main className="studio-shell"><WorkspaceHeader active="renders" /><section className="collection-page">
      <div className="collection-heading history-heading"><div><p className="kicker">Immutable history</p><h1>Every frame, reproducible.</h1><p>Each output keeps its exact content, template version, dimensions, and asset.</p></div><Link className="dark-link" href="/">Create render →</Link></div>
      {renders.length === 0 ? <div className="empty-history"><span>00</span><h2>No renders yet</h2><p>Create your first PNG in the Studio and it will appear here.</p><Link href="/">Open Studio</Link></div> : <div className="render-history-grid">{renders.map((render) => <Link className="history-card" href={`/renders/${render.id}`} key={render.id}>
        <span className={`history-art ${render.payload.format}`}><Image src={render.assetUrl} alt="" width={render.width} height={render.height} unoptimized /></span>
        <span><small>{render.brandName} · {render.templateName} v{render.templateVersion}</small><strong>{render.payload.content.headline}</strong><em>{new Date(render.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</em></span>
      </Link>)}</div>}
    </section></main>
  );
}
