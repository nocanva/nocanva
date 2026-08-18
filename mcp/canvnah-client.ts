import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { brandConfigSchema, formats, postPayloadSchema, renderFilename, templateInputSchema, type BrandConfig, type PostPayload, type TemplateInput } from "../lib/media";

export type BrandResult = { id: string; name: string; config: BrandConfig; createdAt: number };
export type TemplateResult = { id: string; brandId: string; name: string; description: string; type: string; version: number; rendererKey: "statement" | "signal"; contentSchema: unknown; createdAt: number };
export type PostResult = { id: string; brandId: string; templateId: string; prompt: string | null; payload: PostPayload; createdBy: string; createdAt: number };
export type RenderResult = {
  id: string; postId: string; parentRenderId: string | null; brandName: string; templateName: string;
  templateVersion: number; payload: PostPayload; width: number; height: number; sha256: string;
  createdAt: number; assetUrl: string; workspaceUrl: string;
};

type ApiRender = Omit<RenderResult, "workspaceUrl">;
export type ReviewResult = {
  passed: boolean; checks: Array<{ id: string; passed: boolean; detail: string }>;
  width: number; height: number; sha256: string; templateVersion: string; previewUrl: string; imageBase64: string;
};

export class CanvnahClient {
  readonly baseUrl: string;

  constructor(baseUrl = process.env.CANVNAH_BASE_URL ?? "http://localhost:3000") {
    const url = new URL(baseUrl);
    if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      throw new Error("The development MCP server only connects to a loopback Canvnah URL.");
    }
    this.baseUrl = url.href.replace(/\/$/, "");
  }

  async listBrands(): Promise<BrandResult[]> {
    const data = await this.request<{ brands: BrandResult[] }>("/api/brands");
    return data.brands;
  }

  async createBrand(value: unknown): Promise<BrandResult> {
    const config = brandConfigSchema.parse(value);
    const data = await this.request<{ brand: BrandResult }>("/api/brands", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config),
    });
    return data.brand;
  }

  async listTemplates(brandId?: string): Promise<TemplateResult[]> {
    const data = await this.request<{ templates: TemplateResult[] }>("/api/templates");
    return brandId ? data.templates.filter((template) => template.brandId === brandId) : data.templates;
  }

  async createTemplate(value: unknown): Promise<TemplateResult> {
    const input: TemplateInput = templateInputSchema.parse(value);
    const data = await this.request<{ template: TemplateResult }>("/api/templates", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
    });
    return data.template;
  }

  async listPosts(limit = 30): Promise<PostResult[]> {
    const data = await this.request<{ posts: PostResult[] }>(`/api/posts?limit=${limit}`);
    return data.posts;
  }

  async getPost(id: string): Promise<PostResult> {
    const data = await this.request<{ post: PostResult }>(`/api/posts/${encodeURIComponent(id)}`);
    return data.post;
  }

  async createPost(payloadValue: unknown, prompt?: string): Promise<PostResult> {
    const payload = postPayloadSchema.parse(payloadValue);
    const data = await this.request<{ post: PostResult }>("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-canvnah-created-by": "agent:mcp" },
      body: JSON.stringify({ payload, prompt }),
    });
    return data.post;
  }

  async listRenders(limit = 30): Promise<RenderResult[]> {
    const data = await this.request<{ renders: ApiRender[] }>(`/api/renders?limit=${limit}`);
    return data.renders.map((render) => this.presentRender(render));
  }

  async getRender(id: string): Promise<RenderResult> {
    const data = await this.request<{ render: ApiRender }>(`/api/renders/${encodeURIComponent(id)}`);
    return this.presentRender(data.render);
  }

  async renderPost(postId: string, parentRenderId?: string): Promise<RenderResult> {
    const post = await this.getPost(postId);
    return this.renderPayload(post.payload, post.id, parentRenderId);
  }

  async rerender(renderId: string): Promise<RenderResult> {
    const parent = await this.getRender(renderId);
    const post = await this.createPost(parent.payload, `Rerender of ${renderId}`);
    return this.renderPayload(post.payload, post.id, parent.id);
  }

  async reviewTemplate(payloadValue: unknown): Promise<ReviewResult> {
    const payload = postPayloadSchema.parse(payloadValue);
    const capture = await this.capturePayload(payload);
    return { ...capture.review, imageBase64: capture.png.toString("base64") };
  }

  private async renderPayload(payload: PostPayload, postId: string, parentRenderId?: string): Promise<RenderResult> {
    const { png, review } = await this.capturePayload(payload);
    if (!review.passed) throw new Error(`Template review failed: ${review.checks.filter((check) => !check.passed).map((check) => check.detail).join(" ")}`);

    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    form.set("postId", postId);
    if (parentRenderId) form.set("parentRenderId", parentRenderId);
    const pngBytes = new Uint8Array(png.byteLength);
    pngBytes.set(png);
    form.set("png", new Blob([pngBytes.buffer], { type: "image/png" }), renderFilename(payload));
    const data = await this.request<{ render: ApiRender }>("/api/renders", {
      method: "POST",
      headers: { "x-canvnah-created-by": "agent:mcp" },
      body: form,
    });
    return this.presentRender(data.render);
  }

  private async capturePayload(payload: PostPayload): Promise<{ png: Buffer; review: Omit<ReviewResult, "imageBase64"> }> {
    const dimensions = formats[payload.format];
    const previewUrl = `${this.baseUrl}/render/preview?payload=${encodeURIComponent(JSON.stringify(payload))}`;
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: dimensions, deviceScaleFactor: 1 });
      const response = await page.goto(previewUrl, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`The local render preview returned HTTP ${response?.status() ?? "unknown"}.`);
      await page.evaluate(() => document.fonts.ready);
      const target = page.locator("[data-render-root]");
      await target.waitFor({ state: "visible" });
      const layout = await target.evaluate((root) => {
        const rootRect = root.getBoundingClientRect();
        const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-render-region]"));
        const outside = regions.filter((region) => {
          const rect = region.getBoundingClientRect();
          return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
        }).length;
        const overflowing = regions.filter((region) => {
          const style = getComputedStyle(region);
          const clipsX = ["hidden", "clip"].includes(style.overflowX);
          const clipsY = ["hidden", "clip"].includes(style.overflowY);
          return (clipsX && region.scrollWidth > region.clientWidth + 1) || (clipsY && region.scrollHeight > region.clientHeight + 1);
        }).length;
        return { outside, overflowing };
      });
      const first = await target.screenshot({ type: "png" });
      const second = await target.screenshot({ type: "png" });
      const firstHash = createHash("sha256").update(first).digest("hex");
      const secondHash = createHash("sha256").update(second).digest("hex");
      if (first.readUInt32BE(16) !== dimensions.width || first.readUInt32BE(20) !== dimensions.height) {
        throw new Error(`The PNG must be ${dimensions.width} × ${dimensions.height}.`);
      }
      const checks = [
        { id: "schema", passed: true, detail: "Content matches the structured schema." },
        { id: "bounds", passed: layout.outside === 0, detail: layout.outside === 0 ? "Every region stays inside the canvas." : `${layout.outside} region(s) leave the canvas.` },
        { id: "overflow", passed: layout.overflowing === 0, detail: layout.overflowing === 0 ? "No text is clipped." : `${layout.overflowing} region(s) are clipped.` },
        { id: "determinism", passed: firstHash === secondHash, detail: firstHash === secondHash ? "Repeated PNG hashes match." : "Repeated PNG hashes differ." },
      ];
      return {
        png: first,
        review: {
          passed: checks.every((check) => check.passed), checks, width: dimensions.width, height: dimensions.height,
          sha256: firstHash, templateVersion: await target.getAttribute("data-template-version") ?? payload.templateId,
          previewUrl,
        },
      };
    } finally {
      await browser.close();
    }
  }

  private presentRender(render: ApiRender): RenderResult {
    return {
      ...render,
      assetUrl: new URL(render.assetUrl, `${this.baseUrl}/`).href,
      workspaceUrl: new URL(`/renders/${render.id}`, `${this.baseUrl}/`).href,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      throw new Error(`Canvnah is not reachable at ${this.baseUrl}. Start the local app before using its MCP tools.`, { cause: error });
    }
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `Canvnah returned HTTP ${response.status}.`);
    return data;
  }
}
