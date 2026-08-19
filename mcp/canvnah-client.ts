import { createHash } from "node:crypto";
import { brandConfigSchema, formats, postPayloadSchema, renderFilename, templateInputSchema, type BrandConfig, type PostPayload, type TemplateInput } from "../lib/media";

export type BrandResult = { id: string; name: string; config: BrandConfig; createdAt: number };
export type TemplateResult = { id: string; brandId: string; name: string; description: string; type: string; version: number; rendererKey: "statement" | "signal" | "bloom"; contentSchema: unknown; createdAt: number };
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
  renderTimeoutMs?: number;
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

  private async capturePayload(payload: PostPayload, templateVersionId?: string): Promise<{ png: Uint8Array; review: Omit<ReviewResult, "imageBase64"> }> {
    if (!this.context.render) throw new Error("No media renderer is configured for this NoCanva MCP runtime.");
    const dimensions = formats[payload.format];
    const query = new URLSearchParams({ payload: JSON.stringify(payload) });
    if (templateVersionId) query.set("templateVersionId", templateVersionId);
    const previewUrl = `${this.baseUrl}/render/preview?${query.toString()}`;
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

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      const requestHeaders = new Headers(init?.headers);
      for (const [name, value] of Object.entries(this.trustedHeaders())) requestHeaders.set(name, value);
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: requestHeaders });
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
