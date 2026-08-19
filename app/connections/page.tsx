import { checkMediaHealth, getActivationSummary, listManagedMcpTokens } from "@/lib/server/media-repository";
import { requireNoCanvaViewer } from "@/lib/server/request-auth";
import { WorkspaceHeader } from "../workspace-header";
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

  return <main className="studio-shell">
    <WorkspaceHeader active="connections" />
    <section className="collection-page connection-page">
      <div className="collection-heading">
        <p className="kicker">Agent connections</p>
        <h1>Connect once. Create from anywhere.</h1>
        <p>NoCanva exposes the same tool contract over local stdio and authenticated Streamable HTTP.</p>
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
      <TokenManager initialTokens={tokens} />
      <div className="connection-grid">
        <article className="connection-panel">
          <p className="kicker">Local development</p><h2>STDIO MCP</h2>
          <p>One command configures Codex or Claude Code. The MCP process talks to the local application at port 3000.</p>
          <pre>npm run connect -- codex</pre>
          <pre>npm run connect -- claude</pre>
        </article>
        <article className="connection-panel">
          <p className="kicker">Remote and self-hosted</p><h2>Streamable HTTP</h2>
          <p>Export a workspace bearer token, then connect. Shared configuration references the environment variable rather than committing the secret.</p>
          <pre>NOCANVA_MCP_TOKEN=... npm run connect -- codex --remote</pre>
          <pre>NOCANVA_MCP_TOKEN=... npm run connect -- claude --remote</pre>
          <p className="connection-note">Check the sidecar at <code>/healthz</code> and authenticated configuration at <code>/diagnostics</code>.</p>
        </article>
      </div>
    </section>
  </main>;
}

function formatDuration(value: number | null) {
  if (value == null) return "Not yet";
  if (value < 60_000) return `${Math.max(1, Math.round(value / 1000))} sec`;
  if (value < 3_600_000) return `${Math.round(value / 60_000)} min`;
  return `${Math.round(value / 3_600_000)} hr`;
}
