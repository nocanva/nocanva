import assert from "node:assert/strict";
import test from "node:test";
import { imageMetadata } from "../lib/image-metadata.ts";

function jpegWithLeadingMarker(marker) {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, marker, 0x00, 0x04, 0x12, 0x34,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x40, 0x02, 0x80, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

test("accepts baseline JPEG dimensions after JFIF or comment markers", () => {
  assert.deepEqual(imageMetadata(jpegWithLeadingMarker(0xe0)), { mimeType: "image/jpeg", width: 640, height: 320, extension: "jpg" });
  assert.deepEqual(imageMetadata(jpegWithLeadingMarker(0xfe)), { mimeType: "image/jpeg", width: 640, height: 320, extension: "jpg" });
});

test("reports a precise JPEG marker error", () => {
  assert.throws(() => imageMetadata(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])), /no valid supported start-of-frame marker/);
});
