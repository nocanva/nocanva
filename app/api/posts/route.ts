import { createPost, listPosts } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
    return Response.json({ posts: await listPosts(Number.isFinite(limit) ? limit : 30, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as { payload?: unknown; prompt?: unknown };
    const post = await createPost({
      payload: body.payload,
      prompt: typeof body.prompt === "string" ? body.prompt : null,
      createdBy: authorization.principal.actor,
    }, authorization.principal.workspaceId);
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create post." }, { status: 400 });
  }
}
