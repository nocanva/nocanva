import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("NoCanva Studio exposes the durable render workflow", async () => {
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
  assert.match(header, /href="\/drafts"/);
  assert.match(header, /href="\/renders"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("draft workspace exposes stable editable lifecycle actions", async () => {
  const [page, workspace, renderDetail] = await Promise.all([
    readFile(new URL("app/drafts/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/drafts/[id]/workspace.tsx", root), "utf8"),
    readFile(new URL("app/renders/[id]/page.tsx", root), "utf8"),
  ]);
  assert.match(page, /getDraftById/);
  assert.match(workspace, /Save new revision/);
  assert.match(workspace, /Run mechanical review/);
  assert.match(workspace, /Approve revision/);
  assert.match(workspace, /Render approved PNG/);
  assert.match(workspace, /Revision history/);
  assert.match(renderDetail, /Template version ID/);
  assert.match(renderDetail, /Draft revision/);
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

test("generic layout templates stay renderer-driven and reviewable", async () => {
  const [artwork, media, skill] = await Promise.all([
    readFile(new URL("app/post-artwork.tsx", root), "utf8"),
    readFile(new URL("lib/media.ts", root), "utf8"),
    readFile(new URL("skills/nocanva-layout/SKILL.md", root), "utf8"),
  ]);
  assert.match(media, /rendererKeySchema = z\.enum\(\[[^\]]*"layout"/);
  assert.match(media, /posterLayoutSchema/);
  assert.match(artwork, /LayoutArtwork/);
  assert.match(artwork, /layout-renderer/);
  assert.match(artwork, /data-render-region="headline"/);
  assert.match(skill, /canvnah_create_template/);
  assert.match(skill, /HTML\/CSS poster/);
});

test("template library renders the real latest template artwork", async () => {
  const page = await readFile(new URL("app/templates/page.tsx", root), "utf8");
  assert.match(page, /<PostArtwork/);
  assert.match(page, /brandConfig={brandRecord\.config}/);
  assert.match(page, /seen\.has\(record\.id\)/);
  assert.doesNotMatch(page, /<i \/><b \/><em \/>/);
});
