import type { ActiveSession, Browser, BrowserWorker, LimitsResponse, WorkersLaunchOptions } from "@cloudflare/playwright";

// Long enough for a carousel or quick revision loop, short enough not to burn
// the hosted beta's daily browser allowance while nobody is rendering.
const browserKeepAliveMs = 30_000;
const browserWaitBudgetMs = 25_000;
const browserPollIntervalMs = 250;

export type BrowserSessionApi = {
  acquire: (binding: BrowserWorker, options?: WorkersLaunchOptions) => Promise<{ sessionId: string }>;
  connect: (binding: BrowserWorker, sessionId: string) => Promise<Browser>;
  limits: (binding: BrowserWorker) => Promise<LimitsResponse>;
  now: () => number;
  sessions: (binding: BrowserWorker) => Promise<ActiveSession[]>;
  wait: (milliseconds: number) => Promise<void>;
};

export async function acquireReusableBrowser(
  binding: BrowserWorker,
  api: BrowserSessionApi,
  waitBudgetMs = browserWaitBudgetMs,
): Promise<Browser> {
  const deadline = api.now() + waitBudgetMs;
  let lastError: unknown;

  while (api.now() < deadline) {
    try {
      const activeSessions = await api.sessions(binding);
      for (const session of activeSessions) {
        if (session.connectionId) continue;
        try {
          return await api.connect(binding, session.sessionId);
        } catch (error) {
          lastError = error;
        }
      }

      const currentLimits = await api.limits(binding);
      if (currentLimits.allowedBrowserAcquisitions > 0) {
        try {
          const acquired = await api.acquire(binding, { keep_alive: browserKeepAliveMs });
          return await api.connect(binding, acquired.sessionId);
        } catch (error) {
          lastError = error;
        }
      }
    } catch (error) {
      lastError = error;
    }

    const remaining = deadline - api.now();
    if (remaining <= 0) break;
    await api.wait(Math.min(browserPollIntervalMs, remaining));
  }

  throw new Error(
    `No Cloudflare browser session became available within ${Math.ceil(waitBudgetMs / 1000)} seconds. Retry the review; the draft revision is unchanged.`,
    { cause: lastError },
  );
}
