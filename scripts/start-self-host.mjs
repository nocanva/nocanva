import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const approvalMode = process.env.NOCANVA_APPROVAL_MODE === "human_required" ? "human_required" : "agent_allowed";
const authMode = process.env.NOCANVA_AUTH_MODE === "sites_private" ? "sites_private" : "disabled";
const args = [
  wrangler,
  "dev",
  "--config", "dist/server/wrangler.json",
  "--ip", "0.0.0.0",
  "--port", String(process.env.PORT ?? 3000),
  "--persist-to", ".wrangler/state",
  "--var", `NOCANVA_APPROVAL_MODE:${approvalMode}`,
  "--var", `NOCANVA_AUTH_MODE:${authMode}`,
  "--var", `NOCANVA_WORKSPACE_ID:${process.env.NOCANVA_WORKSPACE_ID ?? "default"}`,
];
if (process.env.NOCANVA_APP_TOKEN) args.push("--var", `NOCANVA_APP_TOKEN:${process.env.NOCANVA_APP_TOKEN}`);
const child = spawn(process.execPath, args, { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
