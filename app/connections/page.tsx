import { checkMediaHealth, getActivationSummary, listManagedMcpTokens } from "@/lib/server/media-repository";
import { requireNoCanvaViewer } from "@/lib/server/request-auth";
import { AppShell } from "../workspace-shell";
import { TokenManager } from "./token-manager";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const principal = await requireNoCanvaViewer("/connections");
  const [activation, tokens] = await Promise.all([getActivationSummary(principal.workspaceId), listManagedMcpTokens(principal.workspaceId)]);
  let dependencies: { database: "ok"; objectStorage: "ok" } | null = null;
  try {
    dependencies = await checkMediaHealth();
  } catch {
    dependencies = null;
  }

  return <AppShell>
    <section className="collection-page connection-page page-frame">
      <div className="collection-heading">
        <p className="kicker">Agent connections</p>
        <h1>Connect once. Create from anywhere.</h1>
        <p>Interactive clients connect with Google. CI and headless agents can use a revocable workspace token.</p>
      </div>
      <div className="connection-status-grid">
        <article className="connection-status-card"><span>Application</span><strong className={dependencies ? "healthy" : "unhealthy"}>{dependencies ? "Healthy" : "Unavailable"}</strong><small>UI and API process</small></article>
        <article className="connection-status-card"><span>Database</span><strong className={dependencies ? "healthy" : "unhealthy"}>{dependencies?.database ?? "Unknown"}</strong><small>Durable workspace records</small></article>
        <article className="connection-status-card"><span>Object storage</span><strong className={dependencies ? "healthy" : "unhealthy"}>{dependencies?.objectStorage ?? "Unknown"}</strong><small>Immutable PNG assets</small></article>
      </div>
      <section className="activation-panel">
        <div className="collection-heading compact"><p className="kicker">First-run activation</p><h2>From connection to approved media.</h2><p>This checklist is computed from durable workspace records and events.</p></div>
        <ol className="activation-list">
          <li className={activation.agentActivity ? "done" : "current"}><span>01</span><div><strong>Connect an agent</strong><small>{activation.agentActivity ? "Agent activity recorded" : "Run one setup command below"}</small></div></li>
          <li className={activation.brandCount > 0 && activation.templateCount > 0 ? "done" : "current"}><span>02</span><div><strong>Approve a brand system</strong><small>{activation.brandCount} brand{activation.brandCount === 1 ? "" : "s"} · {activation.templateCount} template{activation.templateCount === 1 ? "" : "s"}</small></div></li>
          <li className={activation.draftsCreated > 0 ? "done" : "current"}><span>03</span><div><strong>Create and open a draft</strong><small>{activation.draftsCreated} created · {activation.draftsOpened} opened in the workspace</small></div></li>
          <li className={activation.rendersCompleted > 0 ? "done" : "current"}><span>04</span><div><strong>Approve and render</strong><small>{activation.rendersCompleted} immutable render{activation.rendersCompleted === 1 ? "" : "s"}</small></div></li>
        </ol>
        <div className="activation-metrics">
          <div><span>Time to first render</span><strong>{formatDuration(activation.timeToFirstRenderMs)}</strong></div>
          <div><span>Drafts opened</span><strong>{activation.draftsOpened}/{activation.draftsCreated}</strong></div>
          <div><span>Render completion</span><strong>{activation.rendersCompleted}</strong></div>
        </div>
      </section>
      <div className="connection-grid">
        <article className="connection-panel">
          <p className="kicker">Local development</p><h2>STDIO MCP</h2>
          <p>One command configures Codex or Claude Code. The MCP process talks to the local application at port 3000.</p>
          <pre>npm run connect -- codex</pre>
          <pre>npm run connect -- claude</pre>
        </article>
        <article className="connection-panel">
          <p className="kicker">Recommended</p><h2>Connect with Google</h2>
          <p>Add the hosted MCP, then sign in. Your browser binds the client to this personal workspace.</p>
          <pre>codex mcp add nocanva --url https://nocanva-mcp.sidsaini1196.workers.dev/mcp</pre>
          <pre>codex mcp login nocanva</pre>
          <p className="connection-note">Agents may draft, review, and revise. Final approval remains human-only.</p>
        </article>
      </div>
      <TokenManager initialTokens={tokens} />
    </section>
  </AppShell>;
}

function formatDuration(value: number | null) {
  if (value == null) return "Not yet";
  if (value < 60_000) return `${Math.max(1, Math.round(value / 1000))} sec`;
  if (value < 3_600_000) return `${Math.round(value / 60_000)} min`;
  return `${Math.round(value / 3_600_000)} hr`;
}
