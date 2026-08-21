import assert from "node:assert/strict";
import test from "node:test";
import { identityFromValidatedAccessJwt } from "../lib/server/cloudflare-access.ts";

function token(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

test("reads identity claims only from a structurally valid Access JWT", () => {
  assert.deepEqual(identityFromValidatedAccessJwt(token({ sub: "user-123", email: "owner@example.com", name: "Owner" })), {
    userId: "user-123",
    email: "owner@example.com",
    name: "Owner",
  });
  assert.equal(identityFromValidatedAccessJwt("invalid"), null);
  assert.equal(identityFromValidatedAccessJwt(token({ aud: "app" })), null);
});
