import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

export const assetUploadMaxBytes = 750 * 1024;
export const assetUploadTicketLifetimeSeconds = 5 * 60;

export const assetUploadRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  expectedSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).transform((value) => value.toLowerCase()),
  sizeBytes: z.number().int().min(1).max(assetUploadMaxBytes),
});

const ticketClaimsSchema = assetUploadRequestSchema.extend({
  workspaceId: z.string().min(1).max(120),
  actor: z.string().min(1).max(120),
  scope: z.literal("asset:upload"),
});

export type AssetUploadRequest = z.infer<typeof assetUploadRequestSchema>;
export type AssetUploadTicketClaims = z.infer<typeof ticketClaimsSchema>;

const issuer = "nocanva-app";
const audience = "nocanva-direct-asset-upload";

function signingKey(secret: string) {
  const normalized = secret.trim();
  if (normalized.length < 24) throw new Error("Direct uploads require NOCANVA_APP_TOKEN with at least 24 characters.");
  return new TextEncoder().encode(normalized);
}

export async function issueAssetUploadTicket(
  input: AssetUploadRequest & { workspaceId: string; actor: string },
  secret: string,
  now = new Date(),
) {
  const claims = ticketClaimsSchema.parse({ ...input, expectedSha256: input.expectedSha256.toLowerCase(), scope: "asset:upload" });
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + assetUploadTicketLifetimeSeconds;
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setJti(crypto.randomUUID())
    .sign(signingKey(secret));
  return { token, expiresAt: new Date(expiresAt * 1000).toISOString() };
}

export async function verifyAssetUploadTicket(token: string, secret: string, now = new Date()): Promise<AssetUploadTicketClaims> {
  const { payload } = await jwtVerify(token, signingKey(secret), {
    algorithms: ["HS256"],
    issuer,
    audience,
    currentDate: now,
  });
  return ticketClaimsSchema.parse(payload);
}
