import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeLoopbackNativeRegistration } from "../lib/server/oauth-registration.ts";
import { personalWorkspaceId } from "../lib/workspace-identity.ts";

test("personal workspace ids are deterministic, distinct, and valid", async () => {
  const first = await personalWorkspaceId("google-user-1");
  assert.equal(first, await personalWorkspaceId("google-user-1"));
  assert.notEqual(first, await personalWorkspaceId("google-user-2"));
  assert.match(first, /^[a-z][a-z0-9-]{1,47}$/);
});

test("public auth is Google-only and MCP tokens resolve a user workspace", async () => {
  const authSource = await readFile(new URL("../lib/server/auth.ts", import.meta.url), "utf8");
  const consentSource = await readFile(new URL("../app/consent/page.tsx", import.meta.url), "utf8");
  const workerSource = await readFile(new URL("../mcp/worker.ts", import.meta.url), "utf8");
  assert.match(authSource, /socialProviders:\s*\{\s*google:/s);
  assert.doesNotMatch(authSource, /emailAndPassword:\s*\{\s*enabled:\s*true/s);
  assert.doesNotMatch(consentSource, /params\.code/);
  assert.match(consentSource, /params\.scope/);
  assert.match(workerSource, /jwtVerify/);
  assert.match(workerSource, /customFetch[\s\S]*applicationRequest\(env, "\/api\/auth\/jwks"/);
  assert.match(workerSource, /principalForOAuthUser\(claims\.sub/);
  assert.match(workerSource, /scopes\.has\("nocanva:read"\).*scopes\.has\("nocanva:write"\)/);
  const appWorker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(appWorker, /\/\.well-known\/oauth-authorization-server\/api\/auth/);
});

test("beta keeps approval human-only and legal pages public", async () => {
  const config = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(config, /"NOCANVA_APPROVAL_MODE": "human_required"/);
  assert.doesNotMatch(layout, /requireNoCanvaViewer/);
  await Promise.all([
    readFile(new URL("../app/privacy/page.tsx", import.meta.url)),
    readFile(new URL("../app/terms/page.tsx", import.meta.url)),
  ]);
});

test("OAuth DCR treats CLI loopback callbacks as a native client", async () => {
  const registration = (redirectUris, applicationType) => new Request("https://nocanva.test/api/auth/oauth2/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: redirectUris,
      ...(applicationType ? { application_type: applicationType } : {}),
    }),
  });

  const claude = await normalizeLoopbackNativeRegistration(registration(["http://localhost:63014/callback"]));
  assert.equal((await claude.json()).application_type, "native");

  const codex = await normalizeLoopbackNativeRegistration(registration(["http://127.0.0.1:51722/callback/client"]));
  assert.equal((await codex.json()).application_type, "native");

  const web = await normalizeLoopbackNativeRegistration(registration(["https://example.com/callback"]));
  assert.equal((await web.json()).application_type, undefined);

  const contradictoryWeb = await normalizeLoopbackNativeRegistration(registration(["http://localhost:63014/callback"], "web"));
  assert.equal((await contradictoryWeb.json()).application_type, "native");

  const explicitNative = await normalizeLoopbackNativeRegistration(registration(["http://localhost:63014/callback"], "native"));
  assert.equal((await explicitNative.json()).application_type, "native");
});
