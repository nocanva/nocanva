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

test("accepts deterministic image crop instructions and rejects drift", () => {
  const payload = parsePostPayload({ ...defaultPostPayload, content: { ...defaultPostPayload.content, image: { assetId: "123e4567-e89b-12d3-a456-426614174000", alt: "Product screen", fit: "cover", focalPoint: { x: 0.25, y: 0.75 }, zoom: 1.4 } } });
  assert.equal(payload.content.image.zoom, 1.4);
  assert.throws(() => parsePostPayload({ ...payload, content: { ...payload.content, image: { ...payload.content.image, zoom: 3.1 } } }));
  assert.throws(() => parsePostPayload({ ...payload, content: { ...payload.content, image: { ...payload.content.image, focalPoint: { x: -0.1, y: .5 } } } }));
});
