import { createHash } from "node:crypto";
import { brandConfigSchema, carouselCreateInputSchema, carouselUpdateInputSchema, formats, postPayloadSchema, renderFilename, templateCreateSchema, type BrandConfig, type PostContent, type PostPayload, type TemplateInput, type PosterLayout, type RendererKey } from "../lib/media";

export type BrandResult = { id: string; name: string; config: BrandConfig; createdAt: number };
export type TemplateResult = { id: string; brandId: string; name: string; description: string; type: string; version: number; rendererKey: RendererKey; layout?: PosterLayout; contentSchema: unknown; createdAt: number };
export type AssetResult = { id: string; name: string; mimeType: "image/png" | "image/jpeg"; width: number; height: number; sha256: string; archivedAt: number | null; createdBy: string; createdAt: number; contentUrl: string };
export type PostResult = { id: string; brandId: string; templateId: string; prompt: string | null; payload: PostPayload; createdBy: string; createdAt: number };
export type DraftResult = {
  id: string; brandId: string; brandName: string; templateId: string; templateName: string;
  templateVersionId: string; templateVersion: number; currentRevision: number; revisionId: string;
  status: "draft" | "in_review" | "approved" | "rendered"; approvalPolicy: "agent_allowed" | "human_required"; archivedAt: number | null;
  prompt: string | null; payload: PostPayload; createdBy: string; revisionCreatedBy: string;
  createdAt: number; updatedAt: number; review: { status: string; checks: Array<{ id: string; passed: boolean; detail: string }> } | null;
  approval: { decision: string; actor: string } | null; workspaceUrl: string;
};
export type RenderResult = {
  id: string; postId: string; draftRevisionId: string | null; parentRenderId: string | null; brandName: string; templateName: string;
  templateVersionId: string; templateVersion: number; payload: PostPayload; width: number; height: number; sha256: string;
  createdAt: number; assetUrl: string; workspaceUrl: string;
};

type ApiRender = Omit<RenderResult, "workspaceUrl">;
export type ReviewResult = {
  passed: boolean; checks: Array<{ id: string; passed: boolean; detail: string }>;
  width: number; height: number; sha256: string; templateVersion: string; previewUrl: string; imageBase64: string;
};
export type CarouselArtifactResult = { slideIndex: number; width: number; height: number; sha256: string; assetUrl: string };
export type CarouselReviewResult = {
  id: string; reviewer: string; status: "passed" | "changes_requested"; notes: string | null;
  checks: Array<Array<{ id: string; passed: boolean; detail: string }>>; artifacts: CarouselArtifactResult[]; createdAt: number;
};
export type CarouselResult = {
  id: string; brandId: string; brandName: string; templateId: string; templateName: string; templateVersionId: string; templateVersion: number;
  currentRevision: number; revisionId: string; status: "draft" | "in_review" | "approved" | "rendered"; approvalPolicy: "agent_allowed" | "human_required"; archivedAt: number | null;
  format: "portrait" | "square"; slides: PostContent[]; prompt: string | null; createdBy: string; revisionCreatedBy: string; createdAt: number; updatedAt: number;
  review: CarouselReviewResult | null; approval: { id: string; reviewId: string | null; actor: string; decision: "approved" | "rejected"; notes: string | null; createdAt: number } | null;
  workspaceUrl: string;
};
export type CarouselRenderResult = {
  id: string; carouselId: string; carouselRevisionId: string; templateVersionId: string; templateVersion: number; brandName: string; templateName: string;
  format: "portrait" | "square"; slides: PostContent[]; artifacts: CarouselArtifactResult[]; createdAt: number; zipUrl: string; workspaceUrl: string;
};
type ApiCarousel = Omit<CarouselResult, "workspaceUrl">;
type ApiCarouselRender = Omit<CarouselRenderResult, "workspaceUrl">;

export type RenderCaptureInput = {
  previewUrl: string;
  width: number;
  height: number;
  headers: Record<string, string>;
  timeoutMs: number;
};

export type RenderCaptureOutput = {
  first: Uint8Array;
  second: Uint8Array;
  outside: number;
  overflowing: number;
  collisions: number;
  collapsed: number;
  typographic: number;
  undersized: number;
  media: string[];
  contrast: number;
  templateVersion: string | null;
};

export type MediaRenderer = (input: RenderCaptureInput) => Promise<RenderCaptureOutput>;

export type CanvnahClientContext = {
  workspaceId?: string;
  actor?: string;
  serviceToken?: string;
  siteBypassToken?: string;
  allowRemote?: boolean;
  render?: MediaRenderer;
  renderBaseUrl?: string;
  renderTimeoutMs?: number;
  appFetcher?: Fetcher;
};

export class CanvnahClient {
  readonly baseUrl: string;
  readonly context: CanvnahClientContext;

  constructor(baseUrl: string = process.env.NOCANVA_BASE_URL ?? process.env.CANVNAH_BASE_URL ?? "http://localhost:3000", context: CanvnahClientContext = {}) {
    const url = new URL(baseUrl);
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (!loopback && !context.allowRemote && process.env.NOCANVA_ALLOW_REMOTE_APP_URL !== "1") {
      throw new Error("Set NOCANVA_ALLOW_REMOTE_APP_URL=1 to let the MCP sidecar connect to a non-loopback NoCanva application URL.");
    }
    this.baseUrl = url.href.replace(/\/$/, "");
    this.context = context;
  }

  async listBrands(): Promise<BrandResult[]> {
    const data = await this.request<{ brands: BrandResult[] }>("/api/brands");
    return data.brands;
  }

  async listAssets(): Promise<AssetResult[]> {
    const data = await this.request<{ assets: AssetResult[] }>("/api/assets");
    return data.assets.map((asset) => ({ ...asset, contentUrl: new URL(asset.contentUrl, `${this.baseUrl}/`).href }));
  }

  async uploadAsset(name: string, mimeType: "image/png" | "image/jpeg", base64: string): Promise<AssetResult> {
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length || bytes.length > 750 * 1024) throw new Error("Decoded image must be between 1 byte and 750 KB. Compress large screenshots before upload.");
    const form = new FormData();
    form.set("name", name);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    form.set("image", new Blob([copy.buffer], { type: mimeType }), name);
    const data = await this.request<{ asset: AssetResult }>("/api/assets", { method: "POST", body: form });
    return { ...data.asset, contentUrl: new URL(data.asset.contentUrl, `${this.baseUrl}/`).href };
  }

  async getBrand(id: string): Promise<BrandResult> {
    const data = await this.request<{ brand: BrandResult }>(`/api/brands/${encodeURIComponent(id)}`);
    return data.brand;
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
    const input: TemplateInput = templateCreateSchema.parse(value);
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

  async listDrafts(limit = 30, includeArchived = false): Promise<DraftResult[]> {
    const data = await this.request<{ drafts: Array<Omit<DraftResult, "workspaceUrl">> }>(`/api/drafts?limit=${limit}&includeArchived=${includeArchived}`);
    return data.drafts.map((draft) => this.presentDraft(draft));
  }

  async getDraft(id: string): Promise<DraftResult> {
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>(`/api/drafts/${encodeURIComponent(id)}`);
    return this.presentDraft(data.draft);
  }

  async createDraft(payloadValue: unknown, prompt?: string): Promise<DraftResult> {
    const payload = postPayloadSchema.parse(payloadValue);
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>("/api/drafts", {
      method: "POST", headers: { "content-type": "application/json", "x-nocanva-created-by": "agent:mcp" }, body: JSON.stringify({ payload, prompt }),
    });
    return this.presentDraft(data.draft);
  }

  async updateDraft(id: string, expectedRevision: number, payloadValue: unknown, prompt?: string): Promise<DraftResult> {
    const payload = postPayloadSchema.parse(payloadValue);
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>(`/api/drafts/${encodeURIComponent(id)}`, {
      method: "PUT", headers: { "content-type": "application/json", "x-nocanva-created-by": "agent:mcp" }, body: JSON.stringify({ expectedRevision, payload, prompt }),
    });
    return this.presentDraft(data.draft);
  }

  async reviewDraft(id: string, reviewer = "agent:mcp", notes?: string): Promise<{ draft: DraftResult; review: ReviewResult }> {
    const draft = await this.getDraft(id);
    const capture = await this.capturePayload(draft.payload, draft.templateVersionId);
    const form = new FormData();
    form.set("expectedRevision", String(draft.currentRevision));
    form.set("reviewer", reviewer);
    if (notes) form.set("notes", notes);
    form.set("checks", JSON.stringify(capture.review.checks));
    const pngBytes = new Uint8Array(capture.png.byteLength);
    pngBytes.set(capture.png);
    form.set("png", new Blob([pngBytes.buffer], { type: "image/png" }), renderFilename(draft.payload));
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>(`/api/drafts/${encodeURIComponent(id)}/review`, {
      method: "POST", body: form,
    });
    return { draft: this.presentDraft(data.draft), review: { ...capture.review, imageBase64: Buffer.from(capture.png).toString("base64") } };
  }

  async approveDraft(id: string, expectedRevision: number, decision: "approved" | "rejected", actor = "agent:mcp", notes?: string): Promise<DraftResult> {
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>(`/api/drafts/${encodeURIComponent(id)}/approval`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision, actor, decision, notes }),
    });
    return this.presentDraft(data.draft);
  }

  async archiveDraft(id: string, archived = true): Promise<DraftResult> {
    const data = await this.request<{ draft: Omit<DraftResult, "workspaceUrl"> }>(`/api/drafts/${encodeURIComponent(id)}/archive`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived }),
    });
    return this.presentDraft(data.draft);
  }

  async listCarousels(limit = 30, includeArchived = false): Promise<CarouselResult[]> {
    const data = await this.request<{ carousels: ApiCarousel[] }>(`/api/carousels?limit=${limit}&includeArchived=${includeArchived}`);
    return data.carousels.map((carousel) => this.presentCarousel(carousel));
  }

  async getCarousel(id: string): Promise<CarouselResult> {
    const data = await this.request<{ carousel: ApiCarousel }>(`/api/carousels/${encodeURIComponent(id)}`);
    return this.presentCarousel(data.carousel);
  }

  async createCarousel(value: unknown): Promise<CarouselResult> {
    const input = carouselCreateInputSchema.parse(value);
    const data = await this.request<{ carousel: ApiCarousel }>("/api/carousels", {
      method: "POST", headers: { "content-type": "application/json", "x-nocanva-created-by": "agent:mcp" }, body: JSON.stringify(input),
    });
    return this.presentCarousel(data.carousel);
  }

  async updateCarousel(id: string, value: unknown): Promise<CarouselResult> {
    const input = carouselUpdateInputSchema.parse(value);
    const data = await this.request<{ carousel: ApiCarousel }>(`/api/carousels/${encodeURIComponent(id)}`, {
      method: "PUT", headers: { "content-type": "application/json", "x-nocanva-created-by": "agent:mcp" }, body: JSON.stringify(input),
    });
    return this.presentCarousel(data.carousel);
  }

  async reviewCarousel(id: string, reviewer = "agent:mcp", notes?: string): Promise<{ carousel: CarouselResult; review: CarouselReviewResult; imagesBase64: string[] }> {
    const carousel = await this.getCarousel(id);
    const captures = [];
    for (const [index, content] of carousel.slides.entries()) {
      captures.push(await this.capturePayload({ brandId: carousel.brandId, templateId: carousel.templateId, format: carousel.format, content }, carousel.templateVersionId, { index, total: carousel.slides.length }));
    }
    const form = new FormData();
    form.set("expectedRevision", String(carousel.currentRevision));
    form.set("reviewer", reviewer);
    if (notes) form.set("notes", notes);
    form.set("checks", JSON.stringify(captures.map((capture) => capture.review.checks)));
    captures.forEach((capture, slideIndex) => {
      const pngBytes = new Uint8Array(capture.png.byteLength);
      pngBytes.set(capture.png);
      form.set(`slide-${slideIndex}`, new Blob([pngBytes.buffer], { type: "image/png" }), `slide-${String(slideIndex + 1).padStart(2, "0")}.png`);
    });
    const data = await this.request<{ carousel: ApiCarousel }>(`/api/carousels/${encodeURIComponent(id)}/review`, { method: "POST", body: form });
    const reviewed = this.presentCarousel(data.carousel);
    if (!reviewed.review) throw new Error("The carousel review was not returned after capture.");
    return { carousel: reviewed, review: reviewed.review, imagesBase64: captures.map((capture) => Buffer.from(capture.png).toString("base64")) };
  }

  async approveCarousel(id: string, expectedRevision: number, decision: "approved" | "rejected", actor = "agent:mcp", notes?: string): Promise<CarouselResult> {
    const data = await this.request<{ carousel: ApiCarousel }>(`/api/carousels/${encodeURIComponent(id)}/approval`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision, actor, decision, notes }),
    });
    return this.presentCarousel(data.carousel);
  }

  async archiveCarousel(id: string, archived = true): Promise<CarouselResult> {
    const data = await this.request<{ carousel: ApiCarousel }>(`/api/carousels/${encodeURIComponent(id)}/archive`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived }),
    });
    return this.presentCarousel(data.carousel);
  }

  async renderCarousel(id: string): Promise<CarouselRenderResult> {
    const data = await this.request<{ render: ApiCarouselRender }>(`/api/carousels/${encodeURIComponent(id)}/render`, { method: "POST" });
    return this.presentCarouselRender(data.render);
  }

  async getCarouselRender(id: string): Promise<CarouselRenderResult> {
    const data = await this.request<{ render: ApiCarouselRender }>(`/api/carousel-renders/${encodeURIComponent(id)}`);
    return this.presentCarouselRender(data.render);
  }

  async renderDraft(id: string): Promise<RenderResult> {
    const draft = await this.getDraft(id);
    if (draft.status !== "approved" && draft.status !== "rendered") throw new Error("Approve the current draft revision before rendering it.");
    const form = new FormData();
    form.set("payload", JSON.stringify(draft.payload));
    form.set("draftRevisionId", draft.revisionId);
    form.set("templateVersionId", draft.templateVersionId);
    const data = await this.request<{ render: ApiRender }>("/api/renders", { method: "POST", headers: { "x-canvnah-created-by": "agent:mcp" }, body: form });
    return this.presentRender(data.render);
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
    return this.renderPayload(post.payload, post.id, parent.id, { templateVersionId: parent.templateVersionId });
  }

  async reviewTemplate(payloadValue: unknown): Promise<ReviewResult> {
    const payload = postPayloadSchema.parse(payloadValue);
    const capture = await this.capturePayload(payload);
    return { ...capture.review, imageBase64: Buffer.from(capture.png).toString("base64") };
  }

  private async renderPayload(payload: PostPayload, postId?: string, parentRenderId?: string, pinned?: { draftRevisionId?: string; templateVersionId?: string }): Promise<RenderResult> {
    const { png, review } = await this.capturePayload(payload, pinned?.templateVersionId);
    if (!review.passed) throw new Error(`Template review failed: ${review.checks.filter((check) => !check.passed).map((check) => check.detail).join(" ")}`);

    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (postId) form.set("postId", postId);
    if (pinned?.draftRevisionId) form.set("draftRevisionId", pinned.draftRevisionId);
    if (pinned?.templateVersionId) form.set("templateVersionId", pinned.templateVersionId);
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

  private async capturePayload(payload: PostPayload, templateVersionId?: string, sequence?: { index: number; total: number }): Promise<{ png: Uint8Array; review: Omit<ReviewResult, "imageBase64"> }> {
    if (!this.context.render) throw new Error("No media renderer is configured for this NoCanva MCP runtime.");
    const dimensions = formats[payload.format];
    const query = new URLSearchParams({ payload: JSON.stringify(payload) });
    if (templateVersionId) query.set("templateVersionId", templateVersionId);
    if (sequence) {
      query.set("slideIndex", String(sequence.index));
      query.set("slideTotal", String(sequence.total));
    }
    const renderBaseUrl = this.context.renderBaseUrl?.replace(/\/$/, "") ?? this.baseUrl;
    const previewUrl = `${renderBaseUrl}/render/preview?${query.toString()}`;
    const capture = await this.context.render({
      previewUrl,
      width: dimensions.width,
      height: dimensions.height,
      headers: this.trustedHeaders(),
      timeoutMs: this.context.renderTimeoutMs ?? Number(process.env.NOCANVA_RENDER_TIMEOUT_MS ?? 45_000),
    });
    const first = Buffer.from(capture.first);
    const second = Buffer.from(capture.second);
    const firstHash = createHash("sha256").update(first).digest("hex");
    const secondHash = createHash("sha256").update(second).digest("hex");
    if (first.readUInt32BE(16) !== dimensions.width || first.readUInt32BE(20) !== dimensions.height) {
      throw new Error(`The PNG must be ${dimensions.width} × ${dimensions.height}.`);
    }
    const checks = [
      { id: "schema", passed: true, detail: "Content matches the structured schema." },
      { id: "bounds", passed: capture.outside === 0, detail: capture.outside === 0 ? "Every region stays inside the canvas." : `${capture.outside} region(s) leave the canvas.` },
      { id: "overflow", passed: capture.overflowing === 0, detail: capture.overflowing === 0 ? "No text is clipped." : `${capture.overflowing} region(s) are clipped.` },
      { id: "collision", passed: capture.collisions === 0, detail: capture.collisions === 0 ? "Structured sections do not overlap." : `${capture.collisions} section pair(s) overlap.` },
      { id: "structure", passed: capture.collapsed === 0, detail: capture.collapsed === 0 ? "Brand header and footer remain visible." : `${capture.collapsed} structural region(s) collapsed under content pressure.` },
      { id: "typography", passed: capture.typographic === 0, detail: capture.typographic === 0 ? "Headline width, line count, token integrity, and final-line balance are readable." : `${capture.typographic} headline(s) have a narrow measure, excessive lines, a split token, or an orphaned final fragment.` },
      { id: "readability", passed: capture.undersized === 0, detail: capture.undersized === 0 ? "Supporting, evidence, and action text clears the phone-size floor." : `${capture.undersized} supporting, evidence, or action text region(s) are too small at phone size.` },
      { id: "media", passed: capture.media.length === 0, detail: capture.media.length === 0 ? "Images use their frames without weak letterboxing or destructive cropping." : capture.media.join(" ") },
      { id: "contrast", passed: capture.contrast === 0, detail: capture.contrast === 0 ? "Every headline, eyebrow, and supporting region clears the visibility threshold." : `${capture.contrast} critical text region(s) fall below the 3:1 visibility threshold.` },
      { id: "determinism", passed: firstHash === secondHash, detail: firstHash === secondHash ? "Repeated PNG hashes match." : "Repeated PNG hashes differ." },
    ];
    return {
      png: first,
      review: {
        passed: checks.every((check) => check.passed), checks, width: dimensions.width, height: dimensions.height,
        sha256: firstHash, templateVersion: capture.templateVersion ?? payload.templateId,
        previewUrl,
      },
    };
  }

  private presentRender(render: ApiRender): RenderResult {
    return {
      ...render,
      assetUrl: new URL(render.assetUrl, `${this.baseUrl}/`).href,
      workspaceUrl: new URL(`/renders/${render.id}`, `${this.baseUrl}/`).href,
    };
  }

  private presentDraft(draft: Omit<DraftResult, "workspaceUrl">): DraftResult {
    return { ...draft, workspaceUrl: new URL(`/drafts/${draft.id}`, `${this.baseUrl}/`).href };
  }

  private presentCarousel(carousel: ApiCarousel): CarouselResult {
    return {
      ...carousel,
      review: carousel.review ? { ...carousel.review, artifacts: carousel.review.artifacts.map((artifact) => ({ ...artifact, assetUrl: new URL(artifact.assetUrl, `${this.baseUrl}/`).href })) } : null,
      workspaceUrl: new URL(`/carousels/${carousel.id}`, `${this.baseUrl}/`).href,
    };
  }

  private presentCarouselRender(render: ApiCarouselRender): CarouselRenderResult {
    return {
      ...render,
      artifacts: render.artifacts.map((artifact) => ({ ...artifact, assetUrl: new URL(artifact.assetUrl, `${this.baseUrl}/`).href })),
      zipUrl: new URL(render.zipUrl, `${this.baseUrl}/`).href,
      workspaceUrl: new URL(`/carousel-renders/${render.id}`, `${this.baseUrl}/`).href,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      const requestHeaders = new Headers(init?.headers);
      for (const [name, value] of Object.entries(this.trustedHeaders())) requestHeaders.set(name, value);
      const request = new Request(`${this.baseUrl}${path}`, { ...init, headers: requestHeaders });
      response = this.context.appFetcher ? await this.context.appFetcher.fetch(request) : await fetch(request);
    } catch (error) {
      throw new Error(`NoCanva is not reachable at ${this.baseUrl}. Start the local app before using its MCP tools.`, { cause: error });
    }
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `NoCanva returned HTTP ${response.status}.`);
    return data;
  }

  private trustedHeaders() {
    const requestHeaders: Record<string, string> = {};
    if (this.context.serviceToken) requestHeaders.authorization = `Bearer ${this.context.serviceToken}`;
    if (this.context.siteBypassToken) requestHeaders["oai-sites-authorization"] = `Bearer ${this.context.siteBypassToken}`;
    if (this.context.workspaceId) requestHeaders["x-nocanva-workspace-id"] = this.context.workspaceId;
    if (this.context.actor) requestHeaders["x-nocanva-actor-id"] = this.context.actor;
    return requestHeaders;
  }
}
