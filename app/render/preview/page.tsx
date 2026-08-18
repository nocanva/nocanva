import type { Metadata } from "next";
import { PostArtwork } from "../../post-artwork";
import { defaultPostPayload, postPayloadSchema } from "../../../lib/media";
import { getBrandById, getTemplateById } from "../../../lib/server/media-repository";

export const metadata: Metadata = { title: "Canvnah render", robots: { index: false, follow: false } };

function decodePayload(raw?: string) {
  if (!raw) return defaultPostPayload;
  try {
    const result = postPayloadSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return result.success ? result.data : defaultPostPayload;
  } catch {
    return defaultPostPayload;
  }
}

export default async function RenderPreview({ searchParams }: { searchParams: Promise<{ payload?: string }> }) {
  const { payload } = await searchParams;
  const decoded = decodePayload(payload);
  const [brandRecord, templateRecord] = await Promise.all([getBrandById(decoded.brandId), getTemplateById(decoded.templateId)]);
  if (!brandRecord || !templateRecord || templateRecord.brandId !== brandRecord.id) {
    return <main className="render-route"><p>Brand or template not found.</p></main>;
  }
  return <main className="render-route"><PostArtwork payload={decoded} brandConfig={brandRecord.config} template={templateRecord} mode="export" /></main>;
}
