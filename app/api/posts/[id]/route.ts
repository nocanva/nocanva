import { getPostById } from "../../../../lib/server/media-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getPostById(id);
    return post ? Response.json({ post }) : Response.json({ error: "Post not found." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read post." }, { status: 500 });
  }
}
