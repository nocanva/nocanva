import { checkMediaHealth } from "@/lib/server/media-repository";
import { WorkspaceHeader } from "../workspace-header";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
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
      <div className="connection-grid">
        <article className="connection-panel">
          <p className="kicker">Local development</p><h2>STDIO MCP</h2>
          <p>The MCP process talks to the local application at port 3000. This remains the fastest development setup.</p>
          <pre>codex mcp add nocanva --env NOCANVA_BASE_URL=http://localhost:3000 -- npm run mcp:dev</pre>
        </article>
        <article className="connection-panel">
          <p className="kicker">Remote and self-hosted</p><h2>Streamable HTTP</h2>
          <p>Use a workspace bearer token. The token stays in your agent environment and is never stored in this page.</p>
          <pre>codex mcp add nocanva --url https://YOUR_HOST/mcp --bearer-token-env-var NOCANVA_MCP_TOKEN</pre>
          <p className="connection-note">Check the sidecar at <code>/healthz</code> and authenticated configuration at <code>/diagnostics</code>.</p>
        </article>
      </div>
    </section>
  </main>;
}
