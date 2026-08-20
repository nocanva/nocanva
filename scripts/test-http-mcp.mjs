import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const root = fileURLToPath(new URL("../", import.meta.url));
const tsx = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const port = Number(process.env.NOCANVA_HTTP_FIXTURE_PORT ?? 3199);
const token = process.env.NOCANVA_HTTP_FIXTURE_TOKEN ?? "ncv_http_fixture_0123456789abcdef0123456789abcdef";
const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const externalEndpoint = process.env.NOCANVA_HTTP_FIXTURE_ENDPOINT;
const imageOutput = process.env.NOCANVA_HTTP_FIXTURE_IMAGE;
const endpoint = externalEndpoint?.replace(/\/$/, "").replace(/\/mcp$/, "") ?? `http://127.0.0.1:${port}`;
const child = externalEndpoint ? null : spawn(process.execPath, [tsx, "mcp/http-server.ts"], {
  cwd: root,
  env: {
    ...process.env,
    NOCANVA_ALLOW_REMOTE_APP_URL: "1",
    NOCANVA_BASE_URL: baseUrl,
    NOCANVA_MCP_HOST: "127.0.0.1",
    NOCANVA_MCP_PORT: String(port),
    NOCANVA_MCP_TOKEN: token,
  },
  stdio: ["ignore", "pipe", "inherit"],
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/healthz`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The HTTP MCP fixture did not become healthy.");
}

function structured(result) {
  assert.equal(result.isError, undefined, JSON.stringify(result.content));
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent;
}

const client = new Client({ name: "nocanva-http-fixture", version: "0.2.0" });
try {
  await waitForHealth();
  const unauthorized = await fetch(`${endpoint}/diagnostics`);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("www-authenticate") ?? "", /^Bearer/);
  const diagnostics = await fetch(`${endpoint}/diagnostics`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(diagnostics.status, 200);
  assert.equal((await diagnostics.json()).workspaceId, "default");

  const transport = new StreamableHTTPClientTransport(new URL(`${endpoint}/mcp`), {
    authProvider: { token: async () => token },
  });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 33);

  const created = structured(await client.callTool({
    name: "nocanva_create_draft",
    arguments: {
      brandId: "blindspot",
      templateId: "statement",
      format: "square",
      prompt: "Sprint 2 authenticated HTTP fixture.",
      content: {
        eyebrow: "NOCANVA / SPRINT 2",
        headline: "One agent workflow, wherever NoCanva runs.",
        support: "Use local stdio during development or authenticated Streamable HTTP for a self-hosted workspace.",
      },
    },
  }));
  const reviewResult = await client.callTool({ name: "nocanva_review_draft", arguments: { draftId: created.draft.id } });
  if (imageOutput) {
    const image = reviewResult.content?.find((item) => item.type === "image");
    assert.ok(image?.data, "The review did not return a PNG for visual inspection.");
    await writeFile(imageOutput, Buffer.from(image.data, "base64"));
  }
  const reviewed = structured(reviewResult);
  assert.equal(reviewed.review.passed, true);
  const approved = structured(await client.callTool({
    name: "nocanva_approve_draft",
    arguments: { draftId: created.draft.id, expectedRevision: created.draft.currentRevision, decision: "approved", actor: "agent:http-fixture" },
  }));
  assert.equal(approved.draft.status, "approved");
  const rendered = structured(await client.callTool({ name: "nocanva_render", arguments: { draftId: created.draft.id } }));
  const inspected = structured(await client.callTool({ name: "nocanva_get_render", arguments: { renderId: rendered.render.id } }));
  assert.equal(inspected.render.sha256, rendered.render.sha256);
  assert.equal(rendered.render.sha256, reviewed.draft.review.sha256);
  assert.equal(inspected.render.draftRevisionId, created.draft.revisionId);
  assert.match(inspected.render.workspaceUrl, /^http/);

  console.log(JSON.stringify({ transport: "streamable-http", tools: tools.tools.length, draftId: created.draft.id, renderId: rendered.render.id, sha256: rendered.render.sha256 }, null, 2));
} finally {
  await client.close().catch(() => undefined);
  child?.kill("SIGTERM");
}
