import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CanvnahClient, type CanvnahClientContext } from "./canvnah-client";
import { brandConfigSchema, templateInputSchema } from "../lib/media";

const contentSchema = z.object({
  eyebrow: z.string().trim().min(1).max(28).describe("Short section label, up to 28 characters."),
  headline: z.string().trim().min(1).max(84).describe("Primary claim, up to 84 characters."),
  support: z.string().trim().min(1).max(150).describe("Supporting explanation, up to 150 characters."),
});

function result(value: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

export function buildServer(baseUrl?: string, context: CanvnahClientContext = {}) {
  const server = new McpServer(
    { name: "nocanva", version: "0.2.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Primary workflow: get the approved brand, list and reuse templates, create a stable draft, review its pinned revision and inspect the returned PNG, approve that exact revision, render it, then inspect the immutable render. Retrieve a draft before updating so expectedRevision cannot overwrite newer edits. Brand/template creation is advanced setup. Never invent claims or publish externally.",
    },
  );
  const client = new CanvnahClient(baseUrl, context);

  server.registerTool("nocanva_get_brand", {
    title: "Get NoCanva brand",
    description: "Read one brand system and its locked design tokens.",
    inputSchema: z.object({ brandId: z.string() }),
    annotations: { readOnlyHint: true },
  }, async ({ brandId }) => result({ brand: await client.getBrand(brandId) }));

  server.registerTool("nocanva_list_templates", {
    title: "List NoCanva templates",
    description: "List versioned templates, optionally filtered by brand. Reuse approved templates instead of creating one per post.",
    inputSchema: z.object({ brandId: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ brandId }) => result({ templates: await client.listTemplates(brandId) }));

  server.registerTool("nocanva_list_drafts", {
    title: "List NoCanva drafts",
    description: "List current workspace drafts and their latest revisions.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30), includeArchived: z.boolean().default(false) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit, includeArchived }) => result({ drafts: await client.listDrafts(limit, includeArchived) }));

  server.registerTool("nocanva_get_draft", {
    title: "Get NoCanva draft",
    description: "Retrieve the current draft revision, including human or agent edits, review, approval, pinned template version, and stable workspace URL.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ draftId }) => result({ draft: await client.getDraft(draftId) }));

  server.registerTool("nocanva_create_draft", {
    title: "Create NoCanva draft",
    description: "Create a stable editable draft using an existing brand and approved template.",
    inputSchema: z.object({
      brandId: z.string(), templateId: z.string(), format: z.enum(["portrait", "square"]), content: contentSchema,
      prompt: z.string().trim().max(500).optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ prompt, ...payload }) => result({ draft: await client.createDraft(payload, prompt) }));

  server.registerTool("nocanva_update_draft", {
    title: "Update NoCanva draft",
    description: "Create a new immutable draft revision. expectedRevision prevents overwriting newer human or agent edits.",
    inputSchema: z.object({
      draftId: z.string().uuid(), expectedRevision: z.number().int().positive(), brandId: z.string(), templateId: z.string(),
      format: z.enum(["portrait", "square"]), content: contentSchema, prompt: z.string().trim().max(500).optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ draftId, expectedRevision, prompt, ...payload }) => result({ draft: await client.updateDraft(draftId, expectedRevision, payload, prompt) }));

  server.registerTool("nocanva_review_draft", {
    title: "Review NoCanva draft",
    description: "Render the pinned draft revision, run mechanical checks, record the review, and attach the PNG for multimodal visual inspection.",
    inputSchema: z.object({ draftId: z.string().uuid(), reviewer: z.string().default("agent:mcp"), notes: z.string().trim().max(500).optional() }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ draftId, reviewer, notes }) => {
    const reviewed = await client.reviewDraft(draftId, reviewer, notes);
    const { imageBase64, ...review } = reviewed.review;
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ draft: reviewed.draft, review }, null, 2) },
        { type: "image" as const, data: imageBase64, mimeType: "image/png" },
      ],
      structuredContent: { draft: reviewed.draft, review },
    };
  });

  server.registerTool("nocanva_approve_draft", {
    title: "Approve or reject NoCanva draft",
    description: "Record an actor-neutral decision against the current mechanically reviewed revision.",
    inputSchema: z.object({ draftId: z.string().uuid(), expectedRevision: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), actor: z.string().default("agent:mcp"), notes: z.string().trim().max(500).optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ draftId, expectedRevision, decision, actor, notes }) => result({ draft: await client.approveDraft(draftId, expectedRevision, decision, actor, notes) }));

  server.registerTool("nocanva_archive_draft", {
    title: "Archive or restore NoCanva draft",
    description: "Soft-archive or restore a draft without deleting its revisions, approvals, or render history.",
    inputSchema: z.object({ draftId: z.string().uuid(), archived: z.boolean().default(true) }),
    annotations: { destructiveHint: false, idempotentHint: true },
  }, async ({ draftId, archived }) => result({ draft: await client.archiveDraft(draftId, archived) }));

  server.registerTool("nocanva_render", {
    title: "Render approved NoCanva draft",
    description: "Render the approved current revision with its pinned template version and save an immutable PNG.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ draftId }) => result({ render: await client.renderDraft(draftId) }));

  server.registerTool("nocanva_get_render", {
    title: "Get NoCanva render",
    description: "Inspect an immutable render, its pinned template version, content snapshot, dimensions, hash, and URLs.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ renderId }) => result({ render: await client.getRender(renderId) }));

  server.registerTool("canvnah_list_brands", {
    title: "List NoCanva brands",
    description: "List locally available brand systems and their design tokens.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => result({ brands: await client.listBrands() }));

  server.registerTool("canvnah_create_brand", {
    title: "Create or update a NoCanva brand",
    description: "Create a local brand system from repository evidence, or update the same brand ID after review.",
    inputSchema: brandConfigSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
  }, async (config) => result({ brand: await client.createBrand(config) }));

  server.registerTool("canvnah_list_templates", {
    title: "List NoCanva templates",
    description: "List locally available versioned templates, optionally filtered by brand.",
    inputSchema: z.object({ brandId: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ brandId }) => result({ templates: await client.listTemplates(brandId) }));

  server.registerTool("canvnah_create_template", {
    title: "Create a NoCanva template version",
    description: "Create a local brand template. Reusing its ID creates a new immutable version after review.",
    inputSchema: templateInputSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async (template) => result({ template: await client.createTemplate(template) }));

  server.registerTool("canvnah_review_template", {
    title: "Review a NoCanva template",
    description: "Render representative copy without saving a post, return automated layout checks, and attach the PNG for visual review.",
    inputSchema: z.object({
      brandId: z.string(), templateId: z.string(), format: z.enum(["portrait", "square"]), content: contentSchema,
    }),
    annotations: { readOnlyHint: true },
  }, async (payload) => {
    const { imageBase64, ...review } = await client.reviewTemplate(payload);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ review }, null, 2) },
        { type: "image" as const, data: imageBase64, mimeType: "image/png" },
      ],
      structuredContent: { review },
    };
  });

  server.registerTool("canvnah_create_post", {
    title: "Create a NoCanva post",
    description: "Create a structured local post record. Use a listed brand and template ID.",
    inputSchema: z.object({
      brandId: z.string(),
      templateId: z.string(),
      format: z.enum(["portrait", "square"]),
      content: contentSchema,
      prompt: z.string().trim().max(500).optional().describe("The originating agent request or editorial brief."),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ prompt, ...payload }) => result({ post: await client.createPost(payload, prompt) }));

  server.registerTool("canvnah_list_posts", {
    title: "List NoCanva posts",
    description: "List recent structured posts from the local workspace.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit }) => result({ posts: await client.listPosts(limit) }));

  server.registerTool("canvnah_render_post", {
    title: "Render a NoCanva post",
    description: "Render a stored post into a deterministic PNG and save an immutable local render.",
    inputSchema: z.object({ postId: z.string().uuid(), parentRenderId: z.string().uuid().optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ postId, parentRenderId }) => result({ render: await client.renderPost(postId, parentRenderId) }));

  server.registerTool("canvnah_list_renders", {
    title: "List NoCanva renders",
    description: "List recent immutable renders with asset and workspace URLs.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit }) => result({ renders: await client.listRenders(limit) }));

  server.registerTool("canvnah_get_render", {
    title: "Inspect a NoCanva render",
    description: "Read one immutable render, including input snapshot, dimensions, hashes, version, and URLs.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ renderId }) => result({ render: await client.getRender(renderId) }));

  server.registerTool("canvnah_rerender", {
    title: "Rerender NoCanva media",
    description: "Create a new immutable render from an existing render snapshot and link it as an iteration.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ renderId }) => result({ render: await client.rerender(renderId) }));

  return server;
}
