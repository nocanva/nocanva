import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Framewise Studio exposes the durable render workflow", async () => {
  const [studio, header, packageJson] = await Promise.all([
    readFile(new URL("app/studio.tsx", root), "utf8"),
    readFile(new URL("app/workspace-header.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(studio, /Render & download PNG/);
  assert.match(studio, /Saving immutable render/);
  assert.match(studio, /\/api\/renders/);
  assert.match(header, /href="\/brands"/);
  assert.match(header, /href="\/templates"/);
  assert.match(header, /href="\/renders"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("automation route uses the shared exact-size artwork", async () => {
  const [route, artwork, css] = await Promise.all([
    readFile(new URL("app/render/preview/page.tsx", root), "utf8"),
    readFile(new URL("app/post-artwork.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(route, /PostArtwork/);
  assert.match(artwork, /data-render-root/);
  assert.match(artwork, /data-template-version/);
  assert.match(css, /width:\s*1080px/);
  assert.match(css, /height:\s*1350px/);
  await access(new URL("dist/server/index.js", root));
});
