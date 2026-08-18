import { getRenderById } from "../../../../lib/server/media-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const render = await getRenderById(id);
    return render ? Response.json({ render }) : Response.json({ error: "Render not found." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read render." }, { status: 500 });
  }
}
