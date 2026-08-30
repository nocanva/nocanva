import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CanvnahClient, type CanvnahClientContext } from "./canvnah-client";
import { brandConfigSchema, draftLayoutSchema, postContentSchema, templateInputSchema } from "../lib/media";
import { carouselSequenceRole, carouselStoryWarnings, chooseVisualDirection, compositionDiversityGuidance, compositionFromTemplateId, compositionIdSchema, compositions, compositionTemplateIds, creativeContentWarnings, rankVisualDirections, recentCompositionWarnings, visualDirections, visualDirectionSchema, visualFingerprint, visualReviewRubric, visualSimilarityWarnings } from "../lib/compositions";

const contentSchema = postContentSchema.describe("Semantic content and asset treatments. No coordinates or Puck-specific data.");
const draftPayloadInputSchema = z.object({
  brandId: z.string(),
  templateId: z.string().optional().describe("Existing template ID. Prefer compositionId for Blindspot creative work."),
  compositionId: compositionIdSchema.optional().describe("Approved semantic composition family."),
  format: z.enum(["portrait", "square"]),
  content: contentSchema,
  layout: draftLayoutSchema.optional().describe("Optional bounded layout refinements: headline scale/alignment, density, and raised/balanced/lowered section positions. Never use coordinates."),
}).refine((value) => value.templateId || value.compositionId, { message: "Provide compositionId or templateId." });

function resolveDraftPayload(input: z.infer<typeof draftPayloadInputSchema>, visualDirection?: z.infer<typeof visualDirectionSchema>) {
  if (input.brandId === "blindspot" && !input.compositionId) throw new Error("Blindspot beta work requires a semantic compositionId. Legacy statement templates are retained only for historical renders.");
  const templateId = input.compositionId ? compositionTemplateIds[input.compositionId] : input.templateId!;
  const content = visualDirection && !input.content.visualDirection ? { ...input.content, visualDirection } : input.content;
  return { brandId: input.brandId, templateId, ...(input.compositionId ? { compositionId: input.compositionId } : {}), format: input.format, content, ...(input.layout ? { layout: input.layout } : {}) };
}

function result(value: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

async function recentCreativeWork(client: CanvnahClient, brandId: string, recentLimit = 20) {
  const [drafts, carousels] = await Promise.all([client.listDrafts(recentLimit, false), client.listCarousels(recentLimit, false)]);
  const recentDrafts = drafts.filter((draft) => draft.brandId === brandId).map((draft) => ({
    kind: "draft" as const,
    draftId: draft.id,
    compositionId: draft.payload.compositionId,
    visualDirection: draft.payload.content.visualDirection,
    backgroundStyle: draft.payload.content.backgroundStyle,
    headline: draft.payload.content.headline,
    visualFingerprint: draft.payload.compositionId ? visualFingerprint(draft.payload.compositionId, draft.payload.content).key : undefined,
    workspaceUrl: draft.workspaceUrl,
    updatedAt: draft.updatedAt,
  }));
  const recentCarousels = carousels.filter((carousel) => carousel.brandId === brandId).map((carousel) => ({
    kind: "carousel" as const,
    carouselId: carousel.id,
    compositionId: compositionFromTemplateId(carousel.templateId),
    visualDirection: carousel.slides[0]?.visualDirection,
    backgroundStyle: carousel.slides[0]?.backgroundStyle,
    headline: carousel.slides[0]?.headline,
    visualFingerprint: compositionFromTemplateId(carousel.templateId) && carousel.slides[0] ? visualFingerprint(compositionFromTemplateId(carousel.templateId)!, carousel.slides[0]).key : undefined,
    workspaceUrl: carousel.workspaceUrl,
    updatedAt: carousel.updatedAt,
  }));
  return [...recentDrafts, ...recentCarousels].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, recentLimit);
}

async function routeCarouselSlides(client: CanvnahClient, input: { brandId: string; templateId: string; slides: z.infer<typeof contentSchema>[] }, previousSlides: z.infer<typeof contentSchema>[] = []) {
  const compositionId = compositionFromTemplateId(input.templateId);
  if (!compositionId) return input.slides;
  const recent = await recentCreativeWork(client, input.brandId, 20);
  const routed: z.infer<typeof contentSchema>[] = [];
  for (let index = 0; index < input.slides.length; index += 1) {
    const slide = input.slides[index];
    const retained = slide.visualDirection ?? previousSlides[index]?.visualDirection;
    const direction = retained ?? chooseVisualDirection({ compositionId, content: slide, sequenceRole: carouselSequenceRole(index, input.slides.length), recent: [...routed.map((item) => ({ compositionId, visualDirection: item.visualDirection, headline: item.headline })), ...recent] });
    routed.push({ ...slide, visualDirection: direction });
  }
  return routed;
}

export function buildServer(baseUrl?: string, context: CanvnahClientContext = {}) {
  const server = new McpServer(
    { name: "nocanva", version: "0.4.0-rc.1" },
    {
      capabilities: { tools: {} },
      instructions:
        "Primary workflow — Blindspot-first: get the approved brand, inspect approved compositions and recent work, choose a visually distinct semantic composition, create a stable draft, review its pinned revision and visually inspect the PNG against all eight rubric questions, revise up to three times, approve that exact review, render it, then inspect the immutable render. Retrieve current state before updating so expectedRevision cannot overwrite human edits, and preserve any human layout refinements unless intentionally changing them. Never invent claims, expose Puck JSON, use arbitrary layout coordinates, or publish externally.",
    },
  );
  const client = new CanvnahClient(baseUrl, context);

  server.registerTool("nocanva_list_assets", {
    title: "List NoCanva images",
    description: "List immutable workspace images available for drafts and carousel slides.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => result({ assets: await client.listAssets() }));

  server.registerTool("nocanva_upload_asset", {
    title: "Upload a NoCanva image",
    description: "Upload a PNG or JPEG screenshot/photo into immutable workspace storage. Use the returned asset ID in structured content crop controls.",
    inputSchema: z.object({ name: z.string().trim().min(1).max(120), mimeType: z.enum(["image/png", "image/jpeg"]), base64: z.string().min(4).max(1_000_000) }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ name, mimeType, base64 }) => result({ asset: await client.uploadAsset(name, mimeType, base64) }));

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

  server.registerTool("nocanva_list_compositions", {
    title: "List approved NoCanva compositions",
    description: "List Blindspot's six semantic composition families plus one compact diversity recommendation based on recent drafts and carousels. Choose by story purpose, not coordinates.",
    inputSchema: z.object({ brandId: z.string().default("blindspot"), candidate: compositionIdSchema.optional(), candidateDirection: visualDirectionSchema.optional(), recentLimit: z.number().int().min(3).max(20).default(20) }),
    annotations: { readOnlyHint: true },
  }, async ({ brandId, candidate, candidateDirection, recentLimit }) => {
    const recent = await recentCreativeWork(client, brandId, recentLimit);
    return result({ brandId, compositions: Object.values(compositions), visualDirections: Object.values(visualDirections), recent, diversity: compositionDiversityGuidance(recent), warnings: recentCompositionWarnings(recent, candidate, candidateDirection) });
  });

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
    inputSchema: draftPayloadInputSchema.safeExtend({ prompt: z.string().trim().max(500).optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ prompt, ...input }) => {
    const recent = await recentCreativeWork(client, input.brandId, 20);
    const recommendations = input.compositionId ? rankVisualDirections({ compositionId: input.compositionId, content: input.content, recent }) : [];
    const selected = input.content.visualDirection ?? recommendations[0]?.id;
    const draft = await client.createDraft(resolveDraftPayload(input, selected), prompt);
    return result({ draft, creativeDirection: { selected: draft.payload.content.visualDirection ?? "editorial", alternatives: recommendations.slice(1, 3), reason: recommendations.find((item) => item.id === draft.payload.content.visualDirection)?.reason ?? "Explicit or legacy direction." } });
  });

  server.registerTool("nocanva_update_draft", {
    title: "Update NoCanva draft",
    description: "Create a new immutable draft revision. expectedRevision prevents overwriting newer human or agent edits. Retrieve the draft first and preserve its semantic layout unless intentionally changing it.",
    inputSchema: draftPayloadInputSchema.safeExtend({ draftId: z.string().uuid(), expectedRevision: z.number().int().positive(), prompt: z.string().trim().max(500).optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ draftId, expectedRevision, prompt, ...input }) => {
    const current = await client.getDraft(draftId);
    const recent = await recentCreativeWork(client, input.brandId, 20);
    const selected = input.content.visualDirection ?? current.payload.content.visualDirection ?? (input.compositionId ? chooseVisualDirection({ compositionId: input.compositionId, content: input.content, recent }) : undefined);
    return result({ draft: await client.updateDraft(draftId, expectedRevision, resolveDraftPayload(input, selected), prompt) });
  });

  server.registerTool("nocanva_review_draft", {
    title: "Review NoCanva draft",
    description: "Render the pinned draft revision, run mechanical checks, record the review, and attach the PNG for multimodal visual inspection.",
    inputSchema: z.object({ draftId: z.string().uuid(), reviewer: z.string().default("agent:mcp"), notes: z.string().trim().max(500).optional() }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ draftId, reviewer, notes }) => {
    const reviewed = await client.reviewDraft(draftId, reviewer, notes);
    const { imageBase64, ...review } = reviewed.review;
    const compositionId = reviewed.draft.payload.compositionId;
    const fingerprint = compositionId ? visualFingerprint(compositionId, reviewed.draft.payload.content) : null;
    const recent = (await recentCreativeWork(client, reviewed.draft.brandId, 20)).filter((item) => item.kind !== "draft" || item.draftId !== reviewed.draft.id);
    const directionWarnings = fingerprint ? [...recentCompositionWarnings(recent, compositionId, reviewed.draft.payload.content.visualDirection), ...visualSimilarityWarnings(recent, fingerprint.key)] : [];
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ draft: reviewed.draft, review, contentWarnings: creativeContentWarnings(reviewed.draft.payload.content), creativeReview: { visualDirection: reviewed.draft.payload.content.visualDirection ?? "editorial", fingerprint, warnings: directionWarnings }, visualReviewRubric, maxAgentIterations: 3 }, null, 2) },
        { type: "image" as const, data: imageBase64, mimeType: "image/png" },
      ],
      structuredContent: { draft: reviewed.draft, review, contentWarnings: creativeContentWarnings(reviewed.draft.payload.content), creativeReview: { visualDirection: reviewed.draft.payload.content.visualDirection ?? "editorial", fingerprint, warnings: directionWarnings }, visualReviewRubric, maxAgentIterations: 3 },
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

  server.registerTool("nocanva_list_carousels", {
    title: "List NoCanva carousels",
    description: "List current 3–7 slide carousels and their latest revisions.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30), includeArchived: z.boolean().default(false) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit, includeArchived }) => result({ carousels: await client.listCarousels(limit, includeArchived) }));

  server.registerTool("nocanva_get_carousel", {
    title: "Get NoCanva carousel",
    description: "Retrieve current carousel slides, human or agent edits, review artifacts, approval, pinned template version, and stable workspace URL.",
    inputSchema: z.object({ carouselId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ carouselId }) => result({ carousel: await client.getCarousel(carouselId) }));

  server.registerTool("nocanva_create_carousel", {
    title: "Create NoCanva carousel",
    description: "Create a stable editable 3–7 slide carousel using one existing brand and approved template. No layout roles are required: NoCanva infers hook, context, evidence, and close from slide order. For Blindspot, reserve What’s missing for omitted-context stories; use Explainer for screenshot-free feature education and Product only with real product screenshots.",
    inputSchema: z.object({
      brandId: z.string(), templateId: z.string(), format: z.enum(["portrait", "square"]), slides: z.array(contentSchema).min(3).max(7),
      prompt: z.string().trim().max(500).optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async (input) => result({ carousel: await client.createCarousel({ ...input, slides: await routeCarouselSlides(client, input) }) }));

  server.registerTool("nocanva_update_carousel", {
    title: "Update NoCanva carousel",
    description: "Create a new immutable carousel revision. expectedRevision prevents overwriting newer human or agent edits.",
    inputSchema: z.object({
      carouselId: z.string().uuid(), expectedRevision: z.number().int().positive(), brandId: z.string(), templateId: z.string(),
      format: z.enum(["portrait", "square"]), slides: z.array(contentSchema).min(3).max(7), prompt: z.string().trim().max(500).optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ carouselId, ...input }) => {
    const current = await client.getCarousel(carouselId);
    return result({ carousel: await client.updateCarousel(carouselId, { ...input, slides: await routeCarouselSlides(client, input, current.slides) }) });
  });

  server.registerTool("nocanva_review_carousel", {
    title: "Review NoCanva carousel",
    description: "Render every pinned carousel slide, run mechanical checks, record one review, and attach every PNG for multimodal visual inspection.",
    inputSchema: z.object({ carouselId: z.string().uuid(), reviewer: z.string().default("agent:mcp"), notes: z.string().trim().max(500).optional() }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async ({ carouselId, reviewer, notes }) => {
    const reviewed = await client.reviewCarousel(carouselId, reviewer, notes);
    const compositionId = compositionFromTemplateId(reviewed.carousel.templateId);
    const contentWarnings = [
      ...reviewed.carousel.slides.flatMap((slide, slideIndex) => creativeContentWarnings(slide).map((warning) => `Slide ${slideIndex + 1}: ${warning}`)),
      ...carouselStoryWarnings(reviewed.carousel.slides),
    ];
    const slideDirections = compositionId ? reviewed.carousel.slides.map((slide) => ({ visualDirection: slide.visualDirection ?? "editorial", fingerprint: visualFingerprint(compositionId, slide) })) : [];
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ carousel: reviewed.carousel, review: reviewed.review, compositionId, contentWarnings, creativeReview: { slides: slideDirections }, visualReviewRubric, requiredVisualAnswers: reviewed.carousel.slides.map((_, slideIndex) => ({ slide: slideIndex + 1, questions: visualReviewRubric })) }, null, 2) },
        ...reviewed.imagesBase64.map((data) => ({ type: "image" as const, data, mimeType: "image/png" as const })),
      ],
      structuredContent: { carousel: reviewed.carousel, review: reviewed.review, compositionId, contentWarnings, creativeReview: { slides: slideDirections }, visualReviewRubric },
    };
  });

  server.registerTool("nocanva_approve_carousel", {
    title: "Approve or reject NoCanva carousel",
    description: "Record a decision against the current carousel revision and its exact passing review artifact set.",
    inputSchema: z.object({ carouselId: z.string().uuid(), expectedRevision: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), actor: z.string().default("agent:mcp"), notes: z.string().trim().max(500).optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ carouselId, expectedRevision, decision, actor, notes }) => result({ carousel: await client.approveCarousel(carouselId, expectedRevision, decision, actor, notes) }));

  server.registerTool("nocanva_archive_carousel", {
    title: "Archive or restore NoCanva carousel",
    description: "Soft-archive or restore a carousel without deleting revisions, review artifacts, approvals, or render history.",
    inputSchema: z.object({ carouselId: z.string().uuid(), archived: z.boolean().default(true) }),
    annotations: { destructiveHint: false, idempotentHint: true },
  }, async ({ carouselId, archived }) => result({ carousel: await client.archiveCarousel(carouselId, archived) }));

  server.registerTool("nocanva_render_carousel", {
    title: "Render approved NoCanva carousel",
    description: "Promote the exact approved review PNGs into an immutable multi-slide render and expose a ZIP download.",
    inputSchema: z.object({ carouselId: z.string().uuid() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ carouselId }) => result({ render: await client.renderCarousel(carouselId) }));

  server.registerTool("nocanva_get_carousel_render", {
    title: "Get NoCanva carousel render",
    description: "Inspect immutable carousel slides, pinned template version, dimensions, SHA-256 hashes, slide URLs, ZIP URL, and workspace URL.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ renderId }) => result({ render: await client.getCarouselRender(renderId) }));

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
    description: "Create a local brand template. Use rendererKey 'layout' with a bounded layout object for agent-authored HTML/CSS composition. Reusing its ID creates a new immutable version after review.",
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
