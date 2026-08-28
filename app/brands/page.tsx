import type { Metadata } from "next";
import { listBrands } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { AppShell } from "../workspace-shell";

export const metadata: Metadata = { title: "Brands — NoCanva", description: "Deterministic brand systems in NoCanva." };

export default async function BrandsPage() {
  const principal = await requireNoCanvaViewer("/brands");
  const brands = await listBrands(principal.workspaceId);
  return (
    <AppShell><section className="collection-page page-frame">
      <div className="collection-heading"><p className="kicker">Brand systems</p><h1>Define the rules once.</h1><p>Every template and render inherits these non-negotiable brand constraints.</p></div>
      <div className="brand-grid">{brands.map((item) => <article className="brand-detail-card" key={item.id}>
        <div className="brand-detail-top"><span className="brand-monogram large">{item.name.slice(0, 1).toUpperCase()}.</span><span className="record-badge">ACTIVE</span></div>
        <h2>{item.name}</h2><p>{item.config.tagline}</p>
        <div className="token-row">{Object.values(item.config.colors).map((color) => <i key={color} style={{ background: color }} />)}</div>
        <dl><div><dt>Safe area</dt><dd>{item.config.safeArea} px</dd></div><div><dt>Brand mark</dt><dd>Fixed</dd></div><div><dt>Formats</dt><dd>4:5 · 1:1</dd></div></dl>
      </article>)}</div>
    </section></AppShell>
  );
}
