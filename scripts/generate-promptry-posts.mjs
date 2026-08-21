import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const outputDirectory = fileURLToPath(new URL("../outputs/promptry/", import.meta.url));
const manifestPath = `${outputDirectory}manifest.json`;
const finalize = process.argv.includes("--finalize");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [tsx, "mcp/stdio.ts"],
  cwd: root,
  env: { ...process.env, NOCANVA_BASE_URL: baseUrl },
  stderr: "inherit",
});
const client = new Client({ name: "nocanva-promptry-campaign", version: "0.1.0" });

const brand = {
  id: "promptry",
  name: "promptry",
  tagline: "KEEP A PROMPT HONEST.",
  website: "promptry.meownikov.xyz",
  colors: {
    paper: "#0B0C0E",
    ink: "#ECEDEF",
    signal: "#E5B957",
    muted: "#7C7F86",
    accent: "#6FD39A",
  },
  safeArea: 72,
};

const templates = [
  {
    id: "promptry-terminal-window",
    brandId: brand.id,
    name: "Promptry terminal window",
    description: "A command-window composition for developer workflow and regression claims.",
    rendererKey: "terminal",
  },
  {
    id: "promptry-local-split",
    brandId: brand.id,
    name: "Promptry local split",
    description: "An asymmetric editorial split for local-first product principles.",
    rendererKey: "split",
  },
  {
    id: "promptry-cost-ledger",
    brandId: brand.id,
    name: "Promptry cost ledger",
    description: "A structured ledger composition for cost, trace, and budget messages.",
    rendererKey: "ledger",
  },
];

const evidenceLedger = {
  source: "https://promptry.meownikov.xyz/",
  inspectedAt: new Date().toISOString(),
  verified: [
    "Promptry is a local-first prompt observability tool for LLM pipelines.",
    "It versions prompts and runs eval suites locally or in CI.",
    "It stores data in one local SQLite file and requires no account.",
    "It tracks per-call cost and supports daily and monthly budget caps.",
    "It supports Python and JavaScript packages.",
  ],
};

const posts = [
  {
    slug: "catch-prompt-regressions",
    templateId: "promptry-terminal-window",
    content: {
      eyebrow: "PROMPTRY / REGRESSIONS",
      headline: "Catch prompt regressions before your users do.",
      support: "Version every prompt and run eval suites locally or in CI, so changes are measured before they reach production.",
    },
  },
  {
    slug: "one-sqlite-file",
    templateId: "promptry-local-split",
    content: {
      eyebrow: "PROMPTRY / LOCAL-FIRST",
      headline: "One SQLite file. No SaaS. No account.",
      support: "Keep prompt versions, traces, feedback, and per-call costs on your laptop—with zero telemetry by default.",
    },
  },
  {
    slug: "know-what-moved-the-bill",
    templateId: "promptry-cost-ledger",
    content: {
      eyebrow: "PROMPTRY / COST CONTROL",
      headline: "Know which prompt moved the bill.",
      support: "Drill down from module to prompt to call, then enforce daily and monthly model-spend caps before costs drift.",
    },
  },
];

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) {
  return structured(await client.callTool({ name, arguments: args }));
}

try {
  await client.connect(transport);
  await mkdir(outputDirectory, { recursive: true });

  if (finalize) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const renders = [];
    for (const item of manifest.posts) {
      const current = await call("nocanva_get_draft", { draftId: item.draftId });
      assert.equal(current.draft.currentRevision, item.currentRevision);
      assert.equal(current.draft.review.status, "passed");
      const approved = await call("nocanva_approve_draft", {
        draftId: item.draftId,
        expectedRevision: item.currentRevision,
        decision: "approved",
        actor: "agent:promptry-visual-qa",
        notes: "Approved after visual inspection of the reviewed PNG.",
      });
      const rendered = await call("nocanva_render", { draftId: item.draftId });
      const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
      assert.equal(inspected.render.sha256, item.reviewSha256);
      assert.equal(inspected.render.templateVersionId, item.templateVersionId);
      assert.equal(inspected.render.draftRevisionId, approved.draft.revisionId);
      const response = await fetch(inspected.render.assetUrl);
      assert.equal(response.ok, true);
      const outputPath = `${outputDirectory}${item.slug}.png`;
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
      renders.push({
        ...item,
        renderId: inspected.render.id,
        workspaceUrl: inspected.render.workspaceUrl,
        assetUrl: inspected.render.assetUrl,
        width: inspected.render.width,
        height: inspected.render.height,
        sha256: inspected.render.sha256,
        outputPath,
      });
    }
    const completed = { ...manifest, finalizedAt: new Date().toISOString(), status: "rendered", posts: renders };
    await writeFile(manifestPath, `${JSON.stringify(completed, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(completed, null, 2)}\n`);
  } else {
    const brands = await call("canvnah_list_brands");
    if (!brands.brands.some((item) => item.id === brand.id)) await call("canvnah_create_brand", brand);
    const listedTemplates = await call("nocanva_list_templates", { brandId: brand.id });
    for (const template of templates) {
      if (!listedTemplates.templates.some((item) => item.id === template.id)) await call("canvnah_create_template", template);
    }

    try {
      const previous = JSON.parse(await readFile(manifestPath, "utf8"));
      for (const item of previous.posts ?? []) {
        if (item.draftId) await call("nocanva_archive_draft", { draftId: item.draftId, archived: true });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const reviewedPosts = [];
    for (const post of posts) {
      const created = await call("nocanva_create_draft", {
        brandId: brand.id,
        templateId: post.templateId,
        format: "portrait",
        content: post.content,
        prompt: `Create a factually restrained launch post using only verified claims from ${evidenceLedger.source}`,
      });
      const reviewResult = await client.callTool({
        name: "nocanva_review_draft",
        arguments: {
          draftId: created.draft.id,
          reviewer: "agent:promptry-mechanical-qa",
          notes: "Mechanical review complete; awaiting visual inspection before approval.",
        },
      });
      const reviewed = structured(reviewResult);
      assert.equal(reviewed.review.passed, true);
      const image = reviewResult.content.find((item) => item.type === "image");
      assert.ok(image && image.type === "image");
      const reviewPath = `${outputDirectory}${post.slug}-review.png`;
      await writeFile(reviewPath, Buffer.from(image.data, "base64"));
      reviewedPosts.push({
        slug: post.slug,
        templateId: post.templateId,
        content: post.content,
        draftId: reviewed.draft.id,
        currentRevision: reviewed.draft.currentRevision,
        templateVersionId: reviewed.draft.templateVersionId,
        workspaceUrl: reviewed.draft.workspaceUrl,
        reviewSha256: reviewed.review.sha256,
        reviewPath,
      });
    }
    const manifest = {
      generatedAt: new Date().toISOString(),
      status: "reviewed",
      baseUrl,
      brand,
      templates,
      evidenceLedger,
      posts: reviewedPosts,
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  }
} finally {
  await client.close();
}
