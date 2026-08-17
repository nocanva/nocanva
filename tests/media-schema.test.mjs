import assert from "node:assert/strict";
import test from "node:test";
import { defaultPostPayload, formats, parsePostPayload, renderFilename } from "../lib/media.ts";

test("accepts the default structured payload", () => {
  assert.deepEqual(parsePostPayload(defaultPostPayload), defaultPostPayload);
  assert.deepEqual(formats.portrait, { id: "portrait", label: "4:5", width: 1080, height: 1350 });
});

test("rejects content that exceeds template limits", () => {
  assert.throws(() => parsePostPayload({
    ...defaultPostPayload,
    content: { ...defaultPostPayload.content, headline: "x".repeat(85) },
  }));
});

test("creates stable safe filenames", () => {
  assert.equal(renderFilename(defaultPostPayload), "blindspot-a-screenshot-is-a-claim-not-proof-portrait.png");
});
