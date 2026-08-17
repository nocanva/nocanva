import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...value] = entry.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
const baseUrl = args.url ?? "http://localhost:3000";
const output = path.resolve(args.output ?? "renders/blindspot-sample.png");
const payload = args.payload ? encodeURIComponent(args.payload) : "";
const url = `${baseUrl.replace(/\/$/, "")}/render/preview${payload ? `?payload=${payload}` : ""}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const target = page.locator("[data-render-root]");
  const first = await target.screenshot({ type: "png" });
  const second = await target.screenshot({ type: "png" });
  const firstHash = createHash("sha256").update(first).digest("hex");
  const secondHash = createHash("sha256").update(second).digest("hex");
  if (firstHash !== secondHash) throw new Error("Render is not deterministic: repeated PNG hashes differ.");

  const width = first.readUInt32BE(16);
  const height = first.readUInt32BE(20);
  const expected = await target.evaluate((node) => ({ width: node.clientWidth, height: node.clientHeight }));
  if (width !== expected.width || height !== expected.height) {
    throw new Error(`PNG dimensions ${width}×${height} do not match canvas ${expected.width}×${expected.height}.`);
  }

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, first);
  process.stdout.write(`${output}\n${width}x${height}\nsha256:${firstHash}\n`);
} finally {
  await browser.close();
}
