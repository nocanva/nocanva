import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Framewise studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Framewise/);
  assert.match(html, /Turn an idea into a branded frame/);
  assert.match(html, /Render &amp; download PNG/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("exposes an exact-size automation render route", async () => {
  const response = await render("/render/preview");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-render-root/);
  assert.match(html, /data-template-version="statement@1"/);
  assert.match(html, /1080(?:<!-- -->)? × (?:<!-- -->)?1350/);
  assert.match(html, /A screenshot is a claim, not proof/);
});
