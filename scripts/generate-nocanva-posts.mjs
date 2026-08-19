import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
const outputDirectory = fileURLToPath(new URL("../outputs/nocanva/", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [tsx, "mcp/stdio.ts"],
  cwd: root,
  env: { ...process.env, CANVNAH_BASE_URL: baseUrl },
  stderr: "inherit",
});
const client = new Client({ name: "nocanva-post-generator", version: "0.1.0" });

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) {
  return structured(await client.callTool({ name, arguments: args }));
}

const posts = [
  {
    slug: "design-systems-should-be-executable",
    templateId: "nocanva-statement",
    format: "portrait",
    content: {
      eyebrow: "NOCANVA / PRINCIPLE",
      headline: "Design systems should be executable.",
      support: "Define the brand once. Let agents create, review, and render every post from the same rules.",
    },
  },
  {
    slug: "brand-should-survive-the-prompt",
    templateId: "nocanva-statement",
    format: "portrait",
    content: {
      eyebrow: "NOCANVA / BRAND SYSTEM",
      headline: "Your brand should survive the prompt.",
      support: "NoCanva locks colors, spacing, templates, and safe areas before an agent writes a word.",
    },
  },
  {
    slug: "every-post-should-explain-itself",
    templateId: "nocanva-signal",
    format: "portrait",
    content: {
      eyebrow: "NOCANVA / PROVENANCE",
      headline: "Every post should explain itself.",
      support: "Immutable renders preserve the inputs, template version, dimensions, and SHA-256 behind each PNG.",
    },
  },
];

try {
  await client.connect(transport);

  await call("canvnah_create_brand", {
    id: "nocanva",
    name: "NoCanva",
    tagline: "IDEAS IN. MEDIA OUT.",
    website: "nocanva.local",
    colors: { paper: "#EFEDE6", ink: "#171714", signal: "#E4402D", muted: "#5F5D55" },
    safeArea: 64,
  });

  const listed = await call("canvnah_list_templates", { brandId: "nocanva" });
  const existing = new Set(listed.templates.map((template) => template.id));
  for (const template of [
    { id: "nocanva-statement", name: "NoCanva statement", description: "A decisive product principle with concise supporting copy.", rendererKey: "statement" },
    { id: "nocanva-signal", name: "NoCanva signal", description: "An evidence-led product observation with strong hierarchy.", rendererKey: "signal" },
  ]) {
    if (!existing.has(template.id)) {
      await call("canvnah_create_template", { ...template, brandId: "nocanva" });
    }
  }

  await mkdir(outputDirectory, { recursive: true });
  const manifest = [];
  for (const post of posts) {
    const review = await call("canvnah_review_template", {
      brandId: "nocanva",
      templateId: post.templateId,
      format: post.format,
      content: post.content,
    });
    assert.equal(review.review.passed, true, `${post.slug} failed review`);

    const created = await call("canvnah_create_post", {
      brandId: "nocanva",
      templateId: post.templateId,
      format: post.format,
      prompt: "Introduce NoCanva using claims supported by the local product repository.",
      content: post.content,
    });
    const rendered = await call("canvnah_render_post", { postId: created.post.id });
    const inspected = await call("canvnah_get_render", { renderId: rendered.render.id });
    assert.equal(inspected.render.sha256, rendered.render.sha256);

    const asset = await fetch(rendered.render.assetUrl);
    assert.equal(asset.ok, true);
    const outputPath = `${outputDirectory}${post.slug}-${post.format}.png`;
    await writeFile(outputPath, Buffer.from(await asset.arrayBuffer()));
    manifest.push({
      ...post,
      postId: created.post.id,
      renderId: rendered.render.id,
      sha256: rendered.render.sha256,
      assetUrl: rendered.render.assetUrl,
      workspaceUrl: rendered.render.workspaceUrl,
      outputPath,
    });
  }

  process.stdout.write(`${JSON.stringify({ brandId: "nocanva", posts: manifest }, null, 2)}\n`);
} finally {
  await client.close();
}
