import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { renderWithLocalPlaywright } from "./node-renderer";
import { buildServer } from "./server";

serveStdio(() => buildServer(undefined, {
  workspaceId: process.env.NOCANVA_WORKSPACE_ID,
  actor: process.env.NOCANVA_ACTOR_ID ?? "agent:mcp",
  serviceToken: process.env.NOCANVA_APP_TOKEN,
  render: renderWithLocalPlaywright,
}), { onerror: (error) => console.error(error.message) });
