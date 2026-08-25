import { acquire, connect, limits, sessions, type BrowserWorker } from "@cloudflare/playwright";
import type { MediaRenderer } from "./canvnah-client";
import { acquireReusableBrowser, type BrowserSessionApi } from "./cloudflare-browser-session";
import { inspectRenderLayout } from "./render-layout";

const browserSessionApi: BrowserSessionApi = {
  acquire,
  connect,
  limits,
  now: () => Date.now(),
  sessions,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

export function createCloudflareRenderer(binding: BrowserWorker): MediaRenderer {
  return async (input) => {
    const browser = await acquireReusableBrowser(binding, browserSessionApi);
    try {
      const page = await browser.newPage({ viewport: { width: input.width, height: input.height }, deviceScaleFactor: 1 });
      if (Object.keys(input.headers).length) await page.setExtraHTTPHeaders(input.headers);
      page.setDefaultTimeout(input.timeoutMs);
      page.setDefaultNavigationTimeout(input.timeoutMs);
      const response = await page.goto(input.previewUrl, { waitUntil: "load", timeout: input.timeoutMs });
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
      // Browsers obtained through connect() disconnect on close while the
      // underlying acquired session remains available for the next review.
      await browser.close();
    }
  };
}
