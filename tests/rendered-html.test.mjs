import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("NoCanva Studio exposes the durable render workflow", async () => {
  const [studio, shell, packageJson] = await Promise.all([
    readFile(new URL("app/studio.tsx", root), "utf8"),
    readFile(new URL("app/workspace-shell.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(studio, /Render & download PNG/);
  assert.match(studio, /Saving immutable render/);
  assert.match(studio, /\/api\/renders/);
  assert.match(shell, /href:\s*"\/brands"/);
  assert.match(shell, /href:\s*"\/templates"/);
  assert.match(shell, /href:\s*"\/drafts"/);
  assert.match(shell, /href:\s*"\/renders"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("workspace theme is persistent, accessible, and independent from artwork colors", async () => {
  const [layout, shell, toggle, css, artwork] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/workspace-shell.tsx", root), "utf8"),
    readFile(new URL("app/theme-toggle.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/post-artwork.tsx", root), "utf8"),
  ]);
  assert.match(layout, /nocanva-theme/);
  assert.match(shell, /<ThemeToggle/);
  assert.match(toggle, /aria-label={`Use \$\{theme === "dark" \? "light" : "dark"\} mode`}/);
  assert.match(toggle, /useSyncExternalStore/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /--sidebar:/);
  assert.match(artwork, /backgroundColor: brandConfig\.colors\.paper/);
});

test("draft workspace exposes stable editable lifecycle actions", async () => {
  const [page, workspace, workflow, carousel, renderDetail] = await Promise.all([
    readFile(new URL("app/drafts/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/drafts/[id]/workspace.tsx", root), "utf8"),
    readFile(new URL("app/workflow-progress.tsx", root), "utf8"),
    readFile(new URL("app/carousels/[id]/workspace.tsx", root), "utf8"),
    readFile(new URL("app/renders/[id]/page.tsx", root), "utf8"),
  ]);
  assert.match(page, /getDraftById/);
  assert.match(workspace, /Save as new revision/);
  assert.match(workspace, /Run review/);
  assert.match(workspace, /Approve revision/);
  assert.match(workspace, /Render approved PNG/);
  assert.match(workspace, /Revision history/);
  assert.match(workflow, /Edit.*Review.*Approve.*Export/s);
  assert.match(carousel, /moveSlide/);
  assert.match(carousel, /Unsaved changes/);
  assert.match(carousel, /Review every slide/);
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
  assert.match(route, /\[raw,.*decodeURIComponent/);
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

test("beta renderers preserve the product object instead of collapsing into statement cards", async () => {
  const [artwork, artworkBlocks, media, css, samples, benchmarkRunner, benchmarkEvaluator] = await Promise.all([
    readFile(new URL("app/post-artwork.tsx", root), "utf8"),
    readFile(new URL("app/artwork-blocks.tsx", root), "utf8"),
    readFile(new URL("lib/media.ts", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("scripts/generate-beta-samples.mjs", root), "utf8"),
    readFile(new URL("scripts/run-blindspot-benchmark.mjs", root), "utf8"),
    readFile(new URL("scripts/evaluate-blindspot-benchmark.mjs", root), "utf8"),
  ]);
  for (const renderer of ["chat", "lookup", "breakdown"]) {
    assert.match(media, new RegExp(`rendererKeySchema = z\\.enum\\(\\[[^\\]]*\\"${renderer}\\"`));
    assert.match(artwork, new RegExp(`${renderer[0].toUpperCase()}${renderer.slice(1)}Artwork`));
    assert.match(css, new RegExp(`\\.${renderer}-layout`));
  }
  assert.match(artwork, /background-\$\{resolvedBackgroundStyle\}/);
  assert.match(artwork, /carousel-role-\$\{sequenceRole\}/);
  assert.match(artworkBlocks, /composition-image-stage/);
  assert.match(artwork, /transformOrigin/);
  assert.match(samples, /quality-reviews\.json/);
  assert.match(samples, /failed visual rubric item/);
  assert.match(samples, /Verified source asset changed/);
  assert.doesNotMatch(samples, /const visualRubric\s*=\s*\{[\s\S]*professionallyDesigned:\s*true/);
  assert.match(benchmarkRunner, /one visual rubric per PNG/);
  assert.match(benchmarkRunner, /belongs to a different benchmark run/);
  assert.match(benchmarkRunner, /status: "mechanically-reviewed"/);
  assert.match(benchmarkRunner, /nocanva_list_compositions/);
  assert.match(benchmarkRunner, /nocanva_review_carousel/);
  assert.match(await readFile(new URL("mcp/server.ts", root), "utf8"), /compositionDiversityGuidance/);
  assert.match(benchmarkEvaluator, /immutable render/);
});

test("carousel exports remain discoverable and force exact PNG downloads", async () => {
  const [workspace, renderPage, assetRoute, repository, checks, remoteChecks] = await Promise.all([
    readFile(new URL("app/carousels/[id]/workspace.tsx", root), "utf8"),
    readFile(new URL("app/carousel-renders/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/api/carousel-renders/[id]/assets/[slideIndex]/route.ts", root), "utf8"),
    readFile(new URL("lib/server/carousel-repository.ts", root), "utf8"),
    readFile(new URL("lib/render-checks.ts", root), "utf8"),
    readFile(new URL("mcp/render-layout.ts", root), "utf8"),
  ]);
  assert.match(workspace, /Open exported PNGs/);
  assert.match(workspace, /Download all PNGs/);
  assert.match(renderPage, /Download slide/);
  assert.match(assetRoute, /content-disposition/);
  assert.match(repository, /getLatestCarouselRender/);
  assert.match(repository, /getCarouselRenderForRevision/);
  assert.match(checks, /headline.*eyebrow/);
  assert.match(checks, /split token/);
  assert.match(checks, /Phone-size readability/);
  assert.match(remoteChecks, /contrast/);
  assert.match(remoteChecks, /undersized/);
  assert.match(remoteChecks, /splitToken/);
  assert.match(workspace, /initialRender/);
  assert.match(await readFile(new URL("app/post-artwork.tsx", root), "utf8"), /--headline-fit/);
});

test("template library renders the real latest template artwork", async () => {
  const page = await readFile(new URL("app/templates/page.tsx", root), "utf8");
  assert.match(page, /<PostArtwork/);
  assert.match(page, /brandConfig={brandRecord\.config}/);
  assert.match(page, /seen\.has\(record\.id\)/);
  assert.doesNotMatch(page, /<i \/><b \/><em \/>/);
});
