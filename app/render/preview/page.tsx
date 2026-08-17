import type { Metadata } from "next";
import { PostArtwork } from "../../post-artwork";
import { defaultPostPayload, postPayloadSchema } from "../../../lib/media";

export const metadata: Metadata = { title: "Framewise render", robots: { index: false, follow: false } };

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
  return <main className="render-route"><PostArtwork payload={decodePayload(payload)} mode="export" /></main>;
}
