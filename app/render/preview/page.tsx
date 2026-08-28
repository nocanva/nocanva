import type { Metadata } from "next";
import { PostArtwork } from "../../post-artwork";
import { defaultPostPayload, postPayloadSchema } from "../../../lib/media";
import { getBrandById, getTemplateById, getTemplateVersionById } from "../../../lib/server/media-repository";
import { requireNoCanvaViewer } from "../../../lib/server/request-auth";

export const metadata: Metadata = { title: "NoCanva render", robots: { index: false, follow: false } };

function decodePayload(raw?: string) {
  if (!raw) return defaultPostPayload;
  for (const candidate of [raw, (() => { try { return decodeURIComponent(raw); } catch { return ""; } })()]) {
    if (!candidate) continue;
    try {
      const result = postPayloadSchema.safeParse(JSON.parse(candidate));
      if (result.success) return result.data;
    } catch {
      // Try the alternate encoded form before falling back.
    }
  }
  return defaultPostPayload;
}

export default async function RenderPreview({ searchParams }: { searchParams: Promise<{ payload?: string; templateVersionId?: string; slideIndex?: string; slideTotal?: string }> }) {
  const principal = await requireNoCanvaViewer("/render/preview");
  const { payload, templateVersionId, slideIndex, slideTotal } = await searchParams;
  const decoded = decodePayload(payload);
  const sequence = Number.isInteger(Number(slideIndex)) && Number(slideTotal) >= 3 ? { index: Number(slideIndex), total: Number(slideTotal) } : undefined;
  const [brandRecord, templateRecord] = await Promise.all([
    getBrandById(decoded.brandId, principal.workspaceId),
    templateVersionId ? getTemplateVersionById(templateVersionId, principal.workspaceId) : getTemplateById(decoded.templateId, principal.workspaceId),
  ]);
  if (!brandRecord || !templateRecord || templateRecord.brandId !== brandRecord.id) {
    return <main className="render-route"><p>Brand or template not found.</p></main>;
  }
  return <main className="render-route"><PostArtwork payload={decoded} brandConfig={brandRecord.config} template={templateRecord} mode="export" sequence={sequence} /></main>;
}
