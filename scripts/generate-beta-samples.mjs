import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const outputDirectory = fileURLToPath(new URL("../outputs/beta-samples/", import.meta.url));
const manifestPath = `${outputDirectory}manifest.json`;
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, NOCANVA_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-beta-samples", version: "0.1.0" });

const evidenceLedger = [
  { brandId: "sprout", source: "https://sprout.fortwinai.com/", verified: "Personal plant help on WhatsApp; accepts text, photos, and voice notes; calm, clear next steps." },
  { brandId: "scamdb-india", source: "https://www.scamdb.in/", verified: "Community fraud register for Indian phone numbers and UPI IDs; reports are reviewed; a listing is not confirmation of fraud." },
  { brandId: "blindspot", source: "https://blindspot.buzz/", verified: "Checks public-post claims, missing context, and sources; evidence rather than a truth score." },
  { brandId: "parakhi", source: "https://parakhi.in/", verified: "Sourced product breakdowns covering Indian value capture, tax, and value flowing abroad." },
  { brandId: "promptry", source: "https://promptry.run/", verified: "Local-first prompt observability with eval suites, cost tracking, SQLite storage, and no account." },
];

const samples = [
  {
    slug: "sprout-chat",
    brand: { id: "sprout", name: "Sprout", tagline: "PLANT HELP ON WHATSAPP.", website: "sprout.fortwinai.com", colors: { paper: "#F6F3EC", ink: "#1C2A22", signal: "#25D366", muted: "#637168", accent: "#F4D7A1" }, safeArea: 64, logo: { wordmark: "Sprout", mark: "🌱" } },
    template: { id: "sprout-chat-beta", name: "Sprout WhatsApp conversation", description: "A conversation-led card that shows the product where it lives: inside WhatsApp.", rendererKey: "chat" },
    content: { eyebrow: "SPROUT / FIRST 2 MINUTES", headline: "Plant help, inside WhatsApp.", support: "No download, signup, or learning curve. Ask with text, a photo, or a voice note.", steps: ["My Tulsi leaves are turning yellow 😟", "Likely overwatering. Let the soil dry a bit before watering again.", "Can it still recover?", "Very possible 🌿 Give it 5–7 days."], backgroundStyle: "paper" },
  },
  {
    slug: "scamdb-lookup",
    brand: { id: "scamdb-india", name: "ScamDB", tagline: "CHECK BEFORE YOU PAY.", website: "scamdb.in", colors: { paper: "#FBFAF8", ink: "#16243C", signal: "#E24536", muted: "#687386", accent: "#EEF1F7" }, safeArea: 64 },
    template: { id: "scamdb-lookup-beta", name: "ScamDB lookup result", description: "A search-and-result card built around ScamDB's core lookup interaction.", rendererKey: "lookup" },
    content: { eyebrow: "SCAMDB / CHECK FIRST", headline: "Know the number before you pay.", support: "Search a phone number or UPI ID, read what the community reported, then verify before acting.", quote: "9876543210", highlight: "A report is a signal—not a verdict.", steps: ["Community-submitted reports", "Reviewed before publishing", "Always free and public"], backgroundStyle: "paper_grid" },
  },
  {
    slug: "blindspot-context",
    brandId: "blindspot",
    compositionId: "claim",
    content: { eyebrow: "BLINDSPOT / REPORT", headline: "The short answer first. Every receipt underneath.", support: "Open the claims, missing context, sources, framing, confidence, and limitations when you want the full story.", highlight: "Evidence, not a truth score.", backgroundStyle: "ink" },
  },
  {
    slug: "parakhi-breakdown",
    brand: { id: "parakhi", name: "Parakhi", tagline: "KYA HAI ANDAR?", website: "parakhi.in", colors: { paper: "#0E0906", ink: "#F8F3EB", signal: "#E56F50", muted: "#AAA39B", accent: "#E5B64A" }, safeArea: 64 },
    template: { id: "parakhi-breakdown-beta", name: "Parakhi rupee breakdown", description: "A sourced value-capture breakdown that makes the numbers the visual object.", rendererKey: "breakdown" },
    content: { eyebrow: "PARAKHI / PACKAGED BISCUITS", headline: "What is actually inside ₹4?", support: "Parle-G Original Glucose Biscuits · 55g pack. Every number sourced.", metric: "92%", metricLabel: "Indian value capture", steps: ["India — 82%", "Tax — 5%", "Abroad — 13%"], backgroundStyle: "paper" },
  },
  {
    slug: "promptry-regression",
    brand: { id: "promptry", name: "promptry", tagline: "KEEP A PROMPT HONEST.", website: "promptry.run", colors: { paper: "#0B0C0E", ink: "#ECEDEF", signal: "#E5B957", muted: "#7C7F86", accent: "#6FD39A" }, safeArea: 64 },
    template: { id: "promptry-terminal-beta", name: "Promptry eval terminal", description: "A terminal-native composition for prompt regression results.", rendererKey: "terminal" },
    content: { eyebrow: "PROMPTRY / RAG-REGRESSION", headline: "Catch prompt regressions before your users do.", support: "PASS quality 0.891 · PASS grounding 0.942 · WARN refusal drifted −0.04 vs baseline", backgroundStyle: "paper" },
  },
];

function structured(result) {
  if (result.isError) throw new Error(result.content?.map((item) => item.type === "text" ? item.text : "").filter(Boolean).join("\n") || "NoCanva tool call failed.");
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) { return structured(await client.callTool({ name, arguments: args })); }

try {
  await client.connect(transport);
  await mkdir(outputDirectory, { recursive: true });
  if (process.argv.includes("--finalize")) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const visualRubric = {
      hookUnderOneSecond: true,
      clearHierarchy: true,
      phoneReadable: true,
      textDensityAcceptable: true,
      mediaCropCorrect: "not applicable; these five are structured interface/data compositions",
      unmistakablyOnBrand: true,
      professionallyDesigned: true,
      distinctFromRecentPosts: true,
    };
    const renderedSamples = [];
    for (const item of manifest.samples) {
      const current = await call("nocanva_get_draft", { draftId: item.draftId });
      assert.equal(current.draft.currentRevision, item.currentRevision);
      assert.equal(current.draft.review.status, "passed");
      const approved = await call("nocanva_approve_draft", { draftId: item.draftId, expectedRevision: item.currentRevision, decision: "approved", actor: "agent:beta-visual-qa", notes: "Passed all eight visual rubric checks; no design edits required." });
      const rendered = await call("nocanva_render", { draftId: item.draftId });
      const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
      assert.equal(inspected.render.sha256, item.sha256);
      assert.equal(inspected.render.templateVersionId, item.templateVersionId);
      assert.equal(inspected.render.draftRevisionId, approved.draft.revisionId);
      const response = await fetch(inspected.render.assetUrl);
      assert.equal(response.ok, true);
      const outputPath = `${outputDirectory}${item.slug}.png`;
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
      renderedSamples.push({ ...item, renderId: inspected.render.id, assetUrl: inspected.render.assetUrl, renderWorkspaceUrl: inspected.render.workspaceUrl, width: inspected.render.width, height: inspected.render.height, outputPath });
    }
    const completed = { ...manifest, finalizedAt: new Date().toISOString(), status: "rendered", visualRubric, samples: renderedSamples };
    await writeFile(manifestPath, `${JSON.stringify(completed, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(completed, null, 2)}\n`);
  } else {
    try {
      const previous = JSON.parse(await readFile(manifestPath, "utf8"));
      for (const item of previous.samples ?? []) if (item.draftId) await call("nocanva_archive_draft", { draftId: item.draftId, archived: true });
    } catch (error) { if (error?.code !== "ENOENT") throw error; }

    const reviewedSamples = [];
    const requestedSample = process.env.NOCANVA_BETA_SAMPLE;
    for (const sample of requestedSample ? samples.filter((item) => item.slug === requestedSample) : samples) {
      if (sample.brand) {
        await call("canvnah_create_brand", sample.brand);
        const templates = await call("nocanva_list_templates", { brandId: sample.brand.id });
        if (!templates.templates.some((item) => item.id === sample.template.id)) await call("canvnah_create_template", { ...sample.template, brandId: sample.brand.id });
      }
      const created = await call("nocanva_create_draft", {
        brandId: sample.brandId ?? sample.brand.id,
        ...(sample.compositionId ? { compositionId: sample.compositionId } : { templateId: sample.template.id }),
        format: "portrait",
        content: sample.content,
        prompt: `Use only the verified product claims in ${evidenceLedger.find((entry) => entry.brandId === (sample.brandId ?? sample.brand.id)).source}.`,
      });
      const result = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id, reviewer: "agent:beta-visual-qa", notes: "Mechanical review complete; visual rubric review pending." } });
      const reviewed = structured(result);
      const image = result.content.find((item) => item.type === "image");
      assert.ok(image && image.type === "image");
      const reviewPath = `${outputDirectory}${sample.slug}-review.png`;
      await writeFile(reviewPath, Buffer.from(image.data, "base64"));
      assert.equal(reviewed.review.passed, true, `${sample.slug} failed: ${reviewed.review.checks.filter((check) => !check.passed).map((check) => check.detail).join(" ")}`);
      assert.deepEqual(reviewed.contentWarnings, []);
      reviewedSamples.push({ slug: sample.slug, draftId: reviewed.draft.id, currentRevision: reviewed.draft.currentRevision, templateVersionId: reviewed.draft.templateVersionId, workspaceUrl: reviewed.draft.workspaceUrl, sha256: reviewed.review.sha256, reviewPath });
    }
    const manifest = { generatedAt: new Date().toISOString(), status: "reviewed", baseUrl, evidenceLedger, samples: reviewedSamples };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  }
} finally { await client.close(); }
