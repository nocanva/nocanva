import { launch, type BrowserWorker } from "@cloudflare/playwright";
import type { MediaRenderer } from "./canvnah-client";
import { inspectRenderLayout } from "./render-layout";

export function createCloudflareRenderer(binding: BrowserWorker): MediaRenderer {
  return async (input) => {
    const browser = await launch(binding);
    try {
      const page = await browser.newPage({ viewport: { width: input.width, height: input.height }, deviceScaleFactor: 1 });
      if (Object.keys(input.headers).length) await page.setExtraHTTPHeaders(input.headers);
      page.setDefaultTimeout(input.timeoutMs);
      page.setDefaultNavigationTimeout(input.timeoutMs);
      const response = await page.goto(input.previewUrl, { waitUntil: "networkidle", timeout: input.timeoutMs });
      if (!response?.ok()) throw new Error(`The hosted render preview returned HTTP ${response?.status() ?? "unknown"}.`);
      await page.evaluate(() => document.fonts.ready);
      const target = page.locator("[data-render-root]");
      await target.waitFor({ state: "visible" });
      const layout = await target.evaluate(inspectRenderLayout);
      return {
        first: await target.screenshot({ type: "png" }),
        second: await target.screenshot({ type: "png" }),
        ...layout,
        templateVersion: await target.getAttribute("data-template-version"),
      };
    } finally {
      await browser.close();
    }
  };
}
