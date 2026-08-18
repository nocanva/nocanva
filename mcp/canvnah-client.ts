import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { formats, postPayloadSchema, renderFilename, type PostPayload } from "../lib/media";

export type BrandResult = { id: string; name: string; config: unknown; createdAt: number };
export type TemplateResult = { id: string; brandId: string; name: string; type: string; version: number; rendererKey: string; contentSchema: unknown; createdAt: number };
export type PostResult = { id: string; brandId: string; templateId: string; prompt: string | null; payload: PostPayload; createdBy: string; createdAt: number };
export type RenderResult = {
  id: string; postId: string; parentRenderId: string | null; brandName: string; templateName: string;
  templateVersion: number; payload: PostPayload; width: number; height: number; sha256: string;
  createdAt: number; assetUrl: string; workspaceUrl: string;
};

type ApiRender = Omit<RenderResult, "workspaceUrl">;

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

  async listTemplates(brandId?: string): Promise<TemplateResult[]> {
    const data = await this.request<{ templates: TemplateResult[] }>("/api/templates");
    return brandId ? data.templates.filter((template) => template.brandId === brandId) : data.templates;
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

  private async renderPayload(payload: PostPayload, postId: string, parentRenderId?: string): Promise<RenderResult> {
    const dimensions = formats[payload.format];
    const previewUrl = `${this.baseUrl}/render/preview?payload=${encodeURIComponent(JSON.stringify(payload))}`;
    const browser = await chromium.launch({ headless: true });
    let png: Buffer;
    try {
      const page = await browser.newPage({ viewport: dimensions, deviceScaleFactor: 1 });
      const response = await page.goto(previewUrl, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`The local render preview returned HTTP ${response?.status() ?? "unknown"}.`);
      await page.evaluate(() => document.fonts.ready);
      const target = page.locator("[data-render-root]");
      await target.waitFor({ state: "visible" });
      const first = await target.screenshot({ type: "png" });
      const second = await target.screenshot({ type: "png" });
      const firstHash = createHash("sha256").update(first).digest("hex");
      const secondHash = createHash("sha256").update(second).digest("hex");
      if (firstHash !== secondHash) throw new Error("The local renderer produced different PNGs for the same payload.");
      if (first.readUInt32BE(16) !== dimensions.width || first.readUInt32BE(20) !== dimensions.height) {
        throw new Error(`The PNG must be ${dimensions.width} × ${dimensions.height}.`);
      }
      png = first;
    } finally {
      await browser.close();
    }

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
