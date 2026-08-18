import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { CanvnahClient } from "./canvnah-client";

const contentSchema = z.object({
  eyebrow: z.string().trim().min(1).max(28).describe("Short section label, up to 28 characters."),
  headline: z.string().trim().min(1).max(84).describe("Primary claim, up to 84 characters."),
  support: z.string().trim().min(1).max(150).describe("Supporting explanation, up to 150 characters."),
});

function result(value: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

function buildServer() {
  const server = new McpServer(
    { name: "canvnah-local", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: "Use these tools to create deterministic, brand-safe Canvnah media through the local development app." },
  );
  const client = new CanvnahClient();

  server.registerTool("canvnah_list_brands", {
    title: "List Canvnah brands",
    description: "List locally available brand systems and their design tokens.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => result({ brands: await client.listBrands() }));

  server.registerTool("canvnah_list_templates", {
    title: "List Canvnah templates",
    description: "List locally available versioned templates, optionally filtered by brand.",
    inputSchema: z.object({ brandId: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ brandId }) => result({ templates: await client.listTemplates(brandId) }));

  server.registerTool("canvnah_create_post", {
    title: "Create a Canvnah post",
    description: "Create a structured local post record. Use a listed brand and template ID.",
    inputSchema: z.object({
      brandId: z.literal("blindspot"),
      templateId: z.enum(["statement", "signal"]),
      format: z.enum(["portrait", "square"]),
      content: contentSchema,
      prompt: z.string().trim().max(500).optional().describe("The originating agent request or editorial brief."),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ prompt, ...payload }) => result({ post: await client.createPost(payload, prompt) }));

  server.registerTool("canvnah_list_posts", {
    title: "List Canvnah posts",
    description: "List recent structured posts from the local workspace.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit }) => result({ posts: await client.listPosts(limit) }));

  server.registerTool("canvnah_render_post", {
    title: "Render a Canvnah post",
    description: "Render a stored post into a deterministic PNG and save an immutable local render.",
    inputSchema: z.object({ postId: z.string().uuid(), parentRenderId: z.string().uuid().optional() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ postId, parentRenderId }) => result({ render: await client.renderPost(postId, parentRenderId) }));

  server.registerTool("canvnah_list_renders", {
    title: "List Canvnah renders",
    description: "List recent immutable renders with asset and workspace URLs.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(30) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit }) => result({ renders: await client.listRenders(limit) }));

  server.registerTool("canvnah_get_render", {
    title: "Inspect a Canvnah render",
    description: "Read one immutable render, including input snapshot, dimensions, hashes, version, and URLs.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { readOnlyHint: true },
  }, async ({ renderId }) => result({ render: await client.getRender(renderId) }));

  server.registerTool("canvnah_rerender", {
    title: "Rerender Canvnah media",
    description: "Create a new immutable render from an existing render snapshot and link it as an iteration.",
    inputSchema: z.object({ renderId: z.string().uuid() }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async ({ renderId }) => result({ render: await client.rerender(renderId) }));

  return server;
}

serveStdio(buildServer, { onerror: (error) => console.error(error.message) });
