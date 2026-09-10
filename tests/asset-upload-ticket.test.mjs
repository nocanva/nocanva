import assert from "node:assert/strict";
import test from "node:test";
import { assetUploadRequestSchema, assetUploadTicketLifetimeSeconds, issueAssetUploadTicket, verifyAssetUploadTicket } from "../lib/server/asset-upload-ticket.ts";

const secret = "ncv_app_direct_upload_fixture_0123456789";
const issued = new Date("2026-09-11T10:00:00.000Z");
const input = {
  name: "Blindspot screenshot.jpg",
  mimeType: "image/jpeg",
  expectedSha256: "A".repeat(64),
  sizeBytes: 123_456,
  workspaceId: "blindspot-team",
  actor: "agent:validator",
};

test("direct upload tickets bind exact file and workspace claims", async () => {
  const { token, expiresAt } = await issueAssetUploadTicket(input, secret, issued);
  assert.equal(expiresAt, new Date(issued.getTime() + assetUploadTicketLifetimeSeconds * 1000).toISOString());
  assert.deepEqual(await verifyAssetUploadTicket(token, secret, new Date(issued.getTime() + 60_000)), {
    ...input,
    expectedSha256: input.expectedSha256.toLowerCase(),
    scope: "asset:upload",
  });
  await assert.rejects(() => verifyAssetUploadTicket(token, `${secret}-wrong`, issued));
  await assert.rejects(() => verifyAssetUploadTicket(token, secret, new Date(issued.getTime() + (assetUploadTicketLifetimeSeconds + 1) * 1000)));
});

test("direct upload requests reject malformed hashes and oversized files", () => {
  assert.throws(() => assetUploadRequestSchema.parse({ ...input, workspaceId: undefined, actor: undefined, expectedSha256: "not-a-hash" }));
  assert.throws(() => assetUploadRequestSchema.parse({ ...input, workspaceId: undefined, actor: undefined, sizeBytes: 750 * 1024 + 1 }));
});
