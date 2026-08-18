import { createRender, listRenders } from "../../../lib/server/media-repository";

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
    return Response.json({ renders: await listRenders(Number.isFinite(limit) ? limit : 30) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list renders." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payloadValue = form.get("payload");
    const pngValue = form.get("png");
    const parentValue = form.get("parentRenderId");
    const postValue = form.get("postId");
    if (typeof payloadValue !== "string" || !(pngValue instanceof File)) {
      return Response.json({ error: "payload and png are required" }, { status: 400 });
    }
    if (pngValue.type !== "image/png" || pngValue.size > 10 * 1024 * 1024) {
      return Response.json({ error: "png must be an image/png file no larger than 10 MB" }, { status: 400 });
    }

    const render = await createRender({
      payload: JSON.parse(payloadValue),
      png: await pngValue.arrayBuffer(),
      postId: typeof postValue === "string" && postValue ? postValue : null,
      parentRenderId: typeof parentValue === "string" && parentValue ? parentValue : null,
      createdBy: request.headers.get("x-canvnah-created-by") ?? "human:workspace",
    });
    return Response.json({ render }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create render." }, { status: 400 });
  }
}
