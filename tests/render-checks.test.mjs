import assert from "node:assert/strict";
import test from "node:test";
import { imageFrameQuality } from "../lib/render-checks.ts";

test("flags weak evidence letterboxing and accepts a deliberate zoom", () => {
  const weak = imageFrameQuality({ naturalWidth: 800, naturalHeight: 1600, frameWidth: 800, frameHeight: 500, zoom: 1, fit: "contain", role: "evidence", hasHighlight: false });
  assert.equal(Math.round(weak.coverage * 100), 31);
  assert.match(weak.issues[0], /occupies 31%/);
  const corrected = imageFrameQuality({ naturalWidth: 800, naturalHeight: 1600, frameWidth: 800, frameHeight: 500, zoom: 2, fit: "contain", role: "evidence", hasHighlight: false });
  assert.deepEqual(corrected.issues, []);
});

test("flags destructive cover crops unless a focal region is annotated", () => {
  const crop = { naturalWidth: 4000, naturalHeight: 900, frameWidth: 400, frameHeight: 900, zoom: 1, fit: "cover", role: "image" };
  assert.match(imageFrameQuality({ ...crop, hasHighlight: false }).issues[0], /retains only/);
  assert.deepEqual(imageFrameQuality({ ...crop, hasHighlight: true }).issues, []);
});
