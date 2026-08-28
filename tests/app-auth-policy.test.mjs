import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolvePrincipal } from "../lib/server/auth-policy.ts";

const serviceToken = "ncv_app_fixture_0123456789abcdef0123456789";

test("local mode preserves the frictionless self-host actor contract", async () => {
  const principal = await resolvePrincipal(new Headers({ "x-nocanva-created-by": "human:fixture" }), {
    mode: "disabled",
    workspaceId: "local-team",
  });
  assert.deepEqual(principal, { kind: "local", actor: "human:fixture", workspaceId: "local-team" });
});

test("hosted mode fails closed for anonymous and invalid service requests", async () => {
  const config = { mode: "sites_private", workspaceId: "default", serviceToken };
  assert.equal(await resolvePrincipal(new Headers(), config), null);
  assert.equal(await resolvePrincipal(new Headers({ authorization: "Bearer wrong-token" }), config), null);
});

test("a valid internal service request carries trusted actor and workspace context", async () => {
  const principal = await resolvePrincipal(new Headers({
    authorization: `Bearer ${serviceToken}`,
    "x-nocanva-actor-id": "agent:release-bot",
    "x-nocanva-workspace-id": "team-alpha",
  }), { mode: "sites_private", workspaceId: "default", serviceToken });
  assert.deepEqual(principal, { kind: "service", actor: "agent:release-bot", workspaceId: "team-alpha" });
});

test("Sites identity ignores spoofed actor and workspace headers", async () => {
  const principal = await resolvePrincipal(new Headers({
    "oai-authenticated-user-id": "user-123",
    "x-nocanva-actor-id": "agent:spoofed",
    "x-nocanva-workspace-id": "other-team",
  }), { mode: "sites_private", workspaceId: "trusted-team", serviceToken });
  assert.deepEqual(principal, { kind: "sites-user", actor: "human:user-123", workspaceId: "trusted-team" });
});

test("Cloudflare Access identity is attributed inside the configured workspace", async () => {
  const principal = await resolvePrincipal(new Headers({
    "x-nocanva-access-user-id": "access-user-123",
    "x-nocanva-actor-id": "agent:spoofed",
    "x-nocanva-workspace-id": "other-team",
  }), { mode: "cloudflare_access", workspaceId: "trusted-team", serviceToken });
  assert.deepEqual(principal, { kind: "access-user", actor: "human:access-user-123", workspaceId: "trusted-team" });
});

test("Cloudflare Access mode fails closed without an injected identity", async () => {
  assert.equal(await resolvePrincipal(new Headers({
    "x-nocanva-actor-id": "human:spoofed",
    "oai-authenticated-user-id": "sites-user-spoofed",
  }), { mode: "cloudflare_access", workspaceId: "trusted-team", serviceToken }), null);
});

test("every media API route and private workspace page enforce the application boundary", async () => {
  const routes = [
    "brands/route.ts", "brands/[id]/route.ts", "templates/route.ts", "posts/route.ts", "posts/[id]/route.ts",
    "drafts/route.ts", "drafts/[id]/route.ts", "drafts/[id]/revisions/route.ts", "drafts/[id]/review/route.ts",
    "drafts/[id]/approval/route.ts", "drafts/[id]/archive/route.ts", "renders/route.ts", "renders/[id]/route.ts",
    "renders/[id]/asset/route.ts",
    "carousels/route.ts", "carousels/[id]/route.ts", "carousels/[id]/revisions/route.ts",
    "carousels/[id]/review/route.ts", "carousels/[id]/approval/route.ts", "carousels/[id]/archive/route.ts",
    "carousels/[id]/render/route.ts", "carousels/reviews/[reviewId]/assets/[slideIndex]/route.ts",
    "carousel-renders/[id]/route.ts", "carousel-renders/[id]/assets/[slideIndex]/route.ts", "carousel-renders/[id]/zip/route.ts",
    "activation/route.ts", "mcp-tokens/route.ts", "mcp-tokens/[id]/route.ts", "internal/mcp/auth/route.ts",
    "assets/route.ts", "assets/[id]/route.ts", "assets/[id]/content/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(new URL(`../app/api/${route}`, import.meta.url), "utf8");
    assert.match(source, /authorizeApi/, `${route} must authorize requests`);
  }
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const create = await readFile(new URL("../app/create/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /requireNoCanvaViewer/, "the shared layout must allow sign-in and legal pages");
  assert.match(home, /requireNoCanvaViewer/, "the application home must require a viewer");
  assert.match(create, /requireNoCanvaViewer/, "the creation workspace must require a viewer");
});
