import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const client = args.find((arg) => arg === "codex" || arg === "claude");
const remote = args.includes("--remote");
const urlFlag = args.indexOf("--url");
const url = urlFlag >= 0 ? args[urlFlag + 1] : remote ? "https://nocanva-mcp.sidsaini1196.workers.dev/mcp" : "http://localhost:3000";

if (!client) {
  console.error("Usage: npm run connect -- <codex|claude> [--remote] [--url URL]");
  process.exit(1);
}
if (!url || !URL.canParse(url)) {
  console.error("A valid URL must follow --url.");
  process.exit(1);
}
if (remote && !process.env.NOCANVA_MCP_TOKEN) {
  console.error("Set NOCANVA_MCP_TOKEN in your shell before connecting to a remote workspace.");
  process.exit(1);
}

function run(command, commandArgs, allowFailure = false) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (!allowFailure && result.status !== 0) process.exit(result.status ?? 1);
}

if (client === "codex") {
  run("codex", ["mcp", "remove", "nocanva"], true);
  run("codex", remote
    ? ["mcp", "add", "nocanva", "--url", url, "--bearer-token-env-var", "NOCANVA_MCP_TOKEN"]
    : ["mcp", "add", "nocanva", "--env", `NOCANVA_BASE_URL=${url}`, "--", "npm", "--prefix", root, "run", "mcp:dev"]);
} else {
  run("claude", ["mcp", "remove", "--scope", "user", "nocanva"], true);
  if (remote) {
    const config = JSON.stringify({ type: "http", url, headers: { Authorization: "Bearer ${NOCANVA_MCP_TOKEN}" } });
    run("claude", ["mcp", "add-json", "--scope", "user", "nocanva", config]);
  } else {
    run("claude", ["mcp", "add", "--scope", "user", "nocanva", "-e", `NOCANVA_BASE_URL=${url}`, "--", "npm", "--prefix", root, "run", "mcp:dev"]);
  }
}

console.log(`NoCanva is connected to ${client} via ${remote ? "authenticated remote HTTP" : "local stdio"}.`);
console.log(remote ? "Keep NOCANVA_MCP_TOKEN available when starting the agent." : "Keep the NoCanva web app running at the configured URL.");
