import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const environmentFile = ".env.self-host";
if (!existsSync(environmentFile)) {
  const mcpToken = `ncv_${randomBytes(32).toString("hex")}`;
  const appToken = `ncv_app_${randomBytes(32).toString("hex")}`;
  writeFileSync(environmentFile, `NOCANVA_MCP_TOKEN=${mcpToken}\nNOCANVA_APP_TOKEN=${appToken}\nNOCANVA_AUTH_MODE=disabled\nNOCANVA_WORKSPACE_ID=default\n`, { mode: 0o600 });
  console.log(`Created ${environmentFile} with independent MCP and application service tokens.`);
} else if (!/^NOCANVA_APP_TOKEN=/m.test(readFileSync(environmentFile, "utf8"))) {
  appendFileSync(environmentFile, `NOCANVA_APP_TOKEN=ncv_app_${randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
  console.log(`Added an application service token to ${environmentFile}.`);
}

const docker = spawnSync("docker", ["compose", "--env-file", environmentFile, "up", "--build", "-d"], { stdio: "inherit" });
if (docker.error) throw docker.error;
if (docker.status !== 0) process.exit(docker.status ?? 1);

console.log("NoCanva is starting at http://localhost:3000");
console.log("Remote MCP is starting at http://localhost:3100/mcp");
console.log(`Your bearer token is stored in ${environmentFile}. Run npm run self-host:token to display it.`);
