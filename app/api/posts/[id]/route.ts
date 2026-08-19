import { getPostById } from "../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const post = await getPostById(id, authorization.principal.workspaceId);
    return post ? Response.json({ post }) : Response.json({ error: "Post not found." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read post." }, { status: 500 });
  }
}
