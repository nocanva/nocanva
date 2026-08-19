import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const baseUrl = process.env.NOCANVA_BASE_URL ?? process.env.CANVNAH_BASE_URL ?? "http://localhost:3000";
const appToken = process.env.NOCANVA_APP_TOKEN;
const workspaceId = process.env.NOCANVA_WORKSPACE_ID;
const transport = new StdioClientTransport({ command: process.execPath, args: [tsx, "mcp/stdio.ts"], cwd: root, env: { ...process.env, CANVNAH_BASE_URL: baseUrl }, stderr: "inherit" });
const client = new Client({ name: "nocanva-draft-lifecycle-fixture", version: "0.1.0" });

function structured(result) {
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

async function call(name, args = {}) {
  return structured(await client.callTool({ name, arguments: args }));
}

const initialContent = {
  eyebrow: "NOCANVA / SPRINT 1",
  headline: "Agents and workspaces share one revision.",
  support: "The first revision is created by an agent and remains pinned to its exact template version.",
};

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const required = ["nocanva_get_brand", "nocanva_list_templates", "nocanva_list_drafts", "nocanva_get_draft", "nocanva_create_draft", "nocanva_update_draft", "nocanva_review_draft", "nocanva_approve_draft", "nocanva_archive_draft", "nocanva_render", "nocanva_get_render"];
  for (const name of required) assert.ok(listed.tools.some((tool) => tool.name === name), `Missing MCP tool: ${name}`);
  assert.ok(listed.tools.some((tool) => tool.name === "canvnah_create_brand"), "Legacy admin alias is missing");

  await call("canvnah_create_brand", {
    id: "sprint-one-fixture", name: "Sprint One", tagline: "TRUST EVERY REVISION.", website: "sprint-one.local",
    colors: { paper: "#F1EFE8", ink: "#171714", signal: "#2D6A4F", muted: "#64645E" }, safeArea: 64,
  });
  const templates = await call("nocanva_list_templates", { brandId: "sprint-one-fixture" });
  if (!templates.templates.some((template) => template.id === "sprint-one-statement")) {
    await call("canvnah_create_template", { id: "sprint-one-statement", brandId: "sprint-one-fixture", name: "Sprint One statement", description: "Lifecycle fixture template.", rendererKey: "statement" });
  }

  const created = await call("nocanva_create_draft", {
    brandId: "sprint-one-fixture", templateId: "sprint-one-statement", format: "portrait", content: initialContent,
    prompt: "Prove the shared agent and workspace revision lifecycle.",
  });
  assert.equal(created.draft.currentRevision, 1);
  assert.equal(created.draft.status, "draft");
  assert.equal(new URL(created.draft.workspaceUrl).origin, new URL(baseUrl).origin);
  assert.match(new URL(created.draft.workspaceUrl).pathname, /^\/drafts\//);
  const pinnedVersion = created.draft.templateVersionId;

  const humanContent = { ...initialContent, support: "A workspace actor edited this sentence; the agent must retrieve this exact second revision before review." };
  const humanResponse = await fetch(`${baseUrl}/api/drafts/${created.draft.id}`, {
    method: "PUT", headers: {
      "content-type": "application/json",
      ...(appToken ? { authorization: `Bearer ${appToken}`, "x-nocanva-actor-id": "human:fixture" } : { "x-nocanva-created-by": "human:fixture" }),
      ...(workspaceId ? { "x-nocanva-workspace-id": workspaceId } : {}),
    },
    body: JSON.stringify({ expectedRevision: 1, payload: { brandId: "sprint-one-fixture", templateId: "sprint-one-statement", format: "portrait", content: humanContent }, prompt: "Human-edited fixture revision." }),
  });
  assert.equal(humanResponse.status, 200);
  const human = await humanResponse.json();
  assert.equal(human.draft.currentRevision, 2);
  assert.equal(human.draft.revisionCreatedBy, "human:fixture");

  const retrieved = await call("nocanva_get_draft", { draftId: created.draft.id });
  assert.equal(retrieved.draft.payload.content.support, humanContent.support);
  assert.equal(retrieved.draft.currentRevision, 2);

  const stale = await client.callTool({ name: "nocanva_update_draft", arguments: { draftId: created.draft.id, expectedRevision: 1, brandId: "sprint-one-fixture", templateId: "sprint-one-statement", format: "portrait", content: humanContent } });
  assert.equal(stale.isError, true);

  await call("canvnah_create_template", { id: "sprint-one-statement", brandId: "sprint-one-fixture", name: "Sprint One statement", description: "A newer version created after the draft was pinned.", rendererKey: "statement" });
  const reviewed = await call("nocanva_review_draft", { draftId: created.draft.id, reviewer: "agent:fixture", notes: "Mechanical checks passed; fixture agent inspected the PNG." });
  assert.equal(reviewed.draft.status, "in_review");
  assert.equal(reviewed.review.passed, true);
  assert.match(reviewed.draft.review.sha256, /^[a-f0-9]{64}$/);
  assert.equal(reviewed.draft.templateVersionId, pinnedVersion);

  const approved = await call("nocanva_approve_draft", { draftId: created.draft.id, expectedRevision: 2, decision: "approved", actor: "agent:fixture" });
  assert.equal(approved.draft.status, "approved");
  const rendered = await call("nocanva_render", { draftId: created.draft.id });
  assert.equal(rendered.render.templateVersionId, pinnedVersion);
  assert.equal(rendered.render.draftRevisionId, approved.draft.revisionId);
  assert.equal(rendered.render.sha256, reviewed.draft.review.sha256);
  const inspected = await call("nocanva_get_render", { renderId: rendered.render.id });
  assert.equal(inspected.render.sha256, rendered.render.sha256);
  assert.equal(inspected.render.templateVersionId, pinnedVersion);

  const edited = await call("nocanva_update_draft", { draftId: created.draft.id, expectedRevision: 2, brandId: "sprint-one-fixture", templateId: "sprint-one-statement", format: "portrait", content: { ...humanContent, headline: "A new revision invalidates approval." }, prompt: "Post-approval edit fixture." });
  assert.equal(edited.draft.currentRevision, 3);
  assert.equal(edited.draft.status, "draft");
  assert.equal(edited.draft.approval, null);

  const archived = await call("nocanva_archive_draft", { draftId: created.draft.id, archived: true });
  assert.ok(archived.draft.archivedAt);
  const restored = await call("nocanva_archive_draft", { draftId: created.draft.id, archived: false });
  assert.equal(restored.draft.archivedAt, null);

  process.stdout.write(`${JSON.stringify({ tools: listed.tools.length, draftId: created.draft.id, revisions: restored.draft.currentRevision, pinnedTemplateVersionId: pinnedVersion, renderId: rendered.render.id, sha256: rendered.render.sha256 }, null, 2)}\n`);
} finally {
  await client.close();
}
