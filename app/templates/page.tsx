import type { Metadata } from "next";
import type { PostPayload } from "../../lib/media";
import { listBrands, listTemplates } from "../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { PostArtwork } from "../post-artwork";
import { WorkspaceHeader } from "../workspace-header";

export const metadata: Metadata = { title: "Templates — NoCanva", description: "Versioned visual templates in NoCanva." };

export default async function TemplatesPage() {
  const principal = await requireNoCanvaViewer("/templates");
  const [records, brands] = await Promise.all([listTemplates(principal.workspaceId), listBrands(principal.workspaceId)]);
  const brandRecords = new Map(brands.map((brand) => [brand.id, brand]));
  const seen = new Set<string>();
  const latestRecords = records.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
  return (
    <main className="studio-shell"><WorkspaceHeader active="templates" /><section className="collection-page">
      <div className="collection-heading"><p className="kicker">Template library</p><h1>Reusable visual systems.</h1><p>Versioned templates turn validated content into predictable layouts.</p></div>
      <div className="template-library">{latestRecords.map((item) => {
        const brandRecord = brandRecords.get(item.brandId);
        if (!brandRecord) return null;
        const payload: PostPayload = {
          brandId: item.brandId,
          templateId: item.id,
          format: "portrait",
          content: {
            eyebrow: `${brandRecord.name.toUpperCase().slice(0, 16)} / PREVIEW`,
            headline: "One system. Every post on brand.",
            support: "This is the real template, rendered with its saved brand rules and current version.",
          },
        };
        return <article className="template-library-card" key={`${item.id}-${item.version}`}>
          <span className="library-preview"><PostArtwork payload={payload} brandConfig={brandRecord.config} template={item} mode="export" /></span>
          <div><span className="record-badge">V{item.version}</span><h2>{item.name}</h2><p>{item.description}</p><small>3 fields · {brandRecord.name} · {item.rendererKey}</small></div>
        </article>;
      })}</div>
    </section></main>
  );
}
