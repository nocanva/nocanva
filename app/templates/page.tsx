import type { Metadata } from "next";
import { listBrands, listTemplates } from "../../lib/server/media-repository";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Templates — Canvnah", description: "Versioned visual templates in Canvnah." };

export default async function TemplatesPage() {
  const [records, brands] = await Promise.all([listTemplates(), listBrands()]);
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
  return (
    <main className="studio-shell"><WorkspaceHeader active="templates" /><section className="collection-page">
      <div className="collection-heading"><p className="kicker">Template library</p><h1>Reusable visual systems.</h1><p>Versioned templates turn validated content into predictable layouts.</p></div>
      <div className="template-library">{records.map((item) => <article className="template-library-card" key={`${item.id}-${item.version}`}>
        <span className={`library-preview ${item.type}`}><i /><b /><em /></span>
        <div><span className="record-badge">V{item.version}</span><h2>{item.name}</h2><p>{item.description}</p><small>3 fields · {brandNames.get(item.brandId) ?? item.brandId} · {item.rendererKey}</small></div>
      </article>)}</div>
    </section></main>
  );
}
