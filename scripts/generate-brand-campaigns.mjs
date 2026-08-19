import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
const outputDirectory = fileURLToPath(new URL("../outputs/brand-campaigns/", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [tsx, "mcp/stdio.ts"],
  cwd: root,
  env: { ...process.env, NOCANVA_BASE_URL: baseUrl },
  stderr: "inherit",
});
const client = new Client({ name: "nocanva-brand-campaign-generator", version: "0.2.0" });

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) {
  return structured(await client.callTool({ name, arguments: args }));
}

const campaigns = [
  {
    brand: {
      id: "scamdb-india",
      name: "ScamDB India",
      tagline: "CHECK BEFORE YOU PAY.",
      website: "scamdb.in",
      colors: { paper: "#F5F4F1", ink: "#19212E", signal: "#C7352D", muted: "#667085" },
      safeArea: 72,
    },
    template: {
      id: "scamdb-community-alert",
      name: "ScamDB community alert",
      description: "A consistent evidence-led safety card for community fraud awareness.",
      rendererKey: "signal",
    },
    posts: [
      {
        slug: "know-the-number-before-you-pay",
        content: {
          eyebrow: "SCAMDB / CHECK FIRST",
          headline: "Know the number before you pay.",
          support: "Search an Indian phone number or UPI ID against reports submitted by the community before you send money.",
        },
      },
      {
        slug: "one-report-can-protect-the-next-person",
        content: {
          eyebrow: "SCAMDB / COMMUNITY",
          headline: "One report can protect the next person.",
          support: "Share suspicious calls, messages, or payment requests. Submissions are reviewed before appearing publicly.",
        },
      },
      {
        slug: "a-report-is-a-signal-not-a-verdict",
        content: {
          eyebrow: "SCAMDB / CONTEXT",
          headline: "A report is a signal, not a verdict.",
          support: "ScamDB is a community fraud-awareness register—not confirmation of fraud. Read reports and verify before acting.",
        },
      },
    ],
  },
  {
    brand: {
      id: "parakhi",
      name: "Parakhi",
      tagline: "WHAT'S ACTUALLY INSIDE.",
      website: "parakhi.in",
      colors: { paper: "#0E0906", ink: "#F8F3EB", signal: "#E5B64A", muted: "#AAA39B", accent: "#6ABB6E" },
      safeArea: 72,
    },
    template: {
      id: "parakhi-value-breakdown",
      name: "Parakhi value breakdown",
      description: "A consistent editorial card for sourced Indian product value breakdowns.",
      rendererKey: "statement",
    },
    posts: [
      {
        slug: "where-does-your-money-go",
        content: {
          eyebrow: "PARAKHI / FOLLOW THE RUPEE",
          headline: "Where does your money go when you buy Indian?",
          support: "Parakhi traces every rupee across Indian value capture, tax, and value flowing abroad—with every number sourced.",
        },
      },
      {
        slug: "the-label-is-only-the-beginning",
        content: {
          eyebrow: "PARAKHI / LOOK INSIDE",
          headline: "The label is only the beginning.",
          support: "Search everyday products to see who captures the value, how much becomes tax, and how much leaves India.",
        },
      },
      {
        slug: "compare-products-with-evidence",
        content: {
          eyebrow: "PARAKHI / SOURCED DATA",
          headline: "Compare products with evidence, not assumptions.",
          support: "Explore sourced breakdowns across hundreds of products and dozens of categories, with GST grounded in CBIC data.",
        },
      },
    ],
  },
];

try {
  await client.connect(transport);
  await mkdir(outputDirectory, { recursive: true });
  const manifest = [];

  for (const campaign of campaigns) {
    await call("canvnah_create_brand", campaign.brand);
    const listed = await call("nocanva_list_templates", { brandId: campaign.brand.id });
    if (!listed.templates.some((template) => template.id === campaign.template.id)) {
      await call("canvnah_create_template", { ...campaign.template, brandId: campaign.brand.id });
    }

    for (const post of campaign.posts) {
      const created = await call("nocanva_create_draft", {
        brandId: campaign.brand.id,
        templateId: campaign.template.id,
        format: "portrait",
        content: post.content,
        prompt: `Create a factually restrained launch post from the public ${campaign.brand.website} product page.`,
      });
      const reviewed = await call("nocanva_review_draft", {
        draftId: created.draft.id,
        reviewer: "agent:release-qa",
        notes: "Mechanical checks passed; queued for multimodal release-candidate inspection.",
      });
      assert.equal(reviewed.review.passed, true, `${campaign.brand.id}/${post.slug} failed mechanical review`);
      const approved = await call("nocanva_approve_draft", {
        draftId: created.draft.id,
        expectedRevision: reviewed.draft.currentRevision,
        decision: "approved",
        actor: "agent:release-qa",
        notes: "Approved for the release-candidate render set.",
      });
      const rendered = await call("nocanva_render", { draftId: created.draft.id });
      const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
      assert.equal(inspected.render.sha256, rendered.render.sha256);
      assert.equal(inspected.render.width, 1080);
      assert.equal(inspected.render.height, 1350);
      assert.equal(inspected.render.draftRevisionId, approved.draft.revisionId);

      const asset = await fetch(rendered.render.assetUrl);
      assert.equal(asset.ok, true);
      const outputPath = `${outputDirectory}${campaign.brand.id}-${post.slug}.png`;
      await writeFile(outputPath, Buffer.from(await asset.arrayBuffer()));
      manifest.push({
        brandId: campaign.brand.id,
        templateId: campaign.template.id,
        slug: post.slug,
        draftId: created.draft.id,
        renderId: rendered.render.id,
        sha256: rendered.render.sha256,
        width: rendered.render.width,
        height: rendered.render.height,
        workspaceUrl: rendered.render.workspaceUrl,
        assetUrl: rendered.render.assetUrl,
        outputPath,
      });
    }
  }

  const manifestPath = `${outputDirectory}manifest.json`;
  await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, posts: manifest }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ posts: manifest, manifestPath }, null, 2)}\n`);
} finally {
  await client.close();
}
