import assert from "node:assert/strict";
import test from "node:test";
import { acquireReusableBrowser } from "../mcp/cloudflare-browser-session.ts";

const binding = { fetch: globalThis.fetch };
const browser = {};

function sessionApi(overrides = {}) {
  let now = 0;
  return {
    acquire: async () => ({ sessionId: "new-session" }),
    connect: async () => browser,
    limits: async () => ({ activeSessions: [], maxConcurrentSessions: 3, allowedBrowserAcquisitions: 1, timeUntilNextAllowedBrowserAcquisition: 0 }),
    now: () => now,
    sessions: async () => [],
    wait: async (milliseconds) => { now += milliseconds; },
    ...overrides,
  };
}

test("hosted rendering reconnects to an idle browser session", async () => {
  let acquired = false;
  const api = sessionApi({
    sessions: async () => [{ sessionId: "idle-session", startTime: 0 }],
    acquire: async () => { acquired = true; return { sessionId: "unexpected" }; },
    connect: async (_binding, sessionId) => {
      assert.equal(sessionId, "idle-session");
      return browser;
    },
  });

  assert.equal(await acquireReusableBrowser(binding, api), browser);
  assert.equal(acquired, false);
});

test("hosted rendering acquires a reusable session when capacity is available", async () => {
  let keepAlive;
  const api = sessionApi({
    acquire: async (_binding, options) => {
      keepAlive = options.keep_alive;
      return { sessionId: "new-session" };
    },
  });

  assert.equal(await acquireReusableBrowser(binding, api), browser);
  assert.equal(keepAlive, 30_000);
});

test("hosted rendering waits for an active session instead of launching into a 429", async () => {
  let reads = 0;
  const api = sessionApi({
    sessions: async () => ++reads === 1
      ? [{ sessionId: "busy-session", startTime: 0, connectionId: "active-connection" }]
      : [{ sessionId: "busy-session", startTime: 0 }],
    limits: async () => ({ activeSessions: [], maxConcurrentSessions: 3, allowedBrowserAcquisitions: 0, timeUntilNextAllowedBrowserAcquisition: 20_000 }),
    connect: async (_binding, sessionId) => {
      assert.equal(sessionId, "busy-session");
      return browser;
    },
  });

  assert.equal(await acquireReusableBrowser(binding, api), browser);
  assert.equal(reads, 2);
});

test("hosted rendering returns a retryable explanation when capacity stays exhausted", async () => {
  const api = sessionApi({
    limits: async () => ({ activeSessions: [], maxConcurrentSessions: 3, allowedBrowserAcquisitions: 0, timeUntilNextAllowedBrowserAcquisition: 20_000 }),
  });

  await assert.rejects(
    acquireReusableBrowser(binding, api, 500),
    /Retry the review; the draft revision is unchanged/,
  );
});
