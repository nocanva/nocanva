import { env } from "cloudflare:workers";
import { imageMetadata } from "../../../../lib/image-metadata";
import { createWorkspaceAsset } from "../../../../lib/server/asset-repository";
import { assetUploadMaxBytes, verifyAssetUploadTicket } from "../../../../lib/server/asset-upload-ticket";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

async function readExactBody(request: Request, expectedBytes: number) {
  if (!request.body) throw new Error("The upload body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > expectedBytes || received > assetUploadMaxBytes) {
      await reader.cancel("Upload exceeds its signed byte count.");
      throw new Error(`Upload body must be exactly ${expectedBytes} bytes.`);
    }
    chunks.push(value);
  }
  if (received !== expectedBytes) throw new Error(`Upload body must be exactly ${expectedBytes} bytes; received ${received}.`);
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function PUT(request: Request) {
  let ticket;
  try {
    const token = bearerToken(request);
    if (!token) throw new Error("A direct upload bearer ticket is required.");
    ticket = await verifyAssetUploadTicket(token, env.NOCANVA_APP_TOKEN);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The direct upload ticket is invalid or expired." }, {
      status: 401,
      headers: { "cache-control": "no-store", "www-authenticate": 'Bearer realm="nocanva-direct-upload"' },
    });
  }

  try {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== ticket.mimeType) throw new Error(`Content-Type must be ${ticket.mimeType}.`);
    const contentLength = request.headers.get("content-length");
    if (contentLength !== null && Number(contentLength) !== ticket.sizeBytes) throw new Error(`Content-Length must be exactly ${ticket.sizeBytes}.`);
    const bytes = await readExactBody(request, ticket.sizeBytes);
    const receivedSha256 = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (receivedSha256 !== ticket.expectedSha256) throw new Error(`Uploaded bytes have SHA-256 ${receivedSha256}; expected ${ticket.expectedSha256}.`);
    const detectedMimeType = imageMetadata(bytes).mimeType;
    if (detectedMimeType !== ticket.mimeType) throw new Error(`Uploaded bytes decode as ${detectedMimeType}; the ticket requires ${ticket.mimeType}.`);
    const asset = await createWorkspaceAsset({ name: ticket.name, bytes: bytes.buffer, createdBy: ticket.actor }, ticket.workspaceId);
    if (asset.sha256 !== ticket.expectedSha256) throw new Error("NoCanva stored bytes with a different SHA-256 than the direct upload.");
    return Response.json({ asset, integrity: { sha256Scope: "exact_received_and_stored_bytes", normalized: false } }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to upload image." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
