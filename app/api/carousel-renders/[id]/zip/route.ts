import { zipSync } from "fflate";
import { authorizeApi } from "../../../../../lib/server/request-auth";
import { getCarouselRenderAsset, getCarouselRenderById } from "../../../../../lib/server/carousel-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeApi(request);
    if (!authorization.ok) return authorization.response;
    const { id } = await params;
    const render = await getCarouselRenderById(id, authorization.principal.workspaceId);
    if (!render) return Response.json({ error: "The carousel render does not exist." }, { status: 404 });

    const files: Record<string, Uint8Array> = {};
    for (const artifact of render.artifacts) {
      const object = await getCarouselRenderAsset(id, artifact.slideIndex, authorization.principal.workspaceId);
      if (!object) return Response.json({ error: `Slide ${artifact.slideIndex + 1} is unavailable.` }, { status: 404 });
      files[`slide-${String(artifact.slideIndex + 1).padStart(2, "0")}.png`] = new Uint8Array(await object.arrayBuffer());
    }
    const zipped = zipSync(files, { level: 0 });
    return new Response(zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="nocanva-carousel-${id}.zip"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The carousel ZIP could not be created." }, { status: 400 });
  }
}
