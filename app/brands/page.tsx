import type { Metadata } from "next";
import { listBrands } from "../../lib/server/media-repository";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Brands — Framewise", description: "Deterministic brand systems in Framewise." };

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <main className="studio-shell"><WorkspaceHeader active="brands" /><section className="collection-page">
      <div className="collection-heading"><p className="kicker">Brand systems</p><h1>Define the rules once.</h1><p>Every template and render inherits these non-negotiable brand constraints.</p></div>
      <div className="brand-grid">{brands.map((item) => <article className="brand-detail-card" key={item.id}>
        <div className="brand-detail-top"><span className="brand-monogram large">B.</span><span className="record-badge">ACTIVE</span></div>
        <h2>{item.name}</h2><p>Investigative editorial system</p>
        <div className="token-row">{Object.values(item.config.colors).map((color) => <i key={color} style={{ background: color }} />)}</div>
        <dl><div><dt>Safe area</dt><dd>{item.config.safeArea} px</dd></div><div><dt>Brand mark</dt><dd>Fixed</dd></div><div><dt>Formats</dt><dd>4:5 · 1:1</dd></div></dl>
      </article>)}</div>
    </section></main>
  );
}
