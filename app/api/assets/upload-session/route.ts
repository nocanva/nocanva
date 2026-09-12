import { env } from "cloudflare:workers";
import { assetUploadRequestSchema, issueAssetUploadTicket } from "../../../../lib/server/asset-upload-ticket";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const input = assetUploadRequestSchema.parse(await request.json());
    const { token, expiresAt } = await issueAssetUploadTicket({
      ...input,
      workspaceId: authorization.principal.workspaceId,
      actor: authorization.principal.actor,
    }, env.NOCANVA_APP_TOKEN);
    return Response.json({
      upload: {
        uploadUrl: new URL("/api/assets/direct-upload", request.url).href,
        method: "PUT",
        expiresAt,
        headers: { authorization: `Bearer ${token}`, "content-type": input.mimeType },
        expectedSha256: input.expectedSha256,
        sizeBytes: input.sizeBytes,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create a direct upload ticket." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
